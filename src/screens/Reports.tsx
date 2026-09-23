import { useState, useMemo } from 'react';
import { useApp } from '../AppContext';
import { formatCurrency, formatDate } from '../store';
import {
  TrendingUp, TrendingDown, Users, Package,
  Clock, DollarSign, AlertTriangle,
  Calendar, Truck, Wallet
} from 'lucide-react';

type ReportType = 'shipments' | 'managers' | 'periods' | 'stagnant' | 'cashflow';

export function Reports() {
  const { sales } = useApp();
  const [report, setReport] = useState<ReportType>('shipments');
  const [period, setPeriod] = useState<'all' | 'month' | 'quarter' | 'year'>('all');

  const filteredSales = useMemo(() => {
    if (period === 'all') return sales;
    const now = new Date();
    return sales.filter(s => {
      const d = new Date(s.createdAt);
      const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      if (period === 'month') return diffDays <= 30;
      if (period === 'quarter') return diffDays <= 90;
      if (period === 'year') return diffDays <= 365;
      return true;
    });
  }, [sales, period]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">
          Отчёты
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Аналитика и финансовые показатели
        </p>
      </div>

      {/* Report tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { v: 'shipments', label: 'Поставки', icon: Truck },
          { v: 'managers', label: 'Менеджеры', icon: Users },
          { v: 'periods', label: 'Периоды', icon: Calendar },
          { v: 'stagnant', label: 'Залежи', icon: Clock },
          { v: 'cashflow', label: 'Деньги', icon: Wallet }
        ].map(r => {
          const Icon = r.icon;
          return (
            <button
              key={r.v}
              onClick={() => setReport(r.v as ReportType)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition ${
                report === r.v
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{r.label}</span>
            </button>
          );
        })}
      </div>

      {/* Period filter */}
      <div className="flex gap-2">
        {[
          { v: 'all', label: 'Всё время' },
          { v: 'year', label: 'Год' },
          { v: 'quarter', label: 'Квартал' },
          { v: 'month', label: 'Месяц' }
        ].map(p => (
          <button
            key={p.v}
            onClick={() => setPeriod(p.v as any)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              period === p.v
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {report === 'shipments' && <ShipmentsReport />}
      {report === 'managers' && <ManagersReport sales={filteredSales} />}
      {report === 'periods' && <PeriodsReport sales={filteredSales} />}
      {report === 'stagnant' && <StagnantReport />}
      {report === 'cashflow' && <CashflowReport sales={filteredSales} />}
    </div>
  );
}

function ShipmentsReport() {
  const { shipments, inventory } = useApp();

  const data = shipments.map(s => {
    const items = inventory.filter(i => i.shipmentId === s.id);
    const sold = items.filter(i => i.status === 'sold');
    const revenue = sold.reduce((sum, i) => sum + i.retailPrice, 0);
    const cost = items.reduce((sum, i) => sum + i.costPriceBYN, 0);
    const profit = sold.reduce((sum, i) => sum + (i.retailPrice - i.costPriceBYN), 0);
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const sellThrough = items.length > 0 ? (sold.length / items.length) * 100 : 0;
    return { shipment: s, items, sold, revenue, cost, profit, margin, sellThrough };
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-500 dark:text-stone-400">{data.length} поставок</p>
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-amber-50 dark:bg-amber-950/30 text-stone-700 dark:text-stone-300">
              <tr>
                <th className="text-left p-2 font-semibold">Партия</th>
                <th className="text-left p-2 font-semibold">Дата</th>
                <th className="text-right p-2 font-semibold">Единиц</th>
                <th className="text-right p-2 font-semibold">Продано</th>
                <th className="text-right p-2 font-semibold">Выручка</th>
                <th className="text-right p-2 font-semibold">Прибыль</th>
                <th className="text-right p-2 font-semibold">Маржа</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {data.map(d => (
                <tr key={d.shipment.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/30">
                  <td className="p-2 font-mono font-bold text-amber-700 dark:text-amber-400">{d.shipment.batchCode}</td>
                  <td className="p-2 text-stone-500">{formatDate(d.shipment.date)}</td>
                  <td className="p-2 text-right">{d.items.length}</td>
                  <td className="p-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span>{d.sold.length}</span>
                      <span className="text-[10px] text-stone-400">({d.sellThrough.toFixed(0)}%)</span>
                    </div>
                  </td>
                  <td className="p-2 text-right font-medium">{formatCurrency(d.revenue)}</td>
                  <td className="p-2 text-right font-medium text-emerald-600">{formatCurrency(d.profit)}</td>
                  <td className={`p-2 text-right font-bold ${
                    d.margin > 40 ? 'text-emerald-600' :
                    d.margin > 20 ? 'text-amber-600' : 'text-rose-600'
                  }`}>
                    {d.revenue > 0 ? `${d.margin.toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ManagersReport({ sales }: { sales: any[] }) {
  const stats: { [key: string]: any } = {};
  sales.forEach(s => {
    if (!stats[s.managerId]) {
      stats[s.managerId] = { name: s.managerName, sales: 0, revenue: 0, discount: 0, items: 0 };
    }
    stats[s.managerId].sales++;
    stats[s.managerId].revenue += s.totalAmount;
    stats[s.managerId].discount += s.totalDiscountAmount;
    stats[s.managerId].items += s.items.length;
  });

  const data = Object.values(stats).map((s: any) => ({
    ...s,
    avgCheck: s.sales > 0 ? s.revenue / s.sales : 0,
    discountPercent: s.revenue > 0 ? (s.discount / (s.revenue + s.discount)) * 100 : 0
  })).sort((a: any, b: any) => b.revenue - a.revenue);

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-500 dark:text-stone-400">{data.length} менеджеров</p>
      {data.map((m: any, idx: number) => (
        <div key={m.name} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
              idx === 0 ? 'bg-gradient-to-br from-amber-500 to-amber-700' : 'bg-stone-300 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
            }`}>
              {m.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-sm">{m.name}</p>
              <p className="text-xs text-stone-500">{m.sales} продаж · {m.items} единиц</p>
            </div>
            {idx === 0 && <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 rounded-full font-semibold">⭐ Лидер</span>}
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
              <p className="text-stone-500">Выручка</p>
              <p className="font-display font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(m.revenue)}</p>
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
              <p className="text-stone-500">Средний чек</p>
              <p className="font-display font-bold text-amber-700 dark:text-amber-400">{formatCurrency(m.avgCheck)}</p>
            </div>
            <div className="p-2 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
              <p className="text-stone-500">Скидка %</p>
              <p className="font-display font-bold">{m.discountPercent.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PeriodsReport({ sales }: { sales: any[] }) {
  const byMonth: { [key: string]: { count: number; revenue: number } } = {};
  sales.forEach(s => {
    const date = new Date(s.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = { count: 0, revenue: 0 };
    byMonth[key].count++;
    byMonth[key].revenue += s.totalAmount;
  });
  const data = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
  const max = Math.max(...data.map(d => d[1].revenue), 1);

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-500 dark:text-stone-400">Помесячная динамика</p>
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
        <div className="space-y-2">
          {data.map(([month, stat]) => (
            <div key={month} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{new Date(month + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</span>
                <span className="font-display font-bold text-amber-700 dark:text-amber-400">{formatCurrency(stat.revenue)}</span>
              </div>
              <div className="h-6 bg-stone-100 dark:bg-stone-800 rounded-lg overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-end px-2 text-[10px] font-bold text-white"
                  style={{ width: `${(stat.revenue / max) * 100}%` }}
                >
                  {stat.count} шт
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StagnantReport() {
  const { inventory } = useApp();
  const now = new Date();
  const items = inventory
    .filter(i => i.status === 'in_stock')
    .map(i => {
      const days = Math.floor((now.getTime() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      return { ...i, daysInStock: days };
    })
    .filter(i => i.daysInStock > 30)
    .sort((a, b) => b.daysInStock - a.daysInStock);

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-500 dark:text-stone-400">
        {items.length} позиций лежат &gt; 30 дней · сумма замороженных средств: {formatCurrency(items.reduce((s, i) => s + i.costPriceBYN, 0))}
      </p>
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="p-8 text-center bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl text-emerald-700 dark:text-emerald-300">
            🎉 Залежей нет!
          </div>
        ) : items.map(i => (
          <div key={i.id} className={`bg-white dark:bg-stone-900 rounded-xl border p-3 flex items-center gap-3 ${
            i.daysInStock > 180 ? 'border-rose-300 dark:border-rose-900' :
            i.daysInStock > 90 ? 'border-amber-300 dark:border-amber-900' :
            'border-stone-200 dark:border-stone-800'
          }`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              i.daysInStock > 180 ? 'bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400' :
              i.daysInStock > 90 ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' :
              'bg-stone-100 dark:bg-stone-800 text-stone-600'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{i.productName}</p>
              <p className="text-[10px] text-stone-500 font-mono">{i.id} · {i.batchCode}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display font-bold text-sm">{i.daysInStock} дн</p>
              <p className="text-[10px] text-stone-500">{formatCurrency(i.costPriceBYN)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CashflowReport({ sales }: { sales: any[] }) {
  const totalRevenue = sales.reduce((s, x) => s + x.totalAmount, 0);
  const totalDiscount = sales.reduce((s, x) => s + x.totalDiscountAmount, 0);
  const totalCost = sales.reduce((s, sale) => {
    return s + sale.items.reduce((acc: number, item: any) => acc + (item.finalPrice * 0.5), 0);
  }, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Получено" value={formatCurrency(totalRevenue)} icon={DollarSign} color="emerald" />
        <MetricCard label="Скидки" value={formatCurrency(totalDiscount)} icon={TrendingDown} color="rose" />
        <MetricCard label="Себестоимость" value={formatCurrency(totalCost)} icon={Package} color="amber" />
        <MetricCard label="Прибыль" value={formatCurrency(totalRevenue - totalCost - totalDiscount)} icon={TrendingUp} color="sky" />
      </div>
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
        <h3 className="font-display font-bold text-sm mb-3">Движение денег</h3>
        <div className="space-y-2 text-xs">
          <FlowRow label="Всего продаж" value={formatCurrency(totalRevenue)} positive />
          <FlowRow label="Из них скидки" value={`-${formatCurrency(totalDiscount)}`} negative />
          <FlowRow label="Себестоимость проданного" value={formatCurrency(totalCost)} negative />
          <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
            <FlowRow label="Чистая прибыль" value={formatCurrency(totalRevenue - totalCost - totalDiscount)} highlight />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color }: any) {
  const colors: { [k: string]: string } = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
    sky: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400'
  };
  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-3">
      <div className={`inline-flex p-1.5 rounded-lg ${colors[color]} mb-1`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <p className="text-[10px] text-stone-500">{label}</p>
      <p className="font-display font-bold text-sm mt-0.5">{value}</p>
    </div>
  );
}

function FlowRow({ label, value, positive, negative, highlight }: any) {
  return (
    <div className={`flex items-center justify-between p-2 rounded-lg ${
      highlight ? 'bg-amber-50 dark:bg-amber-950/30 font-bold' : ''
    }`}>
      <span className={highlight ? 'text-amber-900 dark:text-amber-200' : 'text-stone-600 dark:text-stone-300'}>{label}</span>
      <span className={`font-display font-bold ${
        positive ? 'text-emerald-600' : negative ? 'text-rose-600' : highlight ? 'text-amber-900 dark:text-amber-200' : ''
      }`}>
        {value}
      </span>
    </div>
  );
}

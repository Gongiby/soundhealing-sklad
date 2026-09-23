import { useApp } from '../AppContext';
import { formatCurrency, formatNumber, formatDateTime } from '../store';
import { InventoryItem } from '../types';
import { generateGuidePDF } from '../utils/generateGuidePDF';
import { generatePassportPDF } from '../utils/generatePassportPDF';
import {
  TrendingUp, Package, DollarSign, ShoppingCart,
  Truck, ArrowRight, Receipt, Boxes, FileText, Save
} from 'lucide-react';

interface Props {
  onTabChange: (tab: 'dashboard' | 'scanner' | 'inventory' | 'shipments' | 'sales' | 'reports' | 'settings') => void;
  onItemSelect: (item: InventoryItem) => void;
}

export function Dashboard({ onTabChange, onItemSelect: _onItemSelect }: Props) {
  const { inventory, sales, shipments, clients, users, suppliers, currentUser, isCloudSync, cloudStatus, cloudError, syncFromCloud } = useApp();
  const isAdmin = currentUser.role === 'admin';

  // Функция быстрого экспорта
  const handleQuickBackup = () => {
    import('../backup').then(({ createBackup, downloadBackup }) => {
      const backup = createBackup(shipments, inventory, sales, clients, users, suppliers);
      downloadBackup(backup);
    });
  };

  // Считаем метрики
  const inStock = inventory.filter(i => i.status === 'in_stock');
  const soldItems = inventory.filter(i => i.status === 'sold');
  const totalRevenue = sales.reduce((s, x) => s + x.totalAmount, 0);
  const totalProfit = isAdmin ? sales.reduce((s, sale) => {
    return s + sale.items.reduce((acc, item) => {
      const inv = inventory.find(i => i.id === item.itemId);
      if (!inv) return acc;
      const itemCost = inv.costPriceBYN;
      const itemProfit = item.finalPrice - itemCost;
      return acc + Math.max(0, itemProfit);
    }, 0);
  }, 0) : null;

  const avgCheck = sales.length > 0 ? totalRevenue / sales.length : 0;
  const totalUnitsSold = soldItems.length;

  // Последние продажи
  const recentSales = [...sales].slice(0, 5);

  // Топ продаж по категориям
  const categoryStats: { [key: string]: { count: number; revenue: number } } = {};
  soldItems.forEach(item => {
    const sale = sales.find(s => s.items.some(si => si.itemId === item.id));
    if (!sale) return;
    if (!categoryStats[item.category]) {
      categoryStats[item.category] = { count: 0, revenue: 0 };
    }
    categoryStats[item.category].count++;
    categoryStats[item.category].revenue += item.retailPrice;
  });

  const topCategories = Object.entries(categoryStats)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);

  // Маржинальность по поставкам (только админ)
  const shipmentMargins = isAdmin ? shipments.map(s => {
    const items = inventory.filter(i => i.shipmentId === s.id);
    const sold = items.filter(i => i.status === 'sold');
    const revenue = sold.reduce((sum, i) => sum + i.retailPrice, 0);
    const cost = items.reduce((sum, i) => sum + i.costPriceBYN, 0);
    const profit = sold.reduce((sum, i) => sum + (i.retailPrice - i.costPriceBYN), 0);
    return {
      shipment: s,
      total: items.length,
      sold: sold.length,
      revenue,
      cost,
      profit,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0
    };
  }) : [];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">
          Добро пожаловать, {currentUser.name.split(' ')[0]}! 👋
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Статус облачной синхронизации */}
      <button
        onClick={() => syncFromCloud()}
        className="w-full bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-3 hover:border-amber-300 transition flex items-center justify-between gap-2"
        title="Нажмите для синхронизации с облаком"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            !isCloudSync ? 'bg-stone-400' :
            cloudStatus === 'syncing' ? 'bg-amber-500 animate-pulse' :
            cloudStatus === 'synced' ? 'bg-emerald-500' :
            'bg-rose-500'
          }`} />
          <div className="flex flex-col min-w-0 text-left">
            <span className="text-xs text-stone-700 dark:text-stone-300 truncate">
              {!isCloudSync ? '📴 Локальный режим (без облака)' :
               cloudStatus === 'syncing' ? '🔄 Синхронизация с облаком...' :
               cloudStatus === 'synced' ? '☁️ Синхронизировано с облаком Supabase' :
               '❌ Ошибка синхронизации'}
            </span>
            {cloudError && (
              <span className="text-[10px] text-rose-600 dark:text-rose-400 truncate">
                {cloudError}
              </span>
            )}
            {!navigator.onLine && isCloudSync && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400">
                ⚠️ Нет интернета — изменения копятся в очереди
              </span>
            )}
          </div>
        </div>
        <span className="text-[10px] text-stone-500 shrink-0">↻ обновить</span>
      </button>

      {/* Быстрые продажи — топ-хиты */}
      {(() => {
        // Считаем продажи за последние 7 дней
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekSales = sales.filter(s => new Date(s.createdAt) >= weekAgo);

        // Группируем по товарам
        const productSales: { [key: string]: { name: string; quantity: number; revenue: number; batchCode?: string } } = {};
        weekSales.forEach(sale => {
          sale.items.forEach(item => {
            const key = item.productName;
            if (!productSales[key]) {
              productSales[key] = { name: item.productName, quantity: 0, revenue: 0, batchCode: item.batchCode };
            }
            productSales[key].quantity += item.quantity;
            productSales[key].revenue += item.finalPrice;
          });
        });

        const topProducts = Object.values(productSales)
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5);

        if (topProducts.length === 0) return null;

        return (
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold text-sm flex items-center gap-2">
                🔥 Хиты недели
              </h3>
              <span className="text-[10px] text-stone-500">
                топ-5 по продажам
              </span>
            </div>
            <div className="space-y-1">
              {topProducts.map((p, i) => (
                <div
                  key={p.name}
                  className="flex items-center gap-3 p-2 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-lg transition cursor-pointer"
                  onClick={() => onTabChange('sales')}
                  title="Перейти к продажам"
                >
                  <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                    i === 0 ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400' :
                    i === 1 ? 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300' :
                    i === 2 ? 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400' :
                    'bg-stone-100 dark:bg-stone-800 text-stone-500'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">{p.name}</p>
                    <p className="text-[10px] text-stone-500">{p.quantity} продано</p>
                  </div>
                  <span className="font-display font-bold text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
                    {formatCurrency(p.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Статистика за сегодня */}
      {(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todaySales = sales.filter(s => new Date(s.createdAt) >= today);
        const todayRevenue = todaySales
          .filter(s => !s.notes?.includes('[ВОЗВРАТ'))
          .reduce((s, x) => s + x.totalAmount, 0);
        const todayReturns = todaySales.filter(s => s.notes?.includes('[ВОЗВРАТ]')).length;
        const todayCount = todaySales.length - todayReturns;

        return (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-3">
              <p className="text-[10px] text-stone-500 uppercase font-semibold">📅 Сегодня</p>
              <p className="font-display font-bold text-lg text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(todayRevenue)}
              </p>
              <p className="text-[10px] text-stone-500">{todayCount} продаж</p>
            </div>
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-3">
              <p className="text-[10px] text-stone-500 uppercase font-semibold">📊 За месяц</p>
              <p className="font-display font-bold text-lg text-stone-900 dark:text-stone-100 mt-1">
                {sales.length}
              </p>
              <p className="text-[10px] text-stone-500">чеков</p>
            </div>
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-3">
              <p className="text-[10px] text-stone-500 uppercase font-semibold">↩️ Возвраты</p>
              <p className="font-display font-bold text-lg text-rose-600 dark:text-rose-400 mt-1">
                {sales.filter(s => s.notes?.includes('[ВОЗВРАТ]')).length}
              </p>
              <p className="text-[10px] text-stone-500">за всё время</p>
            </div>
          </div>
        );
      })()}

      {/* Быстрый бэкап базы */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
              <Save className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold text-sm">📦 Быстрый бэкап базы</p>
              <p className="text-[11px] text-stone-500">
                Скачать всю базу в JSON-файл ({shipments.length} поставок · {inventory.length} товаров · {sales.length} продаж)
              </p>
            </div>
          </div>
          <button
            onClick={handleQuickBackup}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            Скачать
          </button>
        </div>
      </div>

      {/* Документация — видна сразу на главной */}
      <div className="bg-gradient-to-r from-amber-50 to-stone-50 dark:from-amber-950/30 dark:to-stone-900 rounded-2xl border-2 border-amber-300 dark:border-amber-800 p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl bg-amber-600 text-white shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-sm">📄 Документация системы</p>
            <p className="text-[11px] text-stone-600 dark:text-stone-400">Скачать в PDF — бесплатно и в один клик</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => generateGuidePDF()}
            className="flex items-center justify-between gap-2 px-3 py-2.5 bg-white dark:bg-stone-900 hover:bg-amber-50 dark:hover:bg-stone-800 border border-amber-200 dark:border-stone-700 rounded-xl transition text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-xs truncate">Руководство пользователя</p>
                <p className="text-[10px] text-stone-500">9 страниц · как пользоваться</p>
              </div>
            </div>
            <span className="text-amber-600 text-lg shrink-0">↓</span>
          </button>

          <button
            onClick={() => generatePassportPDF()}
            className="flex items-center justify-between gap-2 px-3 py-2.5 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl transition text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-stone-200 dark:bg-stone-800 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-stone-700 dark:text-stone-300" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-xs truncate">Технический паспорт</p>
                <p className="text-[10px] text-stone-500">~20 стр. · для разработчиков</p>
              </div>
            </div>
            <span className="text-stone-600 text-lg shrink-0">↓</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          label="В наличии"
          value={formatNumber(inStock.length)}
          sub={`из ${formatNumber(inventory.length)} единиц`}
          icon={Package}
          color="amber"
        />
        <KPICard
          label="Выручка"
          value={formatCurrency(totalRevenue)}
          sub={`${sales.length} продаж`}
          icon={DollarSign}
          color="emerald"
        />
        {isAdmin && (
          <KPICard
            label="Прибыль"
            value={formatCurrency(totalProfit!)}
            sub={`маржа ${((totalProfit! / totalRevenue) * 100).toFixed(1)}%`}
            icon={TrendingUp}
            color="sky"
          />
        )}
        <KPICard
          label="Средний чек"
          value={formatCurrency(avgCheck)}
          sub={`за ${formatNumber(totalUnitsSold)} шт`}
          icon={ShoppingCart}
          color="violet"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => onTabChange('scanner')}
          className="p-4 bg-gradient-to-br from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white rounded-2xl text-left transition group"
        >
          <Scan className="w-6 h-6 mb-2" />
          <p className="font-display font-bold text-sm">Сканировать QR</p>
          <p className="text-[11px] text-amber-100">Быстрая продажа</p>
        </button>
        <button
          onClick={() => onTabChange('inventory')}
          className="p-4 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-2xl text-left transition"
        >
          <Boxes className="w-6 h-6 mb-2 text-stone-700 dark:text-stone-300" />
          <p className="font-display font-bold text-sm text-stone-900 dark:text-stone-100">Склад</p>
          <p className="text-[11px] text-stone-500">{inStock.length} в наличии</p>
        </button>
        {isAdmin && (
          <button
            onClick={() => onTabChange('shipments')}
            className="p-4 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-2xl text-left transition"
          >
            <Truck className="w-6 h-6 mb-2 text-stone-700 dark:text-stone-300" />
            <p className="font-display font-bold text-sm text-stone-900 dark:text-stone-100">Поставки</p>
            <p className="text-[11px] text-stone-500">{shipments.length} партий</p>
          </button>
        )}
        <button
          onClick={() => onTabChange('sales')}
          className="p-4 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-2xl text-left transition"
        >
          <Receipt className="w-6 h-6 mb-2 text-stone-700 dark:text-stone-300" />
          <p className="font-display font-bold text-sm text-stone-900 dark:text-stone-100">Продажи</p>
          <p className="text-[11px] text-stone-500">{sales.length} чеков</p>
        </button>
      </div>

      {/* Recent sales */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <h2 className="font-display font-bold text-base text-stone-900 dark:text-stone-100">Последние продажи</h2>
          <button
            onClick={() => onTabChange('sales')}
            className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            Все <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {recentSales.length === 0 ? (
            <div className="p-8 text-center text-sm text-stone-500">
              Продаж пока нет. Сделайте первую через сканер!
            </div>
          ) : recentSales.map(sale => (
            <div key={sale.id} className="p-3 sm:p-4 hover:bg-stone-50 dark:hover:bg-stone-800/30 transition">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-sm text-stone-900 dark:text-stone-100">
                      {sale.number}
                    </span>
                    <span className="text-[10px] text-stone-500">
                      {formatDateTime(sale.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5 truncate">
                    {sale.clientName} · {sale.managerName}
                  </p>
                  <p className="text-[11px] text-stone-500 truncate">
                    {sale.items.map(i => i.productName).join(', ')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(sale.totalAmount)}
                  </p>
                  {sale.totalDiscountAmount > 0 && (
                    <p className="text-[10px] text-amber-600">-{formatCurrency(sale.totalDiscountAmount)}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top categories */}
      {topCategories.length > 0 && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
          <h2 className="font-display font-bold text-base text-stone-900 dark:text-stone-100 mb-3">
            Топ категории
          </h2>
          <div className="space-y-2">
            {topCategories.map(([cat, stat]) => (
              <div key={cat} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">{cat}</span>
                    <span className="text-xs text-stone-500">{stat.count} шт · {formatCurrency(stat.revenue)}</span>
                  </div>
                  <div className="h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-600"
                      style={{ width: `${(stat.revenue / topCategories[0][1].revenue) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shipment margins (admin only) */}
      {isAdmin && shipmentMargins.length > 0 && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
          <h2 className="font-display font-bold text-base text-stone-900 dark:text-stone-100 mb-3">
            Маржинальность поставок
          </h2>
          <div className="space-y-2">
            {shipmentMargins.map(m => (
              <div key={m.shipment.id} className="p-3 bg-stone-50 dark:bg-stone-800/30 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-amber-700 dark:text-amber-400">
                      {m.shipment.batchCode}
                    </span>
                    <span className="text-xs text-stone-500">
                      {m.sold} из {m.total} продано
                    </span>
                  </div>
                  <span className={`text-sm font-display font-bold ${
                    m.margin > 40 ? 'text-emerald-600' :
                    m.margin > 20 ? 'text-amber-600' : 'text-rose-600'
                  }`}>
                    {m.margin.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span>Прибыль: <strong className="text-emerald-600">{formatCurrency(m.profit)}</strong></span>
                  <span>Затраты: {formatCurrency(m.cost)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({ label, value, sub, icon: Icon, color }: any) {
  const colors: { [k: string]: string } = {
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
    sky: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400'
  };

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
      <div className={`inline-flex p-2 rounded-xl ${colors[color]} mb-2`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xs text-stone-500 dark:text-stone-400">{label}</p>
      <p className="font-display text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 mt-0.5 truncate">
        {value}
      </p>
      <p className="text-[10px] text-stone-400 mt-0.5 truncate">{sub}</p>
    </div>
  );
}

function Scan({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 0 1 2-2h2m0 0V1m4 2h2a2 2 0 0 1 2 2v2m0 0h2m-2 0v2M3 17v2a2 2 0 0 0 2 2h2m0 0v2m4-2h2a2 2 0 0 0 2-2v-2m0 0h2m-2 0v-2" />
    </svg>
  );
}

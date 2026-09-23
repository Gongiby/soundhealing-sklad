import { useState, useMemo } from 'react';
import { useApp } from '../AppContext';
import { generateDailyReport, formatXReportForPrint, generateXReportPDF } from '../reports/dailyReport';
import { formatCurrency } from '../store';
import { playSound } from '../sound';
import {
  Calculator, Download, FileText, ChevronLeft, ChevronRight,
  CreditCard, Users, Package
} from 'lucide-react';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Наличные',
  card: 'Карта',
  transfer: 'Перевод',
  sbp: 'СБП',
  installment: 'Рассрочка'
};

export function CashRegister() {
  const { sales } = useApp();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);

  const report = useMemo(() => {
    return generateDailyReport(sales, selectedDate);
  }, [sales, selectedDate]);

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const setToday = () => setSelectedDate(new Date());

  const handleDownloadPDF = async () => {
    setLoading(true);
    try {
      const blob = await generateXReportPDF(report);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `x-report-${report.date}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      playSound.notification();
    } catch (e) {
      alert('Ошибка генерации PDF');
    }
    setLoading(false);
  };

  const handlePrintText = () => {
    const text = formatXReportForPrint(report);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (w) {
      w.document.write(`<pre style="font-family: monospace; font-size: 14px; white-space: pre;">${text}</pre>`);
    }
    playSound.click();
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Calculator className="w-7 h-7 text-amber-600" />
          Касса
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          X-отчёт и Z-отчёт за выбранный день
        </p>
      </div>

      {/* Переключатель даты */}
      <div className="flex items-center justify-between bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-3">
        <button
          onClick={() => navigateDate(-1)}
          className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center flex-1">
          <p className="text-lg font-display font-bold">
            {selectedDate.toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              weekday: 'long'
            })}
          </p>
          {!isToday && (
            <button
              onClick={setToday}
              className="text-[10px] text-amber-600 hover:text-amber-700 font-semibold"
            >
              ← вернуться к сегодня
            </button>
          )}
        </div>
        <button
          onClick={() => navigateDate(1)}
          disabled={isToday}
          className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Главная статистика */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-950/30 dark:to-emerald-900/20 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-900">
          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-semibold">Выручка</p>
          <p className="font-display font-bold text-xl text-emerald-900 dark:text-emerald-300 mt-1">
            {formatCurrency(report.netRevenue)}
          </p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-0.5">
            {report.totalSales} продаж
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-950/30 dark:to-amber-900/20 rounded-2xl p-4 border border-amber-200 dark:border-amber-900">
          <p className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-semibold">Скидки</p>
          <p className="font-display font-bold text-xl text-amber-900 dark:text-amber-300 mt-1">
            -{formatCurrency(report.totalDiscount)}
          </p>
          <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-0.5">
            клиентам
          </p>
        </div>

        <div className="bg-gradient-to-br from-sky-100 to-sky-50 dark:from-sky-950/30 dark:to-sky-900/20 rounded-2xl p-4 border border-sky-200 dark:border-sky-900">
          <p className="text-[10px] text-sky-700 dark:text-sky-400 uppercase font-semibold">Позиций</p>
          <p className="font-display font-bold text-xl text-sky-900 dark:text-sky-300 mt-1">
            {report.totalItems}
          </p>
          <p className="text-[10px] text-sky-600 dark:text-sky-500 mt-0.5">
            продано шт
          </p>
        </div>

        <div className={`bg-gradient-to-br ${report.totalReturns > 0 ? 'from-rose-100 to-rose-50 dark:from-rose-950/30 dark:to-rose-900/20 border-rose-200 dark:border-rose-900' : 'from-stone-100 to-stone-50 dark:from-stone-800/50 dark:to-stone-900/20 border-stone-200 dark:border-stone-800'} rounded-2xl p-4 border`}>
          <p className={`text-[10px] uppercase font-semibold ${report.totalReturns > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-stone-600 dark:text-stone-400'}`}>
            Возвратов
          </p>
          <p className={`font-display font-bold text-xl mt-1 ${report.totalReturns > 0 ? 'text-rose-900 dark:text-rose-300' : 'text-stone-700 dark:text-stone-400'}`}>
            {report.totalReturns}
          </p>
        </div>
      </div>

      {/* По способам оплаты */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
        <h3 className="font-display font-bold text-sm flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4" />
          Способы оплаты
        </h3>
        {Object.keys(report.byPayment).length === 0 ? (
          <p className="text-xs text-stone-500 text-center py-3">Продаж не было</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(report.byPayment).map(([method, data]) => (
              <div key={method} className="flex items-center justify-between p-2 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-700 dark:text-stone-300">{PAYMENT_LABELS[method] || method}</span>
                  <span className="text-[10px] text-stone-500">({data.count})</span>
                </div>
                <span className="font-display font-bold text-sm">{formatCurrency(data.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* По менеджерам */}
      {Object.keys(report.byManager).length > 0 && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
          <h3 className="font-display font-bold text-sm flex items-center gap-2 mb-3">
            <Users className="w-4 h-4" />
            По менеджерам
          </h3>
          <div className="space-y-2">
            {Object.entries(report.byManager)
              .sort((a, b) => b[1].revenue - a[1].revenue)
              .map(([name, data]) => (
                <div key={name} className="flex items-center justify-between p-2 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
                  <span className="text-xs text-stone-700 dark:text-stone-300 truncate">{name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-stone-500">{data.count} шт</span>
                    <span className="font-display font-bold text-sm">{formatCurrency(data.revenue)}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Топ товаров */}
      {report.topProducts.length > 0 && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
          <h3 className="font-display font-bold text-sm flex items-center gap-2 mb-3">
            <Package className="w-4 h-4" />
            Топ-товаров дня
          </h3>
          <div className="space-y-1">
            {report.topProducts.slice(0, 7).map((p, i) => (
              <div key={p.name} className="flex items-center gap-2 p-2 hover:bg-stone-50 dark:hover:bg-stone-800/30 rounded-lg">
                <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 text-xs truncate">{p.name}</span>
                <span className="text-[10px] text-stone-500">×{p.quantity}</span>
                <span className="font-display font-bold text-xs shrink-0">{formatCurrency(p.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Кнопки действий */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          onClick={handleDownloadPDF}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition"
        >
          <Download className="w-4 h-4" />
          {loading ? 'Генерирую...' : 'Скачать X-отчёт (PDF)'}
        </button>
        <button
          onClick={handlePrintText}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 rounded-xl text-sm font-semibold transition"
        >
          <FileText className="w-4 h-4" />
          Текст для термопринтера
        </button>
      </div>

      {/* Сравнение с другими днями */}
      <div className="bg-sky-50 dark:bg-sky-950/30 rounded-2xl p-4 border border-sky-200 dark:border-sky-900">
        <p className="text-xs text-sky-900 dark:text-sky-200">
          💡 <strong>Совет:</strong> Z-отчёт (закрытие смены) делается в конце рабочего дня после снятия кассы.
          Используйте для сверки наличных и передачи смены.
        </p>
      </div>
    </div>
  );
}

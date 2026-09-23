import { InventoryItem } from '../types';
import { formatCurrency, formatDate } from '../store';
import { X, Package, Calendar, Tag, Hash, TrendingUp, Printer, Clock, Download } from 'lucide-react';
import { generateSingleLabelPDF } from '../labels';

interface Props {
  item: InventoryItem;
  onClose: () => void;
  isAdmin: boolean;
  onReserve?: () => void;
}

export function ProductDetailModal({ item, onClose, isAdmin, onReserve }: Props) {
  const margin = isAdmin
    ? ((item.retailPrice - item.costPriceBYN) / item.retailPrice) * 100
    : null;
  const profit = isAdmin ? item.retailPrice - item.costPriceBYN : null;

  const handlePrintLabel = async () => {
    const baseUrl = window.location.origin;
    await generateSingleLabelPDF(item, baseUrl, `label-${item.id}.pdf`);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-5 sm:p-6 border-b border-stone-200 dark:border-stone-800">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>

          <div className="flex items-start gap-3 pr-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-950/50 dark:to-amber-900/50 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6 text-amber-700 dark:text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-display font-bold text-stone-900 dark:text-stone-100 leading-tight">
                {item.shortName || item.productName}
              </h2>
              {item.shortName && item.shortName !== item.productName && (
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                  Полное: {item.productName}
                </p>
              )}
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{item.category}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* ID */}
          <div className="flex items-center gap-2 text-xs">
            <Hash className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-stone-500 dark:text-stone-400">ID:</span>
            <code className="font-mono text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded">
              {item.id}
            </code>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
              <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400">
                <Tag className="w-3 h-3" />
                <span>Цена продажи</span>
              </div>
              <p className="text-lg font-display font-bold text-amber-700 dark:text-amber-400 mt-1">
                {formatCurrency(item.retailPrice)}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400">
                <Package className="w-3 h-3" />
                <span>Партия</span>
              </div>
              <p className="text-lg font-display font-bold text-stone-900 dark:text-stone-100 mt-1">
                {item.batchCode}
              </p>
            </div>

            {isAdmin && (
              <>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                  <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400">
                    <span>Себестоимость</span>
                  </div>
                  <p className="text-lg font-display font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                    {formatCurrency(item.costPriceBYN)}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                  <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400">
                    <TrendingUp className="w-3 h-3" />
                    <span>Маржа</span>
                  </div>
                  <p className="text-lg font-display font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                    {margin?.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-stone-500 mt-0.5">+{formatCurrency(profit!)}</p>
                </div>
              </>
            )}
          </div>

          {/* Status & date */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-2 border-t border-stone-200 dark:border-stone-800">
              <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Поступление
              </span>
              <span className="font-medium text-stone-900 dark:text-stone-100">
                {formatDate(item.createdAt)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-stone-200 dark:border-stone-800">
              <span className="text-stone-500 dark:text-stone-400">Валюта закупки</span>
              <span className="font-medium text-stone-900 dark:text-stone-100">
                {item.purchaseCurrency}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-stone-200 dark:border-stone-800">
              <span className="text-stone-500 dark:text-stone-400">Статус</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                item.status === 'in_stock' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' :
                item.status === 'sold' ? 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400' :
                item.status === 'reserved' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' :
                'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300'
              }`}>
                {item.status === 'in_stock' ? 'В наличии' :
                 item.status === 'sold' ? 'Продан' :
                 item.status === 'reserved' ? 'Зарезервирован' : 'В пути'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 grid grid-cols-2 gap-2">
          <button
            onClick={handlePrintLabel}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold transition"
            title="PDF для Bluetooth-принтера"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>📄 PDF</span>
          </button>
          <button
            onClick={async () => {
              const m = await import('../labels');
              await m.downloadLabelJPG(item);
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-950/50 rounded-xl text-xs font-semibold transition"
            title="JPG для отправки в мессенджер"
          >
            <Download className="w-3.5 h-3.5" />
            <span>🖼 JPG</span>
          </button>
          {item.status === 'in_stock' && (
            <>
              <button
                onClick={onReserve}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-950/50 rounded-xl text-xs font-semibold transition"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>🎫 Резерв</span>
              </button>
              <button
                onClick={onClose}
                className="px-3 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl text-xs font-semibold transition"
              >
                Закрыть
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

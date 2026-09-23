import { useState } from 'react';
import { useApp } from '../AppContext';
import { InventoryItem } from '../types';
import { formatCurrency, formatDate } from '../store';
import { generateLabelsPDF } from '../labels';
import {
  Package, Search, Printer, CheckCircle
} from 'lucide-react';

interface Props {
  onItemSelect: (item: InventoryItem) => void;
}

export function Inventory({ onItemSelect }: Props) {
  const { inventory, currentUser } = useApp();
  const isAdmin = currentUser.role === 'admin';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'reserved' | 'sold' | 'in_transit'>('all');
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Фильтрация
  const filtered = inventory.filter(i => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (batchFilter !== 'all' && i.batchCode !== batchFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!i.productName.toLowerCase().includes(q) && !i.id.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Уникальные партии
  const batches = Array.from(new Set(inventory.map(i => i.batchCode))).sort().reverse();

  // Счётчики
  const counts = {
    all: inventory.length,
    in_stock: inventory.filter(i => i.status === 'in_stock').length,
    sold: inventory.filter(i => i.status === 'sold').length,
    reserved: inventory.filter(i => i.status === 'reserved').length
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(i => i.id)));
  };

  const handlePrintSelected = async () => {
    const items = inventory.filter(i => selected.has(i.id));
    if (items.length === 0) return;
    await generateLabelsPDF(items, window.location.origin, `labels-${Date.now()}.pdf`);
  };

  const handlePrintBatch = async (batchCode: string) => {
    const items = inventory.filter(i => i.batchCode === batchCode && i.status === 'in_stock');
    if (items.length === 0) return;
    await generateLabelsPDF(items, window.location.origin, `batch-${batchCode}.pdf`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">
            Склад
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            {counts.in_stock} в наличии · {counts.sold} продано
          </p>
        </div>
      </div>

      {/* Status pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { v: 'all', label: 'Все', count: counts.all },
          { v: 'in_stock', label: 'В наличии', count: counts.in_stock, color: 'emerald' },
          { v: 'sold', label: 'Проданы', count: counts.sold, color: 'stone' },
          { v: 'reserved', label: 'Резерв', count: counts.reserved, color: 'amber' }
        ].map(s => {
          const isSelected = statusFilter === s.v;
          const colors: any = {
            emerald: isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
            stone: isSelected ? 'bg-stone-700 text-white' : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
            amber: isSelected ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
          };
          return (
            <button
              key={s.v}
              onClick={() => setStatusFilter(s.v as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                isSelected ? colors[s.color as string] || 'bg-stone-700 text-white' : colors[s.color as string] || 'bg-stone-100 text-stone-700'
              }`}
            >
              {s.label} · {s.count}
            </button>
          );
        })}
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по названию или ID..."
            className="w-full pl-10 pr-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-sm"
          />
        </div>
        <select
          value={batchFilter}
          onChange={e => setBatchFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-sm"
        >
          <option value="all">Все партии</option>
          {batches.map(b => <option key={b} value={b}>Партия {b}</option>)}
        </select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="sticky top-0 z-10 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
            Выбрано: {selected.size}
          </span>
          <button
            onClick={handlePrintSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Печатать этикетки ({selected.size})
          </button>
        </div>
      )}

      {/* Batch re-print */}
      {batchFilter !== 'all' && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
              Партия {batchFilter}
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              {inventory.filter(i => i.batchCode === batchFilter && i.status === 'in_stock').length} позиций в наличии
            </p>
          </div>
          <button
            onClick={() => handlePrintBatch(batchFilter)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Печатать всю партию
          </button>
        </div>
      )}

      {/* List */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        <div className="p-3 border-b border-stone-200 dark:border-stone-800 flex items-center gap-2 text-xs text-stone-500">
          <input
            type="checkbox"
            checked={selected.size === filtered.length && filtered.length > 0}
            onChange={toggleSelectAll}
            className="rounded accent-amber-600"
          />
          <span>{filtered.length} позиций</span>
        </div>

        <div className="divide-y divide-stone-100 dark:divide-stone-800 max-h-[600px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-stone-500">
              Ничего не найдено
            </div>
          ) : filtered.map(item => {
            const margin = isAdmin
              ? ((item.retailPrice - item.costPriceBYN) / item.retailPrice) * 100
              : null;
            return (
              <div
                key={item.id}
                onClick={() => onItemSelect(item)}
                className="p-3 hover:bg-stone-50 dark:hover:bg-stone-800/30 transition cursor-pointer flex items-center gap-3"
              >
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onClick={e => e.stopPropagation()}
                  onChange={() => toggleSelect(item.id)}
                  className="rounded accent-amber-600 shrink-0"
                />

                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-stone-900 dark:text-stone-100 truncate">
                      {item.shortName || item.productName}
                    </p>
                    {item.status === 'sold' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded">
                        Продан
                      </span>
                    )}
                    {item.status === 'in_stock' && (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    )}
                  </div>
                  {item.shortName && item.shortName !== item.productName && (
                    <p className="text-[10px] text-stone-500 truncate mt-0.5">
                      {item.productName}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-500">
                    <span className="font-mono">{item.id}</span>
                    <span>·</span>
                    <span className="font-semibold text-amber-700 dark:text-amber-400">{item.batchCode}</span>
                    <span>·</span>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-display font-bold text-sm text-stone-900 dark:text-stone-100">
                    {formatCurrency(item.retailPrice)}
                  </p>
                  {isAdmin && margin !== null && (
                    <p className={`text-[10px] font-semibold ${
                      margin > 40 ? 'text-emerald-600' :
                      margin > 20 ? 'text-amber-600' : 'text-rose-600'
                    }`}>
                      {margin.toFixed(0)}% маржа
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

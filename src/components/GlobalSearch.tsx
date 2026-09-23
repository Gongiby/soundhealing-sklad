import { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../AppContext';
import { formatCurrency, formatDate } from '../store';
import {
  Search, X, Package, ShoppingBag, Users, Truck,
  ArrowRight
} from 'lucide-react';

interface SearchResult {
  type: 'product' | 'sale' | 'client' | 'shipment';
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  icon: any;
  onClick: () => void;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onSelectProduct: (id: string) => void;
}

export function GlobalSearch({ isOpen, onClose, onNavigate, onSelectProduct }: Props) {
  const { inventory, sales, clients, shipments } = useApp();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim() || query.length < 2) return [];

    const q = query.toLowerCase();
    const items: SearchResult[] = [];

    // Поиск по товарам
    inventory
      .filter(i =>
        i.productName.toLowerCase().includes(q) ||
        (i.shortName && i.shortName.toLowerCase().includes(q)) ||
        i.id.toLowerCase().includes(q) ||
        i.batchCode.toLowerCase().includes(q)
      )
      .slice(0, 8)
      .forEach(item => {
        items.push({
          type: 'product',
          id: item.id,
          title: item.shortName || item.productName,
          subtitle: `${item.category} · Партия ${item.batchCode}`,
          meta: formatCurrency(item.retailPrice),
          icon: Package,
          onClick: () => {
            onSelectProduct(item.id);
            onClose();
          }
        });
      });

    // Поиск по продажам
    sales
      .filter(s =>
        s.number.toLowerCase().includes(q) ||
        s.clientName.toLowerCase().includes(q) ||
        s.items.some(i => i.productName.toLowerCase().includes(q))
      )
      .slice(0, 5)
      .forEach(s => {
        items.push({
          type: 'sale',
          id: s.id,
          title: `Чек ${s.number} — ${s.clientName}`,
          subtitle: `${formatDate(s.createdAt)} · ${s.items.length} позиций`,
          meta: formatCurrency(s.totalAmount),
          icon: ShoppingBag,
          onClick: () => {
            onNavigate('sales');
            onClose();
          }
        });
      });

    // Поиск по клиентам
    clients
      .filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q))
      )
      .slice(0, 5)
      .forEach(c => {
        items.push({
          type: 'client',
          id: c.id,
          title: c.name,
          subtitle: `${c.phone || ''} ${c.city ? '· ' + c.city : ''}`,
          meta: `${formatCurrency(c.totalPurchases)} покупок`,
          icon: Users,
          onClick: () => {
            onNavigate('sales');
            onClose();
          }
        });
      });

    // Поиск по поставкам
    shipments
      .filter(s =>
        s.batchCode.includes(q) ||
        s.notes?.toLowerCase().includes(q)
      )
      .slice(0, 3)
      .forEach(s => {
        items.push({
          type: 'shipment',
          id: s.id,
          title: `Поставка ${s.batchCode}`,
          subtitle: `${formatDate(s.date)} · ${s.items.length} позиций`,
          meta: '',
          icon: Truck,
          onClick: () => {
            onNavigate('shipments');
            onClose();
          }
        });
      });

    return items;
  }, [query, inventory, sales, clients, shipments, onNavigate, onSelectProduct, onClose]);

  if (!isOpen) return null;

  const groupedResults = {
    product: results.filter(r => r.type === 'product'),
    sale: results.filter(r => r.type === 'sale'),
    client: results.filter(r => r.type === 'client'),
    shipment: results.filter(r => r.type === 'shipment')
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="p-3 border-b border-stone-200 dark:border-stone-800 flex items-center gap-2">
          <Search className="w-4 h-4 text-stone-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск товара, чека, клиента или поставки..."
            className="flex-1 bg-transparent text-base outline-none placeholder:text-stone-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="px-2 py-0.5 text-[10px] bg-stone-100 dark:bg-stone-800 rounded border border-stone-200 dark:border-stone-700 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query.length < 2 ? (
            <div className="p-8 text-center text-sm text-stone-500">
              <Search className="w-8 h-8 mx-auto mb-2 text-stone-300" />
              <p>Начните вводить для поиска</p>
              <p className="text-[10px] text-stone-400 mt-1">
                Минимум 2 символа
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-sm text-stone-500">
              <p>Ничего не найдено по «{query}»</p>
            </div>
          ) : (
            <div>
              {/* Подсказки по категориям */}
              {Object.entries(groupedResults).map(([type, items]) => {
                if (items.length === 0) return null;
                const titles: Record<string, string> = {
                  product: '🛍 Товары',
                  sale: '🧾 Чеки',
                  client: '👤 Клиенты',
                  shipment: '📦 Поставки'
                };
                return (
                  <div key={type}>
                    <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-stone-500 bg-stone-50 dark:bg-stone-800/50 border-b border-stone-100 dark:border-stone-800">
                      {titles[type]} · {items.length}
                    </div>
                    {items.map(item => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={`${type}-${item.id}`}
                          onClick={item.onClick}
                          className="w-full flex items-center gap-3 p-3 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition text-left border-b border-stone-100 dark:border-stone-800 last:border-b-0"
                        >
                          <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-stone-600 dark:text-stone-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.title}</p>
                            {item.subtitle && (
                              <p className="text-[11px] text-stone-500 truncate">{item.subtitle}</p>
                            )}
                          </div>
                          {item.meta && (
                            <span className="font-display font-bold text-sm text-amber-700 dark:text-amber-400 shrink-0">
                              {item.meta}
                            </span>
                          )}
                          <ArrowRight className="w-3 h-3 text-stone-400 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/30 flex items-center justify-between text-[10px] text-stone-500">
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-stone-900 rounded border border-stone-200 dark:border-stone-700 font-mono">↑↓</kbd>
            <span>выбрать</span>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-stone-900 rounded border border-stone-200 dark:border-stone-700 font-mono ml-2">↵</kbd>
            <span>открыть</span>
          </div>
          <div>{results.length} результатов</div>
        </div>
      </div>
    </div>
  );
}

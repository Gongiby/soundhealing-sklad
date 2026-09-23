import { useState, useEffect, useRef } from 'react';
import { useApp } from '../AppContext';
import { Sale } from '../types';
import { formatCurrency, formatDateTime } from '../store';
import { exportSalesToExcel, exportSalesToPDF } from '../exports';
import { exportFullHistoryToExcel } from '../excelExport';
import {
  Receipt, Download, Search, X,
  User, CheckCircle2, Plus, ScanLine, Trash2
} from 'lucide-react';

interface Props {
  onSaleSelect: (sale: Sale) => void;
}

// Локальный интерфейс для товара в черновике чека
interface DraftItem {
  itemId: string;
  productName: string;
  shortName: string;
  batchCode: string;
  unitPrice: number;
  quantity: number;
  individualDiscount: number;
}

export function Sales({ onSaleSelect: _onSaleSelect }: Props) {
  const { sales, currentUser, inventory, createSale, clients } = useApp();
  const isAdmin = currentUser.role === 'admin';
  const [search, setSearch] = useState('');
  const [managerFilter, setManagerFilter] = useState<string>('all');
  const [period, setPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selected, setSelected] = useState<Sale | null>(null);

  // === Черновик новой продажи (сканер на странице Продажи) ===
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [draftDiscount, setDraftDiscount] = useState(0);
  const [draftClient, setDraftClient] = useState<any>(null);
  const [draftPayment, setDraftPayment] = useState<'cash' | 'card' | 'transfer' | 'sbp'>('cash');
  const [showDraft, setShowDraft] = useState(false);
  const [draftFeedback, setDraftFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [draftManualInput, setDraftManualInput] = useState('');
  const [draftSearch, setDraftSearch] = useState('');
  const [draftCamera, setDraftCamera] = useState(false);
  const draftVideoRef = useRef<HTMLVideoElement>(null);
  const draftStreamRef = useRef<MediaStream | null>(null);

  const showDraftFeedback = (type: 'success' | 'error' | 'info', msg: string) => {
    setDraftFeedback({ type, message: msg });
    setTimeout(() => setDraftFeedback(null), 2500);
  };

  const addToDraft = (itemId: string) => {
    const item = inventory.find(i => i.id === itemId.trim());
    if (!item) {
      showDraftFeedback('error', `Не найден: ${itemId}`);
      return;
    }
    if (item.status === 'sold') {
      showDraftFeedback('error', 'Уже продан');
      return;
    }
    if (draftItems.find(d => d.itemId === item.id)) {
      showDraftFeedback('info', 'Уже в чеке');
      return;
    }
    setDraftItems(prev => [...prev, {
      itemId: item.id,
      productName: item.productName,
      shortName: item.shortName,
      batchCode: item.batchCode,
      unitPrice: item.retailPrice,
      quantity: 1,
      individualDiscount: 0
    }]);
    showDraftFeedback('success', `+ ${item.shortName || item.productName}`);
    if ('vibrate' in navigator) navigator.vibrate(50);
  };

  const removeFromDraft = (itemId: string) => {
    setDraftItems(prev => prev.filter(i => i.itemId !== itemId));
  };

  const updateDraftDiscount = (itemId: string, val: number) => {
    setDraftItems(prev => prev.map(i =>
      i.itemId === itemId ? { ...i, individualDiscount: Math.max(0, Math.min(100, val)) } : i
    ));
  };

  const updateDraftQuantity = (itemId: string, val: number) => {
    setDraftItems(prev => prev.map(i =>
      i.itemId === itemId ? { ...i, quantity: Math.max(1, Math.min(99, val)) } : i
    ));
  };

  const startDraftCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      draftStreamRef.current = stream;
      if (draftVideoRef.current) {
        draftVideoRef.current.srcObject = stream;
        setDraftCamera(true);
      }
    } catch {
      showDraftFeedback('error', 'Камера недоступна');
    }
  };

  const stopDraftCamera = () => {
    if (draftStreamRef.current) {
      draftStreamRef.current.getTracks().forEach(t => t.stop());
      draftStreamRef.current = null;
    }
    setDraftCamera(false);
  };

  useEffect(() => () => stopDraftCamera(), []);

  // Детектор QR для черновика
  useEffect(() => {
    if (!draftCamera) return;
    const detector: any = ('BarcodeDetector' in window) ? new (window as any).BarcodeDetector({ formats: ['qr_code'] }) : null;
    let interval: any;
    if (detector && draftVideoRef.current) {
      interval = setInterval(async () => {
        try {
          if (draftVideoRef.current && draftVideoRef.current.readyState >= 2) {
            const codes = await detector.detect(draftVideoRef.current);
            if (codes.length > 0) {
              const raw = codes[0].rawValue;
              const match = raw.match(/\/i\/([A-Z0-9\-]+)$/i) || raw.match(/\/scan\/([A-Z0-9\-]+)$/i);
              addToDraft(match ? match[1] : raw);
            }
          }
        } catch {}
      }, 800);
    }
    return () => clearInterval(interval);
  }, [draftCamera]);

  const draftSubtotal = draftItems.reduce((s, i) => s + i.unitPrice * (1 - i.individualDiscount / 100) * i.quantity, 0);
  const draftIndividualDisc = draftItems.reduce((s, i) => s + i.unitPrice * (i.individualDiscount / 100) * i.quantity, 0);
  const draftGlobalDiscAmount = draftSubtotal * (draftDiscount / 100);
  const draftTotal = draftSubtotal - draftGlobalDiscAmount;

  const handleSaveDraft = () => {
    if (draftItems.length === 0) {
      showDraftFeedback('error', 'Черновик пустой');
      return;
    }
    if (!draftClient) {
      showDraftFeedback('error', 'Выберите клиента');
      return;
    }
    const sale = createSale({
      managerId: currentUser.id,
      managerName: currentUser.name,
      clientId: draftClient.id,
      clientName: draftClient.name,
      clientPhone: draftClient.phone,
      clientTelegramId: draftClient.telegramId,
      items: draftItems.map(d => ({
        itemId: d.itemId,
        productName: d.productName,
        batchCode: d.batchCode,
        unitPrice: d.unitPrice,
        quantity: d.quantity,
        individualDiscount: d.individualDiscount,
        finalPrice: d.unitPrice * (1 - d.individualDiscount / 100) * d.quantity
      })),
      subtotal: draftItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
      totalDiscountAmount: draftIndividualDisc + draftGlobalDiscAmount,
      totalDiscountPercent: draftDiscount,
      totalAmount: draftTotal,
      paymentMethod: draftPayment,
      globalDiscount: draftDiscount
    });
    showDraftFeedback('success', `Чек ${sale.number} создан!`);
    setDraftItems([]);
    setDraftClient(null);
    setDraftDiscount(0);
    setTimeout(() => setShowDraft(false), 1500);
  };

  const inStockItems = inventory.filter(i => i.status === 'in_stock');
  const draftSearchResults = draftSearch.trim()
    ? inStockItems.filter(i =>
        i.productName.toLowerCase().includes(draftSearch.toLowerCase()) ||
        (i.shortName && i.shortName.toLowerCase().includes(draftSearch.toLowerCase())) ||
        i.id.toLowerCase().includes(draftSearch.toLowerCase())
      ).slice(0, 8)
    : [];

  const filtered = sales.filter(sale => {
    if (managerFilter !== 'all' && sale.managerId !== managerFilter) return false;
    if (period !== 'all') {
      const now = new Date();
      const saleDate = new Date(sale.createdAt);
      const diff = (now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24);
      if (period === 'today' && diff > 1) return false;
      if (period === 'week' && diff > 7) return false;
      if (period === 'month' && diff > 30) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!sale.clientName.toLowerCase().includes(q) &&
          !sale.number.toLowerCase().includes(q) &&
          !sale.items.some(i => i.productName.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = () => {
    exportSalesToExcel(filtered, `sales-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = () => {
    exportSalesToPDF(filtered, `sales-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleFullExport = async () => {
    setExporting(true);
    try {
      await exportFullHistoryToExcel(
        sales, // все продажи (нефильтрованные)
        clients,
        `sales-history-${new Date().toISOString().split('T')[0]}.xlsx`
      );
    } catch (e) {
      alert('Ошибка экспорта');
    }
    setExporting(false);
  };

  const managers = Array.from(new Set(sales.map(s => s.managerId)))
    .map(id => sales.find(s => s.managerId === id)!.managerName);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">
            Продажи
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            {filtered.length} из {sales.length} чеков
          </p>
        </div>

        <button
          onClick={() => setShowDraft(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Новая продажа</span>
          {draftItems.length > 0 && (
            <span className="ml-1 w-5 h-5 bg-white text-amber-700 text-[10px] rounded-full flex items-center justify-center font-bold">
              {draftItems.length}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { v: 'all', label: 'Все' },
            { v: 'today', label: 'Сегодня' },
            { v: 'week', label: 'Неделя' },
            { v: 'month', label: 'Месяц' }
          ].map(p => (
            <button
              key={p.v}
              onClick={() => setPeriod(p.v as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                period === p.v
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по чеку, клиенту или товару..."
              className="w-full pl-10 pr-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-sm"
            />
          </div>
          {isAdmin && (
            <select
              value={managerFilter}
              onChange={e => setManagerFilter(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-sm"
            >
              <option value="all">Все менеджеры</option>
              {managers.map(m => <option key={m} value={sales.find(s => s.managerName === m)?.managerId}>{m}</option>)}
            </select>
          )}
        </div>

        {/* Export buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold hover:bg-emerald-200 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Excel (текущие)
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold hover:bg-rose-200 transition"
          >
            <Download className="w-3.5 h-3.5" />
            PDF
          </button>
          <button
            onClick={handleFullExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 rounded-xl text-xs font-semibold hover:bg-violet-200 transition disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? 'Готовлю...' : '📊 Полный отчёт (3 листа)'}
          </button>
        </div>
      </div>

      {/* Sales list */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-stone-500">
            Нет продаж
          </div>
        ) : filtered.slice(0, 50).map(sale => (
          <button
            key={sale.id}
            onClick={() => setSelected(sale)}
            className="w-full p-3 hover:bg-stone-50 dark:hover:bg-stone-800/30 transition text-left flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm">{sale.number}</span>
                <span className="text-[10px] text-stone-500">{formatDateTime(sale.createdAt)}</span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 truncate mt-0.5">
                {sale.clientName} · {sale.managerName}
              </p>
              <p className="text-[10px] text-stone-500 truncate mt-0.5">
                {sale.items.map(i => i.productName).join(', ')}
              </p>
            </div>

            <div className="text-right shrink-0">
              <p className="font-display font-bold text-sm text-amber-700 dark:text-amber-400">
                {formatCurrency(sale.totalAmount)}
              </p>
              {sale.totalDiscountAmount > 0 && (
                <p className="text-[10px] text-rose-600">-{formatCurrency(sale.totalDiscountAmount)}</p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Detail modal */}
      {selected && <SaleDetail sale={selected} onClose={() => setSelected(null)} />}

      {/* Draft sale modal */}
      {showDraft && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-3" onClick={() => setShowDraft(false)}>
          <div
            className="w-full max-w-2xl bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 max-h-[92vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
              <div>
                <h2 className="font-display font-bold text-base">Новая продажа (черновик)</h2>
                <p className="text-xs text-stone-500">Сканируйте QR или введите ID вручную</p>
              </div>
              <button onClick={() => setShowDraft(false)} className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {draftFeedback && (
                <div className={`p-3 rounded-xl text-xs font-medium ${
                  draftFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' :
                  draftFeedback.type === 'error' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' :
                  'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300'
                }`}>
                  {draftFeedback.message}
                </div>
              )}

              {/* Camera */}
              <div className="bg-stone-900 rounded-xl overflow-hidden aspect-video relative">
                {draftCamera ? (
                  <>
                    <video ref={draftVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-[60%] h-[40%] border-2 border-amber-500 rounded-lg">
                        <div className="absolute left-0 right-0 h-0.5 bg-amber-400 scan-line" style={{ top: '50%' }} />
                      </div>
                    </div>
                    <button onClick={stopDraftCamera} className="absolute top-2 right-2 p-1.5 bg-stone-900/70 text-white rounded-full">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button onClick={startDraftCamera} className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2 hover:bg-stone-800 transition">
                    <ScanLine className="w-8 h-8 text-amber-500" />
                    <span className="text-sm font-semibold">Включить камеру</span>
                  </button>
                )}
              </div>

              {/* Manual */}
              <div>
                <label className="text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
                  Введите ID вручную
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={draftManualInput}
                    onChange={e => setDraftManualInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && draftManualInput.trim()) {
                        addToDraft(draftManualInput);
                        setDraftManualInput('');
                      }
                    }}
                    placeholder="Напр. GF-22-F-001"
                    className="flex-1 px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm font-mono"
                  />
                  <button
                    onClick={() => { if (draftManualInput.trim()) { addToDraft(draftManualInput); setDraftManualInput(''); } }}
                    className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Search */}
              <div>
                <input
                  type="text"
                  value={draftSearch}
                  onChange={e => setDraftSearch(e.target.value)}
                  placeholder="Поиск по названию..."
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm"
                />
                {draftSearchResults.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {draftSearchResults.map(item => (
                      <button
                        key={item.id}
                        onClick={() => { addToDraft(item.id); setDraftSearch(''); }}
                        className="w-full p-2 bg-stone-50 dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg text-left text-xs flex items-center justify-between"
                      >
                        <span className="truncate">{item.shortName || item.productName}</span>
                        <span className="font-bold text-amber-700 dark:text-amber-400 shrink-0 ml-2">{formatCurrency(item.retailPrice)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Items in draft */}
              {draftItems.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                  <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">В чеке ({draftItems.length}):</p>
                  {draftItems.map((it) => (
                    <div key={it.itemId} className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{it.shortName || it.productName}</p>
                          <p className="text-[10px] text-stone-500">Партия: {it.batchCode} · {formatCurrency(it.unitPrice)}/шт</p>
                        </div>
                        <button onClick={() => removeFromDraft(it.itemId)} className="p-1 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/30 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        {/* Количество */}
                        <div className="flex items-center gap-1 bg-white dark:bg-stone-900 rounded-lg p-0.5">
                          <button
                            onClick={() => updateDraftQuantity(it.itemId, it.quantity - 1)}
                            disabled={it.quantity <= 1}
                            className="w-6 h-6 rounded bg-stone-100 dark:bg-stone-800 disabled:opacity-30 flex items-center justify-center"
                          >-</button>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={it.quantity}
                            onChange={e => updateDraftQuantity(it.itemId, Number(e.target.value) || 1)}
                            className="w-9 text-center bg-transparent text-xs font-bold"
                          />
                          <button
                            onClick={() => updateDraftQuantity(it.itemId, it.quantity + 1)}
                            className="w-6 h-6 rounded bg-stone-100 dark:bg-stone-800 flex items-center justify-center"
                          >+</button>
                          <span className="text-[10px] text-stone-500 pr-1">шт</span>
                        </div>

                        {/* Скидка (input) */}
                        <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-950/30 rounded-lg p-0.5">
                          <button
                            onClick={() => updateDraftDiscount(it.itemId, it.individualDiscount - 5)}
                            disabled={it.individualDiscount === 0}
                            className="w-6 h-6 rounded bg-white dark:bg-stone-800 disabled:opacity-30 flex items-center justify-center"
                          >-</button>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={it.individualDiscount}
                            onChange={e => updateDraftDiscount(it.itemId, Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                            className="w-10 text-center bg-transparent text-xs font-bold text-amber-700 dark:text-amber-400"
                          />
                          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold pr-1">%</span>
                          <button
                            onClick={() => updateDraftDiscount(it.itemId, it.individualDiscount + 5)}
                            disabled={it.individualDiscount === 100}
                            className="w-6 h-6 rounded bg-white dark:bg-stone-800 disabled:opacity-30 flex items-center justify-center"
                          >+</button>
                        </div>

                        {/* Итого за позицию */}
                        <span className="font-display font-bold text-amber-700 dark:text-amber-400 ml-auto">
                          {formatCurrency(it.unitPrice * (1 - it.individualDiscount / 100) * it.quantity)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Client + payment + total */}
              {draftItems.length > 0 && (
                <>
                  <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
                    <label className="text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
                      👤 Клиент
                    </label>
                    {draftClient ? (
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg flex items-center justify-between">
                        <span className="text-sm font-medium">{draftClient.name}</span>
                        <button onClick={() => setDraftClient(null)} className="text-xs text-rose-600">Изменить</button>
                      </div>
                    ) : (
                      <select
                        value=""
                        onChange={e => {
                          const c = clients.find(cl => cl.id === e.target.value);
                          if (c) setDraftClient(c);
                        }}
                        className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm"
                      >
                        <option value="">— Выбрать клиента —</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
                        💳 Оплата
                      </label>
                      <select
                        value={draftPayment}
                        onChange={e => setDraftPayment(e.target.value as any)}
                        className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm"
                      >
                        <option value="cash">Наличные</option>
                        <option value="card">Карта</option>
                        <option value="transfer">Перевод</option>
                        <option value="sbp">СБП</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1 block">
                        🎁 Общая скидка (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={draftDiscount}
                        onChange={e => setDraftDiscount(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                        className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm font-bold text-amber-700 dark:text-amber-400"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-950/30 dark:to-amber-900/30 rounded-xl">
                    <p className="text-xs text-amber-700 dark:text-amber-300">Итого к оплате</p>
                    <p className="font-display text-2xl font-bold text-amber-900 dark:text-amber-200">{formatCurrency(draftTotal)}</p>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex gap-2 shrink-0">
              <button onClick={() => setShowDraft(false)} className="flex-1 px-4 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-semibold">
                Отмена
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={draftItems.length === 0 || !draftClient}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-sm font-bold"
              >
                ✓ Оформить чек
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SaleDetail({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const { refundSale, createSale, currentUser, inventory } = useApp();

  const handleRepeat = () => {
    // Проверяем что все товары из чека ещё в наличии
    const unavailable: string[] = [];
    sale.items.forEach(item => {
      const inv = inventory.find(i => i.id === item.itemId);
      if (!inv || inv.status === 'sold') {
        unavailable.push(item.productName);
      }
    });

    if (unavailable.length > 0) {
      alert(
        `Невозможно повторить чек — следующие товары недоступны:\n\n` +
        unavailable.map(n => `• ${n}`).join('\n')
      );
      return;
    }

    // Создаём новый чек
    const newSale = createSale({
      managerId: currentUser.id,
      managerName: currentUser.name,
      clientId: sale.clientId,
      clientName: sale.clientName,
      clientPhone: sale.clientPhone,
      clientTelegramId: sale.clientTelegramId,
      items: sale.items.map(i => ({
        itemId: i.itemId,
        productName: i.productName,
        batchCode: i.batchCode,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        individualDiscount: i.individualDiscount,
        finalPrice: i.finalPrice
      })),
      subtotal: sale.subtotal,
      totalDiscountAmount: sale.totalDiscountAmount,
      totalDiscountPercent: sale.totalDiscountPercent,
      totalAmount: sale.totalAmount,
      paymentMethod: sale.paymentMethod,
      globalDiscount: sale.globalDiscount,
      notes: `🔁 Повтор чека ${sale.number}`
    });

    alert(`✅ Чек ${newSale.number} создан (повтор ${sale.number})`);
    onClose();
  };

  const handleRefund = () => {
    const reason = prompt('Причина возврата:', 'Товар не подошёл');
    if (reason === null) return;
    if (!reason.trim()) {
      alert('Укажите причину возврата');
      return;
    }
    const confirmed = confirm(
      `Вернуть товар из чека ${sale.number}?\n\n` +
      `Товар будет возвращён на склад.\n` +
      `Сумма ${sale.totalAmount.toFixed(2)} BYN будет вычтена из истории покупок клиента.\n\n` +
      `Причина: ${reason}`
    );
    if (!confirmed) return;

    if (refundSale(sale.id, reason)) {
      alert('✅ Возврат оформлен. Товар снова в наличии.');
      onClose();
    } else {
      alert('❌ Не удалось оформить возврат');
    }
  };

  const isRefunded = sale.notes?.includes('[ВОЗВРАТ');

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-stone-900 p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-base">Чек {sale.number}</h2>
            <p className="text-xs text-stone-500">{formatDateTime(sale.createdAt)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-stone-500">Клиент:</span>
              <strong>{sale.clientName}</strong>
            </div>
            {sale.clientPhone && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-stone-500 ml-5">Тел:</span>
                <span>{sale.clientPhone}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <User className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-stone-500">Менеджер:</span>
              <strong>{sale.managerName}</strong>
            </div>
          </div>

          <div className="border-t border-stone-200 dark:border-stone-800 pt-3 space-y-2">
            <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">Позиции:</p>
            {sale.items.map((item, idx) => (
              <div key={idx} className="flex items-start justify-between text-sm p-2 bg-stone-50 dark:bg-stone-800/30 rounded-lg">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{item.productName}</p>
                  <p className="text-[10px] text-stone-500">Партия: {item.batchCode}</p>
                  {item.individualDiscount > 0 && (
                    <p className="text-[10px] text-amber-600">Скидка: -{item.individualDiscount}%</p>
                  )}
                </div>
                <span className="font-display font-bold shrink-0 ml-2">{formatCurrency(item.finalPrice)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-stone-200 dark:border-stone-800 pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">Сумма:</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.totalDiscountAmount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Скидка:</span>
                <span>-{formatCurrency(sale.totalDiscountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-stone-200 dark:border-stone-800">
              <span className="font-display font-bold">Итого:</span>
              <span className="font-display font-bold text-lg text-amber-700 dark:text-amber-400">
                {formatCurrency(sale.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-stone-500">
              <span>Оплата:</span>
              <span>{getPaymentLabel(sale.paymentMethod)}</span>
            </div>
          </div>

          {sale.sentToTelegram !== undefined && (
            <div className="flex items-center gap-2 p-2 bg-sky-50 dark:bg-sky-950/30 rounded-lg text-xs text-sky-700 dark:text-sky-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Чек отправлен в Telegram
            </div>
          )}
        </div>

        {/* Кнопки печати и возврата */}
        <div className="sticky bottom-0 bg-white dark:bg-stone-900 p-4 border-t border-stone-200 dark:border-stone-800 space-y-2">
          {isRefunded && (
            <div className="p-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <span className="font-bold">⚠️ ВОЗВРАТ ОФОРМЛЕН</span>
              <span>· товар возвращён на склад</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={async () => {
                const m = await import('../exports');
                m.exportReceiptPDF(sale, `cheque-${sale.number.replace('#', '')}.pdf`);
              }}
              className="flex items-center justify-center gap-1 px-2 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 rounded-lg text-xs font-semibold transition"
              title="Скачать PDF"
            >
              📄 PDF (45мм)
            </button>
            <button
              onClick={async () => {
                const m = await import('../exports');
                const result = await m.printReceiptViaBluetooth(sale);
                if (result.success) {
                  alert('✅ Отправлено на Bluetooth-принтер');
                } else {
                  alert(`❌ ${result.error}`);
                }
              }}
              className="flex items-center justify-center gap-1 px-2 py-2 bg-sky-100 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-950/50 rounded-lg text-xs font-semibold transition"
              title="Печать на термопринтер"
            >
              📡 Bluetooth
            </button>
            {!isRefunded && (
              <>
                <button
                  onClick={handleRepeat}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-950/50 rounded-lg text-xs font-semibold transition"
                  title="Повторить этот чек — продать тот же набор"
                >
                  🔁 Повторить
                </button>
                <button
                  onClick={handleRefund}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-950/50 rounded-lg text-xs font-semibold transition"
                  title="Оформить возврат"
                >
                  ↩️ Возврат
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getPaymentLabel(method: string): string {
  const labels: { [key: string]: string } = {
    cash: 'Наличные', card: 'Карта', transfer: 'Перевод', sbp: 'СБП', installment: 'Рассрочка'
  };
  return labels[method] || method;
}

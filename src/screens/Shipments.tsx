import { useState } from 'react';
import { useApp } from '../AppContext';
import { Shipment, Currency } from '../types';
import { formatCurrency, formatDate, generateBatchCode } from '../store';
import { generateLabelsPDF, generateSingleLabelPDF } from '../labels';
import { exportShipmentReport } from '../exports';
import {
  Truck, Plus, Printer, Download,
  ChevronDown, ChevronRight, X, Trash2, Save
} from 'lucide-react';

const CURRENCIES: Currency[] = ['BYN', 'RUB', 'USD', 'EUR', 'CNY'];
const CATEGORIES = [
  'Глюкофон', 'Чакрофон', 'Поющая чаша', 'Гонг', 'Тибетская чаша',
  'Космограмма', 'Шейкер', 'Rainstick', 'Камертон', 'Колокольчик', 'Барабан',
  'Диффузор', 'Аромапалочки', 'Малат', 'Другой инструмент'
];

export function Shipments() {
  const { shipments, inventory, suppliers, createShipment, createSupplier } = useApp();
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handlePrintBatchLabels = async (batchCode: string) => {
    const items = inventory.filter(i => i.batchCode === batchCode);
    await generateLabelsPDF(items, window.location.origin, `batch-${batchCode}.pdf`);
  };

  const handleExportBatch = (shipment: Shipment) => {
    exportShipmentReport(shipment, `shipment-${shipment.batchCode}.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">
            Поставки
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            {shipments.length} партий · управление себестоимостью
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Новая поставка</span>
          <span className="sm:hidden">+</span>
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {shipments.map(shipment => {
          const items = inventory.filter(i => i.shipmentId === shipment.id);
          const totalUnits = items.length;
          const soldUnits = items.filter(i => i.status === 'sold').length;
          const totalCost = items.reduce((s, i) => s + i.costPriceBYN, 0);
          const totalRevenue = items.filter(i => i.status === 'sold').reduce((s, i) => s + i.retailPrice, 0);
          const profit = totalRevenue - items.filter(i => i.status === 'sold').reduce((s, i) => s + i.costPriceBYN, 0);
          const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

          const isExpanded = expandedBatch === shipment.id;

          return (
            <div
              key={shipment.id}
              className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden"
            >
              <button
                onClick={() => setExpandedBatch(isExpanded ? null : shipment.id)}
                className="w-full p-4 flex items-center gap-3 hover:bg-stone-50 dark:hover:bg-stone-800/30 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-base text-amber-700 dark:text-amber-400">
                      {shipment.batchCode}
                    </span>
                    <span className="text-xs text-stone-500">
                      {formatDate(shipment.date)}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5 truncate">
                    {suppliers.find(s => s.id === shipment.supplierId)?.name || 'Поставщик'} · {totalUnits} ед · продано {soldUnits}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className={`font-display font-bold text-sm ${
                    margin > 40 ? 'text-emerald-600' :
                    margin > 20 ? 'text-amber-600' :
                    margin > 0 ? 'text-stone-600' : 'text-stone-400'
                  }`}>
                    {margin > 0 ? `+${margin.toFixed(0)}%` : '—'}
                  </p>
                  <p className="text-[10px] text-stone-500">{formatCurrency(totalRevenue)}</p>
                </div>

                {isExpanded ? <ChevronDown className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
              </button>

              {isExpanded && (
                <div className="border-t border-stone-200 dark:border-stone-800 p-4 space-y-3 bg-stone-50/50 dark:bg-stone-950/30">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-stone-500">Логистика</p>
                      <p className="font-medium">{formatCurrency(shipment.totalLogistics, shipment.logisticsCurrency)}</p>
                    </div>
                    <div>
                      <p className="text-stone-500">Таможня</p>
                      <p className="font-medium">{formatCurrency(shipment.totalCustoms, shipment.customsCurrency)}</p>
                    </div>
                    <div>
                      <p className="text-stone-500">Затраты</p>
                      <p className="font-medium text-stone-900 dark:text-stone-100">{formatCurrency(totalCost)}</p>
                    </div>
                    <div>
                      <p className="text-stone-500">Прибыль</p>
                      <p className="font-medium text-emerald-600">{formatCurrency(profit)}</p>
                    </div>
                  </div>

                  {shipment.notes && (
                    <p className="text-xs text-stone-600 dark:text-stone-300 italic p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                      {shipment.notes}
                    </p>
                  )}

                  {/* Позиции */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Позиции в поставке ({shipment.items.length}):
                    </p>
                    {shipment.items.map(item => {
                      // Все единицы этой позиции из inventory
                      const unitsOfThisItem = inventory.filter(i =>
                        i.shipmentId === shipment.id &&
                        i.productName === item.productName &&
                        i.batchCode === shipment.batchCode
                      );
                      return (
                        <div key={item.id} className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm">{item.productName}</p>
                              {item.shortName && item.shortName !== item.productName && (
                                <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                                  На этикетке: {item.shortName}
                                </p>
                              )}
                              <p className="text-[10px] text-stone-500 mt-0.5">
                                {item.category} · {item.quantity} шт · {item.purchasePricePerUnit} {item.purchaseCurrency} · розница {item.retailPrice} BYN
                              </p>
                            </div>
                            <span className="font-mono font-bold text-amber-700 dark:text-amber-400 text-sm shrink-0">
                              ×{item.quantity}
                            </span>
                          </div>

                          {/* Кнопки печати для этой позиции */}
                          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                            <button
                              onClick={() => generateLabelsPDF(unitsOfThisItem, window.location.origin, `${item.shortName || item.productName}.pdf`)}
                              disabled={unitsOfThisItem.length === 0}
                              className="flex-1 min-w-[110px] flex items-center justify-center gap-1 px-2 py-1.5 bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-950/50 rounded-lg text-[11px] font-semibold transition disabled:opacity-40"
                            >
                              <Printer className="w-3 h-3" />
                              Этикетки ({unitsOfThisItem.length})
                            </button>
                            {unitsOfThisItem.slice(0, 3).map((unit, idx) => (
                              <button
                                key={unit.id}
                                onClick={() => generateSingleLabelPDF(unit, window.location.origin, `${unit.id}.pdf`)}
                                title={`Напечатать этикетку: ${unit.id}`}
                                className="px-2 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 rounded-lg text-[10px] font-mono font-semibold text-stone-700 dark:text-stone-300 transition"
                              >
                                #{idx + 1}
                              </button>
                            ))}
                            {unitsOfThisItem.length > 3 && (
                              <span className="px-2 py-1.5 text-[10px] text-stone-500">
                                + ещё {unitsOfThisItem.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handlePrintBatchLabels(shipment.batchCode)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 rounded-xl text-xs font-semibold transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Все этикетки партии
                    </button>
                    <button
                      onClick={() => handleExportBatch(shipment)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 rounded-xl text-xs font-semibold transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Excel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Form */}
      {showForm && (
        <NewShipmentForm
          onClose={() => setShowForm(false)}
          onSubmit={(data) => {
            createShipment(data);
            setShowForm(false);
          }}
          suppliers={suppliers}
          onCreateSupplier={createSupplier}
        />
      )}
    </div>
  );
}

interface NewShipmentFormProps {
  onClose: () => void;
  onSubmit: (data: Omit<Shipment, 'id' | 'createdAt' | 'batchCode'>) => void;
  suppliers: any[];
  onCreateSupplier: (data: { name: string; country: string; contact: string }) => any;
}

interface FormItem {
  productName: string;     // полное название
  shortName: string;       // короткое (для этикетки)
  category: string;        // выбранная категория или "custom"
  customCategory: string;  // своё название категории
  quantity: number;
  purchaseCurrency: Currency;
  purchasePricePerUnit: number;
  retailPrice: number;
}

function NewShipmentForm({ onClose, onSubmit, suppliers, onCreateSupplier }: NewShipmentFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', country: '', contact: '' });
  const [totalLogistics, setTotalLogistics] = useState(0);
  const [totalCustoms, setTotalCustoms] = useState(0);
  const [logisticsCurrency, setLogisticsCurrency] = useState<Currency>('USD');
  const [customsCurrency, setCustomsCurrency] = useState<Currency>('USD');
  const [rates, setRates] = useState<{ [K in Currency]?: number }>({
    BYN: 1, USD: 3.48, EUR: 3.62, CNY: 0.48, RUB: 0.038
  });
  const [items, setItems] = useState<FormItem[]>([{
    productName: '', shortName: '', category: 'Глюкофон', customCategory: '',
    quantity: 1, purchaseCurrency: 'USD', purchasePricePerUnit: 0, retailPrice: 0
  }]);

  const addItem = () => {
    setItems([...items, {
      productName: '', shortName: '', category: 'Глюкофон', customCategory: '',
      quantity: 1, purchaseCurrency: 'USD', purchasePricePerUnit: 0, retailPrice: 0
    }]);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, val: any) => {
    setItems(items.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  };

  // Автогенерация короткого названия из полного (если пользователь не ввёл своё)
  const handleFullNameChange = (idx: number, value: string) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const updates: Partial<FormItem> = { productName: value };
      // Если shortName пустое или совпадает с предыдущим авто-значением — обновляем
      if (!it.shortName.trim() || it.shortName === it.productName.substring(0, 20)) {
        updates.shortName = value.length > 20 ? value.substring(0, 20) + '…' : value;
      }
      return { ...it, ...updates };
    }));
  };

  const handleSubmit = () => {
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    if (!totalQty || items.some(i => !i.productName.trim())) {
      alert('Заполните все позиции: введите полное название хотя бы одной позиции');
      return;
    }

    onSubmit({
      supplierId,
      date: new Date(date).toISOString(),
      totalLogistics,
      totalCustoms,
      logisticsCurrency,
      customsCurrency,
      exchangeRates: rates,
      items: items.map((it, idx) => {
        const finalCategory = it.category === 'custom' ? (it.customCategory || 'Другое') : it.category;
        return {
          id: `si-new-${idx}`,
          productName: it.productName,
          shortName: it.shortName.trim() || it.productName.substring(0, 20),
          category: finalCategory,
          quantity: it.quantity,
          purchaseCurrency: it.purchaseCurrency,
          purchasePricePerUnit: it.purchasePricePerUnit,
          logisticsPerUnit: totalLogistics / totalQty,
          customsPerUnit: totalCustoms / totalQty,
          retailPrice: it.retailPrice,
          createdItemIds: []
        };
      }),
      notes
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white dark:bg-stone-900 p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-700" />
            <div>
              <h2 className="font-display font-bold text-base">Новая поставка</h2>
              <p className="text-xs text-stone-500">Код: {generateBatchCode(new Date(date))}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-5">

          {/* === СЕКЦИЯ 1: Общая информация === */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-200 dark:border-stone-800">
              <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center">1</span>
              <h3 className="font-display font-bold text-sm">Общая информация</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  📅 Дата прихода
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm"
                />
                <p className="text-[10px] text-stone-500 mt-1">
                  Код партии: <span className="font-mono font-bold text-amber-700">{generateBatchCode(new Date(date))}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  🏭 Поставщик
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={supplierId}
                    onChange={e => setSupplierId(e.target.value)}
                    className="flex-1 px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm"
                  >
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.country})</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewSupplier(!showNewSupplier)}
                    className="px-3 py-2 bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-950/50 rounded-xl text-xs font-semibold transition shrink-0"
                    title="Добавить нового поставщика"
                  >
                    <Plus className="w-3.5 h-3.5 inline mr-1" />
                    Новый
                  </button>
                </div>

                {/* Мини-форма для нового поставщика */}
                {showNewSupplier && (
                  <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl space-y-2 border border-amber-200 dark:border-amber-900">
                    <p className="text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                      ✨ Новый поставщик (сразу добавится в список)
                    </p>
                    <input
                      type="text"
                      value={newSupplier.name}
                      onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })}
                      placeholder="Название (напр. Nepal Crafts Import)"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-700 rounded-lg text-sm"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={newSupplier.country}
                        onChange={e => setNewSupplier({ ...newSupplier, country: e.target.value })}
                        placeholder="Страна (Непал)"
                        className="px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-700 rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        value={newSupplier.contact}
                        onChange={e => setNewSupplier({ ...newSupplier, contact: e.target.value })}
                        placeholder="Контакт (+977..., email, wechat)"
                        className="px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-700 rounded-lg text-sm"
                      />
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!newSupplier.name.trim()) {
                            alert('Введите название поставщика');
                            return;
                          }
                          const created = onCreateSupplier({
                            name: newSupplier.name.trim(),
                            country: newSupplier.country.trim() || 'Не указана',
                            contact: newSupplier.contact.trim()
                          });
                          setSupplierId(created.id);
                          setNewSupplier({ name: '', country: '', contact: '' });
                          setShowNewSupplier(false);
                        }}
                        className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
                      >
                        ✓ Добавить
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewSupplier(false);
                          setNewSupplier({ name: '', country: '', contact: '' });
                        }}
                        className="px-3 py-1.5 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-medium"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* === СЕКЦИЯ 2: Логистика, таможня и курсы === */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-200 dark:border-stone-800">
              <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center">2</span>
              <h3 className="font-display font-bold text-sm">Затраты на партию и курсы валют</h3>
            </div>

            <div className="p-3 bg-stone-50 dark:bg-stone-800/30 rounded-xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    🚚 Общая логистика на партию
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      value={totalLogistics}
                      onChange={e => setTotalLogistics(Number(e.target.value))}
                      placeholder="0"
                      className="flex-1 px-2 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm"
                    />
                    <select
                      value={logisticsCurrency}
                      onChange={e => setLogisticsCurrency(e.target.value as Currency)}
                      className="px-2 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm font-semibold"
                    >
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    🛃 Таможня и пошлины
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      value={totalCustoms}
                      onChange={e => setTotalCustoms(Number(e.target.value))}
                      placeholder="0"
                      className="flex-1 px-2 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm"
                    />
                    <select
                      value={customsCurrency}
                      onChange={e => setCustomsCurrency(e.target.value as Currency)}
                      className="px-2 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm font-semibold"
                    >
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <details className="text-xs">
                <summary className="cursor-pointer text-amber-700 dark:text-amber-400 font-semibold">
                  ⚙️ Курсы валют к BYN (заморозятся на дату прихода)
                </summary>
                <p className="text-[10px] text-stone-500 mt-2 mb-2">
                  Эти курсы зафиксируются для этой поставки. Если завтра курс изменится — старая поставка останется с прежним курсом.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {CURRENCIES.map(c => (
                    <div key={c}>
                      <label className="text-[10px] text-stone-500 font-semibold">{c}</label>
                      <input
                        type="number"
                        step="0.001"
                        value={rates[c] || 0}
                        onChange={e => setRates({ ...rates, [c]: Number(e.target.value) })}
                        className="w-full px-2 py-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-xs"
                      />
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </section>

          {/* === СЕКЦИЯ 3: Позиции (инструменты) === */}
          <section className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                <h3 className="font-display font-bold text-sm">Инструменты в поставке ({items.length})</h3>
              </div>
              <button
                onClick={addItem}
                className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-semibold"
              >
                <Plus className="w-3 h-3" /> Добавить позицию
              </button>
            </div>

            <div className="space-y-3">
              {items.map((it, idx) => (
                <div key={idx} className="p-3 bg-amber-50/40 dark:bg-amber-950/10 rounded-xl space-y-3 border border-amber-200 dark:border-amber-900">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-display font-bold text-amber-700 dark:text-amber-400">
                      Позиция #{idx + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(idx)}
                        className="p-1 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/30 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Полное название */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      📝 Полное название (для чека, отчётов, карточки товара)
                    </label>
                    <input
                      type="text"
                      value={it.productName}
                      onChange={e => handleFullNameChange(idx, e.target.value)}
                      placeholder="Например: Глюкофон «Лотос» 22 см нота F (432 Гц)"
                      className="w-full px-2.5 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm"
                    />
                  </div>

                  {/* Короткое название */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      🏷 Короткое название (для этикетки 45мм, max 20 символов)
                    </label>
                    <input
                      type="text"
                      value={it.shortName}
                      onChange={e => updateItem(idx, 'shortName', e.target.value)}
                      placeholder="Например: Глюкофон F 22см"
                      maxLength={20}
                      className="w-full px-2.5 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm"
                    />
                    <p className="text-[10px] text-stone-500 mt-0.5">
                      {it.shortName.length}/20 символов · если не заполнить, сократится автоматически
                    </p>
                  </div>

                  {/* Категория + своя */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        🎵 Категория инструмента
                      </label>
                      <select
                        value={it.category}
                        onChange={e => updateItem(idx, 'category', e.target.value)}
                        className="w-full px-2.5 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm"
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    {it.category === 'Другой инструмент' && (
                      <div>
                        <label className="block text-[11px] font-semibold text-amber-700 dark:text-amber-400 mb-1">
                          ✏️ Своё название категории
                        </label>
                        <input
                          type="text"
                          value={it.customCategory}
                          onChange={e => updateItem(idx, 'customCategory', e.target.value)}
                          placeholder="Введите название..."
                          className="w-full px-2.5 py-2 bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-700 rounded-lg text-sm"
                        />
                      </div>
                    )}
                  </div>

                  {/* Кол-во и цены */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        🔢 Кол-во (шт)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                        className="w-full px-2.5 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        💵 Закупка за ед.
                      </label>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          step="0.01"
                          value={it.purchasePricePerUnit}
                          onChange={e => updateItem(idx, 'purchasePricePerUnit', Number(e.target.value))}
                          className="flex-1 min-w-0 px-2 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm"
                        />
                        <select
                          value={it.purchaseCurrency}
                          onChange={e => updateItem(idx, 'purchaseCurrency', e.target.value)}
                          className="px-1 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-semibold"
                        >
                          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        🏷 Цена продажи (BYN)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={it.retailPrice}
                        onChange={e => updateItem(idx, 'retailPrice', Number(e.target.value))}
                        placeholder="0.00"
                        className="w-full px-2.5 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm font-bold text-amber-700 dark:text-amber-400"
                      />
                    </div>
                  </div>

                  {/* Подсказка: что сгенерируется */}
                  <div className="pt-2 border-t border-amber-200 dark:border-amber-900 text-[10px] text-stone-600 dark:text-stone-400">
                    <span className="font-semibold">Сгенерируется {it.quantity} QR-код(ов)</span> автоматически
                    с уникальными ID · после создания можно сразу распечатать этикетки 45мм
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* === СЕКЦИЯ 4: Примечания === */}
          <section>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              💬 Примечания к поставке (необязательно)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Например: чартерный рейс, поставщик поднял цену, повреждение упаковки у 2 единиц..."
              className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm resize-none"
              rows={2}
            />
          </section>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-stone-900 p-4 border-t border-stone-200 dark:border-stone-800 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-semibold"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition"
          >
            <Save className="w-4 h-4" />
            Создать
          </button>
        </div>
      </div>
    </div>
  );
}

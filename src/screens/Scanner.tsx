import { useState, useEffect, useRef } from 'react';
import { useApp } from '../AppContext';
import { InventoryItem, Sale, Client, PaymentMethod } from '../types';
import { formatCurrency } from '../store';
import { simulateTelegramNotification } from '../telegram';
import { playSound } from '../sound';
import { saveDraft, loadDraft, clearDraft } from '../draftSale';

import {
  ScanLine, X, Plus, Minus, Trash2, User, Phone, Send,
  CheckCircle2, CreditCard, Wallet, ArrowLeftRight, Smartphone,
  Hash, MessageCircle, Search, ChevronRight
} from 'lucide-react';

interface CartItem {
  item: InventoryItem;
  quantity: number;
  individualDiscount: number;
}

interface Props {
  onItemSelect: (item: InventoryItem) => void;
}

type PaymentType = PaymentMethod;

export function Scanner({ onItemSelect: _onItemSelect }: Props) {
  const { inventory, clients, currentUser, createSale, createClient } = useApp();
  const [mode, setMode] = useState<'scan' | 'cart' | 'checkout' | 'success'>('scan');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [manualInput, setManualInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientTelegram, setNewClientTelegram] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentType>('cash');
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; message: string } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastScanRef = useRef<{ id: string; time: number } | null>(null);

  // ============= SCAN LOGIC =============

  const handleScan = (itemId: string) => {
    const cleanId = itemId.trim();

    // Проверка: есть ли товары вообще
    if (inventory.length === 0) {
      showFeedback('error', 'Склад пуст. Добавьте поставку в разделе "Поставки"');
      playSound.scanError();
      return;
    }

    // Защита от двойного сканирования (1.5 секунды)
    const now = Date.now();
    if (lastScanRef.current &&
        lastScanRef.current.id === cleanId &&
        now - lastScanRef.current.time < 1500) {
      return; // игнорируем повторное сканирование того же товара
    }
    lastScanRef.current = { id: cleanId, time: now };

    const item = inventory.find(i => i.id === cleanId);
    if (!item) {
      showFeedback('error', `QR-код не найден: ${cleanId}`);
      playSound.scanError();
      return;
    }
    if (item.status === 'sold') {
      showFeedback('error', `${item.productName} уже продан`);
      playSound.scanError();
      return;
    }
    if (item.status === 'reserved') {
      // Ищем кто зарезервировал
      const reservations = JSON.parse(localStorage.getItem('sh_reservations') || '[]');
      const reservation = reservations.find((r: any) => r.itemId === cleanId);
      const clientName = reservation?.clientName || 'клиентом';
      showFeedback('warning', `⚠️ Зарезервирован за ${clientName}. Уверены что продаёте?`);
      playSound.warning();
      // Добавляем в корзину, но с пометкой
    }
    if (cart.find(c => c.item.id === item.id)) {
      showFeedback('info', 'Уже в корзине');
      playSound.click();
      return;
    }
    setCart(prev => [...prev, { item, quantity: 1, individualDiscount: 0 }]);
    showFeedback('success', `Добавлено: ${item.shortName || item.productName}`);
    playSound.scanSuccess();
    // Вибрация если поддерживается
    if ('vibrate' in navigator) navigator.vibrate(50);
  };

  const handleManualAdd = (itemId: string) => {
    handleScan(itemId);
    setManualInput('');
  };

  const showFeedback = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 2500);
  };

  // ============= AUTOSAVE DRAFT =============

  // Восстанавливаем черновик при загрузке
  useEffect(() => {
    const draft = loadDraft();
    if (draft && draft.cart.length > 0) {
      const restored = confirm(
        `📝 У вас есть несохранённый чек от ${new Date(draft.savedAt).toLocaleString('ru-RU')}:\n\n` +
        `Клиент: ${draft.selectedClient?.name || 'не выбран'}\n` +
        `Позиций: ${draft.cart.length}\n\n` +
        `Восстановить?`
      );
      if (restored) {
        setCart(draft.cart);
        setSelectedClient(draft.selectedClient);
        setPaymentMethod(draft.paymentMethod as any);
        setGlobalDiscount(draft.globalDiscount);
        showFeedback('info', '📝 Черновик восстановлен');
      } else {
        clearDraft();
      }
    }
  }, []);

  // Авто-сохраняем при каждом изменении
  useEffect(() => {
    // Не сохраняем пустую корзину
    if (cart.length === 0 && !selectedClient && globalDiscount === 0) {
      return;
    }
    // Сохраняем только если мы НЕ в режиме success
    if (mode !== 'success') {
      saveDraft({ cart, selectedClient, paymentMethod, globalDiscount });
    }
  }, [cart, selectedClient, paymentMethod, globalDiscount, mode]);

  // ============= CAMERA =============

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (e: any) {
      showFeedback('error', 'Камера недоступна. Используйте ручной ввод.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  // Простой сканер: детектим QR через BarcodeDetector API (если поддерживается)
  useEffect(() => {
    if (!cameraActive) return;
    const detector: any = ('BarcodeDetector' in window) ? new (window as any).BarcodeDetector({ formats: ['qr_code'] }) : null;
    let interval: any;

    if (detector && videoRef.current) {
      interval = setInterval(async () => {
        try {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              const rawValue = codes[0].rawValue;
              // Извлекаем ID из URL формата https://.../i/GF-L22-F-001
              const match = rawValue.match(/\/i\/([A-Z0-9\-]+)$/i);
              const itemId = match ? match[1] : rawValue;
              handleScan(itemId);
            }
          }
        } catch {}
      }, 800);
    }

    return () => clearInterval(interval);
  }, [cameraActive]);

  // ============= CART LOGIC =============

  const updateDiscount = (idx: number, val: number) => {
    setCart(prev => prev.map((c, i) =>
      i === idx ? { ...c, individualDiscount: Math.max(0, Math.min(50, val)) } : c
    ));
  };

  const updateQuantity = (idx: number, val: number) => {
    setCart(prev => prev.map((c, i) =>
      i === idx ? { ...c, quantity: Math.max(1, Math.min(99, val)) } : c
    ));
  };

  const removeFromCart = (idx: number) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
  };

  const subtotal = cart.reduce((s, c) => s + c.item.retailPrice * (1 - c.individualDiscount / 100) * c.quantity, 0);
  const discountFromIndividual = cart.reduce((s, c) => s + c.item.retailPrice * (c.individualDiscount / 100) * c.quantity, 0);
  const globalDiscountAmount = subtotal * (globalDiscount / 100);
  const total = subtotal - globalDiscountAmount;

  // ============= CHECKOUT =============

  const handleCheckout = async () => {
    if (!selectedClient) {
      showFeedback('error', 'Выберите клиента');
      return;
    }
    if (cart.length === 0) {
      showFeedback('error', 'Корзина пуста');
      return;
    }

    const sale = createSale({
      managerId: currentUser.id,
      managerName: currentUser.name,
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      clientPhone: selectedClient.phone,
      clientTelegramId: selectedClient.telegramId,
      items: cart.map(c => ({
        itemId: c.item.id,
        productName: c.item.productName,
        batchCode: c.item.batchCode,
        unitPrice: c.item.retailPrice,
        quantity: c.quantity || 1,
        individualDiscount: c.individualDiscount,
        finalPrice: c.item.retailPrice * (1 - c.individualDiscount / 100) * (c.quantity || 1)
      })),
      subtotal: cart.reduce((s, c) => s + c.item.retailPrice, 0),
      totalDiscountAmount: discountFromIndividual + globalDiscountAmount,
      totalDiscountPercent: globalDiscount,
      totalAmount: total,
      paymentMethod,
      globalDiscount
    });

    // Отправляем уведомление в Telegram (симуляция)
    await simulateTelegramNotification(sale);

    // Запоминаем последнего клиента для повторных продаж
    try {
      localStorage.setItem('sh_last_client_id', sale.clientId);
    } catch {
      // Ignore storage errors
    }

    // Очищаем черновик — продажа завершена
    try {
      localStorage.removeItem('sh_draft_sale');
    } catch {
      // Ignore
    }

    setLastSale(sale);
    setMode('success');
    playSound.saleSuccess();
  };

  const startNewSale = () => {
    setCart([]);
    // Запоминаем последнего клиента — подставляем для удобства повторных покупок
    const lastClientId = localStorage.getItem('sh_last_client_id');
    if (lastClientId) {
      const lastClient = clients.find(c => c.id === lastClientId);
      setSelectedClient(lastClient || null);
    } else {
      setSelectedClient(null);
    }
    setGlobalDiscount(0);
    setPaymentMethod('cash');
    setMode('scan');
    setLastSale(null);
  };

  const handleAddNewClient = () => {
    if (!newClientName.trim()) return;
    const newClient = createClient({
      name: newClientName,
      phone: newClientPhone || undefined,
      telegramId: newClientTelegram.trim() || undefined
    });
    setSelectedClient(newClient);
    setNewClientName('');
    setNewClientPhone('');
    setNewClientTelegram('');
    setShowClientPicker(false);
  };

  // ============= FILTERS =============

  const inStockItems = inventory.filter(i => i.status === 'in_stock');
  const searchResults = searchQuery.trim()
    ? inStockItems.filter(i =>
        i.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.id.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 10)
    : [];

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {mode === 'success' && lastSale ? (
        <SuccessScreen sale={lastSale} onNewSale={startNewSale} />
      ) : (
        <>
          <div className="mb-4">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">
              Сканер продаж
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
              Сканируйте QR-коды инструментов для добавления в чек
            </p>
          </div>

          {/* Feedback toast */}
          {feedback && (
            <div className={`mb-3 p-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top ${
              feedback.type === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' :
              feedback.type === 'error' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' :
              feedback.type === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' :
              'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300'
            }`}>
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : null}
              {feedback.message}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-4 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
            <button
              onClick={() => setMode('scan')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                mode === 'scan' ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-sm' : 'text-stone-600 dark:text-stone-300'
              }`}
            >
              <ScanLine className="w-4 h-4 inline mr-1" />
              Сканер
            </button>
            <button
              onClick={() => setMode('cart')}
              disabled={cart.length === 0}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition relative ${
                mode === 'cart' ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-sm' :
                cart.length === 0 ? 'text-stone-400 cursor-not-allowed' : 'text-stone-600 dark:text-stone-300'
              }`}
            >
              Корзина
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-600 text-white text-[10px] rounded-full flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </button>
          </div>

          {/* SCAN MODE */}
          {mode === 'scan' && (
            <div className="space-y-4">
              {/* Camera */}
              <div className="bg-stone-900 rounded-2xl overflow-hidden aspect-square sm:aspect-video relative">
                {cameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 camera-frame pointer-events-none">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[25%] border-2 border-amber-500 rounded-xl shadow-2xl">
                        <div className="absolute left-0 right-0 h-0.5 bg-amber-400 scan-line shadow-lg shadow-amber-400/50" />
                      </div>
                    </div>
                    <button
                      onClick={stopCamera}
                      className="absolute top-3 right-3 p-2 bg-stone-900/70 text-white rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={startCamera}
                    className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 hover:bg-stone-800 transition"
                  >
                    <ScanLine className="w-12 h-12 text-amber-500" />
                    <span className="font-display font-bold">Включить камеру</span>
                    <span className="text-xs text-stone-400">для сканирования QR-кодов</span>
                  </button>
                )}
              </div>

              {/* Manual input */}
              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="w-4 h-4 text-stone-400" />
                  <h3 className="font-display font-semibold text-sm">Ручной ввод</h3>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={e => setManualInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && manualInput && handleManualAdd(manualInput)}
                    placeholder="Введите ID, например GF-22-F-001"
                    className="flex-1 px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-mono"
                  />
                  <button
                    onClick={() => manualInput && handleManualAdd(manualInput)}
                    disabled={!manualInput}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold"
                  >
                    Добавить
                  </button>
                </div>
              </div>

              {/* Search */}
              <button
                onClick={() => setShowManualSearch(!showManualSearch)}
                className="w-full bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-3 flex items-center justify-between hover:border-amber-300 transition"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-stone-400" />
                  <span className="text-sm text-stone-700 dark:text-stone-300">Поиск по каталогу</span>
                </div>
                <ChevronRight className={`w-4 h-4 text-stone-400 transition ${showManualSearch ? 'rotate-90' : ''}`} />
              </button>

              {showManualSearch && (
                <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 space-y-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Название или ID..."
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm"
                    autoFocus
                  />
                  {searchResults.length > 0 && (
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {searchResults.map(item => (
                        <button
                          key={item.id}
                          onClick={() => handleManualAdd(item.id)}
                          className="w-full p-3 bg-stone-50 dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-xl text-left transition flex items-center justify-between"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                              {item.shortName || item.productName}
                            </p>
                            {item.shortName && item.shortName !== item.productName && (
                              <p className="text-[10px] text-stone-500 truncate">{item.productName}</p>
                            )}
                            <p className="text-[10px] text-stone-500 font-mono">{item.id}</p>
                          </div>
                          <span className="text-sm font-display font-bold text-amber-700 dark:text-amber-400 shrink-0 ml-2">
                            {formatCurrency(item.retailPrice)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {cart.length > 0 && (
                <button
                  onClick={() => setMode('cart')}
                  className="w-full p-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-2xl font-display font-bold shadow-lg shadow-amber-500/30 transition flex items-center justify-between"
                >
                  <span>Перейти к оформлению</span>
                  <span>{cart.length} шт · {formatCurrency(total)}</span>
                </button>
              )}
            </div>
          )}

          {/* CART MODE */}
          {mode === 'cart' && (
            <div className="space-y-3">
              {cart.map((c, idx) => (
                <div key={c.item.id} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                      <Hash className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-stone-900 dark:text-stone-100">
                        {c.item.shortName || c.item.productName}
                      </p>
                      {c.item.shortName && c.item.shortName !== c.item.productName && (
                        <p className="text-[10px] text-stone-500 truncate">{c.item.productName}</p>
                      )}
                      <p className="text-[10px] text-stone-500 font-mono mt-0.5">{c.item.id}</p>
                      <p className="text-xs text-stone-500 mt-1">Партия: <span className="font-semibold text-amber-700">{c.item.batchCode}</span></p>
                    </div>
                    <button
                      onClick={() => removeFromCart(idx)}
                      className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/30 text-rose-600 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <div className="flex-1 min-w-[80px]">
                      <p className="text-[10px] text-stone-500">Цена за шт</p>
                      <p className="font-display font-bold text-sm text-stone-900 dark:text-stone-100">
                        {formatCurrency(c.item.retailPrice)}
                      </p>
                    </div>

                    {/* Количество */}
                    <div>
                      <p className="text-[10px] text-stone-500">Кол-во</p>
                      <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 rounded-lg p-0.5">
                        <button
                          onClick={() => updateQuantity(idx, c.quantity - 1)}
                          disabled={c.quantity <= 1}
                          className="w-6 h-6 rounded bg-white dark:bg-stone-700 disabled:opacity-30 flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={c.quantity}
                          onChange={e => updateQuantity(idx, Number(e.target.value) || 1)}
                          className="w-10 text-center bg-transparent text-xs font-bold"
                        />
                        <button
                          onClick={() => updateQuantity(idx, c.quantity + 1)}
                          className="w-6 h-6 rounded bg-white dark:bg-stone-700 flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Скидка (input) */}
                    <div>
                      <p className="text-[10px] text-stone-500">Скидка</p>
                      <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-0.5">
                        <button
                          onClick={() => updateDiscount(idx, c.individualDiscount - 5)}
                          disabled={c.individualDiscount === 0}
                          className="w-6 h-6 rounded bg-white dark:bg-stone-700 disabled:opacity-30 flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          step="1"
                          value={c.individualDiscount}
                          onChange={e => updateDiscount(idx, Math.max(0, Math.min(50, Number(e.target.value) || 0)))}
                          className="w-10 text-center bg-transparent text-xs font-bold text-amber-700 dark:text-amber-400"
                        />
                        <span className="text-xs text-amber-700 dark:text-amber-400 pr-1">%</span>
                        <button
                          onClick={() => updateDiscount(idx, c.individualDiscount + 5)}
                          disabled={c.individualDiscount === 50}
                          className="w-6 h-6 rounded bg-white dark:bg-stone-700 disabled:opacity-30 flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Итого за позицию */}
                    <div className="text-right ml-auto">
                      <p className="text-[10px] text-stone-500">Итого</p>
                      <p className="font-display font-bold text-base text-amber-700 dark:text-amber-400">
                        {formatCurrency(c.item.retailPrice * (1 - c.individualDiscount / 100) * c.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Global discount */}
              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">Общая скидка на чек</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={globalDiscount}
                      onChange={e => setGlobalDiscount(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                      className="w-14 text-center px-1 py-1 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm font-bold text-amber-700 dark:text-amber-400"
                    />
                    <span className="text-amber-700 dark:text-amber-400 font-bold">%</span>
                  </div>
                </div>
                <p className="text-[10px] text-stone-500">
                  Применяется к итогу после индивидуальных скидок
                </p>
              </div>

              {/* Totals */}
              <div className="bg-stone-50 dark:bg-stone-800/30 rounded-2xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-600 dark:text-stone-300">Сумма:</span>
                  <span className="font-medium">{formatCurrency(cart.reduce((s, c) => s + c.item.retailPrice, 0))}</span>
                </div>
                {(discountFromIndividual > 0 || globalDiscountAmount > 0) && (
                  <div className="flex justify-between text-amber-600">
                    <span>Скидка:</span>
                    <span className="font-medium">-{formatCurrency(discountFromIndividual + globalDiscountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-stone-200 dark:border-stone-700">
                  <span className="font-display font-bold text-base">Итого:</span>
                  <span className="font-display font-bold text-lg text-amber-700 dark:text-amber-400">{formatCurrency(total)}</span>
                </div>
              </div>

              <button
                onClick={() => setMode('checkout')}
                className="w-full p-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-display font-bold transition"
              >
                Оформить продажу
              </button>
            </div>
          )}

          {/* CHECKOUT MODE */}
          {mode === 'checkout' && (
            <div className="space-y-4">
              {/* Client picker */}
              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-bold text-sm flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Клиент
                  </h3>
                  {selectedClient && (
                    <button
                      onClick={() => setSelectedClient(null)}
                      className="text-xs text-rose-600 hover:text-rose-700"
                    >
                      Изменить
                    </button>
                  )}
                </div>

                {selectedClient ? (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900">
                    <p className="font-display font-bold text-sm">{selectedClient.name}</p>
                    {selectedClient.phone && (
                      <p className="text-xs text-stone-500 flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" />
                        {selectedClient.phone}
                      </p>
                    )}
                    {selectedClient.telegramId && (
                      <p className="text-xs text-sky-600 flex items-center gap-1 mt-1">
                        <MessageCircle className="w-3 h-3" />
                        Telegram подключен
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowClientPicker(true)}
                    className="w-full p-3 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-xl text-sm text-stone-500 hover:border-amber-400 hover:text-amber-600 transition"
                  >
                    + Выбрать или добавить клиента
                  </button>
                )}
              </div>

              {/* Payment */}
              <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4">
                <h3 className="font-display font-bold text-sm mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Способ оплаты
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: 'cash', label: 'Наличные', icon: Wallet },
                    { v: 'card', label: 'Карта', icon: CreditCard },
                    { v: 'transfer', label: 'Перевод', icon: ArrowLeftRight },
                    { v: 'sbp', label: 'СБП', icon: Smartphone }
                  ].map(p => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.v}
                        onClick={() => setPaymentMethod(p.v as PaymentType)}
                        className={`p-3 rounded-xl flex items-center gap-2 text-sm font-medium transition ${
                          paymentMethod === p.v
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Final summary */}
              <div className="bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-950/30 dark:to-amber-900/30 rounded-2xl p-4 border border-amber-200 dark:border-amber-900">
                <p className="text-xs text-amber-700 dark:text-amber-300 mb-1">К оплате</p>
                <p className="font-display text-3xl font-bold text-amber-900 dark:text-amber-200">
                  {formatCurrency(total)}
                </p>
              </div>

              <button
                onClick={handleCheckout}
                disabled={!selectedClient}
                className="w-full p-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-2xl font-display font-bold transition flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Подтвердить и отправить чек</span>
              </button>

              <button
                onClick={() => setMode('cart')}
                className="w-full p-3 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition"
              >
                Назад к корзине
              </button>
            </div>
          )}
        </>
      )}

      {/* Client picker modal */}
      {showClientPicker && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setShowClientPicker(false)}>
          <div
            className="w-full sm:max-w-md bg-white dark:bg-stone-900 rounded-t-2xl sm:rounded-2xl border border-stone-200 dark:border-stone-800 max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <h3 className="font-display font-bold">Выбор клиента</h3>
              <button onClick={() => setShowClientPicker(false)} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-stone-200 dark:border-stone-800 space-y-2">
              <input
                type="text"
                value={newClientName}
                onChange={e => setNewClientName(e.target.value)}
                placeholder="Новый клиент: имя"
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm"
              />
              <input
                type="tel"
                value={newClientPhone}
                onChange={e => setNewClientPhone(e.target.value)}
                placeholder="Телефон (необязательно)"
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm"
              />
              <input
                type="text"
                value={newClientTelegram}
                onChange={e => setNewClientTelegram(e.target.value)}
                placeholder="Telegram @username (для чеков в Telegram)"
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm"
              />
              <p className="text-[10px] text-stone-500 -mt-1">
                💡 Если указан Telegram — чек автоматически отправится клиенту
              </p>
              <button
                onClick={handleAddNewClient}
                disabled={!newClientName.trim()}
                className="w-full p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition"
              >
                <Plus className="w-4 h-4 inline mr-1" />
                Создать нового
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-2">
              {clients.length === 0 ? (
                <p className="p-4 text-center text-sm text-stone-500">Нет клиентов</p>
              ) : clients.map(client => (
                <button
                  key={client.id}
                  onClick={() => {
                    setSelectedClient(client);
                    setShowClientPicker(false);
                  }}
                  className="w-full p-3 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-left transition flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-sm">{client.name}</p>
                    {client.phone && (
                      <p className="text-xs text-stone-500">{client.phone}</p>
                    )}
                  </div>
                  <span className="text-xs text-amber-700 dark:text-amber-400">
                    {formatCurrency(client.totalPurchases)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SuccessScreen({ sale, onNewSale }: { sale: Sale; onNewSale: () => void }) {
  return (
    <div className="text-center py-8 max-w-md mx-auto">
      <div className="w-20 h-20 mx-auto bg-emerald-100 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mb-4 pulse-ring">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h1 className="font-display text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">
        Продажа оформлена!
      </h1>
      <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
        Чек {sale.number} отправлен в Telegram
      </p>

      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 text-left space-y-3">
        <div className="flex justify-between">
          <span className="text-sm text-stone-500">Клиент:</span>
          <span className="text-sm font-medium">{sale.clientName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-stone-500">Менеджер:</span>
          <span className="text-sm font-medium">{sale.managerName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-stone-500">Позиций:</span>
          <span className="text-sm font-medium">{sale.items.length} шт</span>
        </div>
        {sale.totalDiscountAmount > 0 && (
          <div className="flex justify-between text-amber-600">
            <span className="text-sm">Скидка:</span>
            <span className="text-sm font-medium">-{formatCurrency(sale.totalDiscountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between pt-3 border-t border-stone-200 dark:border-stone-800">
          <span className="font-display font-bold">Итого:</span>
          <span className="font-display font-bold text-lg text-amber-700 dark:text-amber-400">
            {formatCurrency(sale.totalAmount)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-6">
        <p className="text-[11px] text-stone-500 text-center font-semibold uppercase tracking-wider">
          🖨 Печать чека (лента 45мм)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={async () => {
              playSound.click();
              const m = await import('../exports');
              m.exportReceiptPDF(sale, `cheque-${sale.number.replace('#', '')}.pdf`);
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 rounded-xl font-display font-bold transition text-sm"
          >
            📄 Скачать PDF
          </button>
          <button
            onClick={async () => {
              playSound.click();
              const m = await import('../exports');
              const result = await m.printReceiptViaBluetooth(sale);
              if (result.success) {
                playSound.notification();
                alert('✅ Отправлено на Bluetooth-принтер!');
              } else {
                playSound.warning();
                alert(`❌ Не удалось: ${result.error}\n\nПроверьте:\n• Принтер включен\n• Bluetooth включен\n• Принтер сопряжён в настройках устройства`);
              }
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-3 bg-sky-100 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-950/50 rounded-xl font-display font-bold transition text-sm"
          >
            📡 Bluetooth
          </button>
        </div>
        <button
          onClick={onNewSale}
          className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-display font-bold transition text-sm"
        >
          Новая продажа →
        </button>
      </div>
    </div>
  );
}

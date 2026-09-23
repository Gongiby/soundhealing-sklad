import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Shipment, InventoryItem, Sale, Client, User, TelegramSettings, Supplier } from './types';
import { STORAGE, loadFromStorage, saveToStorage, INITIAL_USERS, INITIAL_SUPPLIERS, generateBatchCode, generateItemId } from './store';
import { generateSeedData } from './seedData';
import { saveTelegramSettings, getTelegramSettings } from './telegram';
import { getSupabaseClient } from './supabaseClient';
import {
  syncFromCloud,
  subscribeToChanges,
  uploadShipment,
  uploadInventoryItem,
  uploadSale,
  uploadClient,
  uploadSupplier
} from './syncService';
import { addToQueue, tryProcessQueue } from './syncQueue';
import { isSupabaseConfigured } from './supabaseClient';
import { notifications } from './notifications';
import { monitorLowStock } from './lowStockMonitor';

interface AppContextType {
  // Данные
  shipments: Shipment[];
  inventory: InventoryItem[];
  sales: Sale[];
  clients: Client[];
  users: User[];
  suppliers: Supplier[];
  currentUser: User;
  darkMode: boolean;
  telegram: TelegramSettings;

  // Синхронизация с облаком
  isCloudSync: boolean;
  cloudStatus: 'offline' | 'syncing' | 'synced' | 'error';
  cloudError: string | null;

  // Методы
  setCurrentUser: (user: User) => void;
  setDarkMode: (v: boolean) => void;
  saveTelegram: (settings: TelegramSettings) => void;
  syncFromCloud: () => Promise<void>;

  // Действия с поставками
  createShipment: (data: Omit<Shipment, 'id' | 'createdAt' | 'batchCode'>) => Shipment;
  createSupplier: (data: Omit<Supplier, 'id'>) => Supplier;

  // Действия с продажами
  createSale: (sale: Omit<Sale, 'id' | 'number' | 'createdAt' | 'sentToTelegram'>) => Sale;

  // Действия с клиентами
  createClient: (client: Omit<Client, 'id' | 'createdAt' | 'totalPurchases'>) => Client;

  // Возврат товара
  refundSale: (saleId: string, reason?: string) => boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  // Инициализация с seed data при первом запуске
  const [shipments, setShipments] = useState<Shipment[]>(() => {
    const stored = loadFromStorage<Shipment[] | null>(STORAGE.shipments, null);
    if (stored && stored.length > 0) return stored;
    const seed = generateSeedData();
    return seed.shipments;
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const stored = loadFromStorage<InventoryItem[] | null>(STORAGE.inventory, null);
    if (stored && stored.length > 0) return stored;
    return generateSeedData().inventory;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const stored = loadFromStorage<Sale[] | null>(STORAGE.sales, null);
    if (stored && stored.length > 0) return stored;
    return generateSeedData().sales;
  });

  const [clients, setClients] = useState<Client[]>(() => {
    const stored = loadFromStorage<Client[] | null>(STORAGE.clients, null);
    if (stored && stored.length > 0) return stored;
    return generateSeedData().clients;
  });

  const [users] = useState<User[]>(() => loadFromStorage(STORAGE.users, INITIAL_USERS));
  const [suppliers, setSuppliers] = useState<Supplier[]>(() =>
    loadFromStorage<Supplier[]>(STORAGE.suppliers, INITIAL_SUPPLIERS as unknown as Supplier[])
  );

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const stored = localStorage.getItem(STORAGE.currentUser);
    if (stored) return JSON.parse(stored);
    return INITIAL_USERS[0]; // По умолчанию — директор
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return loadFromStorage(STORAGE.darkMode, false);
  });

  const [telegram, setTelegramState] = useState<TelegramSettings>(() => getTelegramSettings());

  // Сохранение в localStorage при изменениях
  useEffect(() => { saveToStorage(STORAGE.shipments, shipments); }, [shipments]);
  useEffect(() => { saveToStorage(STORAGE.inventory, inventory); }, [inventory]);
  useEffect(() => { saveToStorage(STORAGE.sales, sales); }, [sales]);
  useEffect(() => { saveToStorage(STORAGE.clients, clients); }, [clients]);
  useEffect(() => { saveToStorage(STORAGE.users, users); }, [users]);

  // Мониторинг низких остатков (с задержкой чтобы не спамить при загрузке)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inventory.length > 0) {
        monitorLowStock(inventory, 3);
      }
    }, 3000); // проверяем через 3 секунды после загрузки
    return () => clearTimeout(timer);
  }, [inventory.length]);
  useEffect(() => { saveToStorage(STORAGE.suppliers, suppliers); }, [suppliers]);
  useEffect(() => { localStorage.setItem(STORAGE.currentUser, JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { saveToStorage(STORAGE.darkMode, darkMode); }, [darkMode]);

  // Тема
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // === Методы ===

  const createShipment = useCallback((data: Omit<Shipment, 'id' | 'createdAt' | 'batchCode'>): Shipment => {
    const id = `ship-${Date.now()}`;
    const batchCode = generateBatchCode(new Date(data.date));
    const createdAt = new Date().toISOString();

    // Создаём inventory items с автогенерацией QR ID
    const newItems: InventoryItem[] = [];
    let globalIdx = inventory.length;

    data.items.forEach(shipItem => {
      const logisticsPerUnit = data.totalLogistics / data.items.reduce((s, x) => s + x.quantity, 0);
      const customsPerUnit = data.totalCustoms / data.items.reduce((s, x) => s + x.quantity, 0);

      const itemIds: string[] = [];
      for (let i = 1; i <= shipItem.quantity; i++) {
        globalIdx++;
        const itemId = generateItemId(shipItem.category, shipItem.productName, globalIdx);
        itemIds.push(itemId);

        // Пересчёт в BYN
        const exchangeRate = data.exchangeRates[shipItem.purchaseCurrency] || 1;
        const totalCostInOriginalCurrency =
          shipItem.purchasePricePerUnit + logisticsPerUnit + customsPerUnit;
        const costBYN = totalCostInOriginalCurrency * exchangeRate;

        newItems.push({
          id: itemId,
          shipmentId: id,
          batchCode,
          productName: shipItem.productName,
          shortName: shipItem.shortName || shipItem.productName,
          category: shipItem.category,
          status: 'in_stock',
          purchaseCurrency: shipItem.purchaseCurrency,
          purchasePriceOriginal: totalCostInOriginalCurrency,
          costPriceBYN: Math.round(costBYN * 100) / 100,
          retailPrice: shipItem.retailPrice,
          createdAt
        });
      }
    });

    const shipment: Shipment = {
      ...data,
      id,
      batchCode,
      createdAt
    };

    setShipments(prev => [shipment, ...prev]);
    setInventory(prev => [...newItems, ...prev]);

    // Отправляем в облако (если настроено)
    if (isSupabaseConfigured) {
      if (navigator.onLine) {
        uploadShipment(shipment);
        // Отправляем все товары поставки
        newItems.forEach(item => uploadInventoryItem(item));
      } else {
        // Добавляем в оффлайн-очередь
        addToQueue({
          type: 'create',
          table: 'sh_shipments',
          data: {
            id: shipment.id,
            batch_code: shipment.batchCode,
            supplier_id: shipment.supplierId,
            date: shipment.date,
            total_logistics: shipment.totalLogistics,
            total_customs: shipment.totalCustoms,
            logistics_currency: shipment.logisticsCurrency,
            customs_currency: shipment.customsCurrency,
            exchange_rates: shipment.exchangeRates,
            items: shipment.items,
            notes: shipment.notes,
            created_at: shipment.createdAt
          }
        });
        newItems.forEach(item => {
          addToQueue({
            type: 'create',
            table: 'sh_inventory',
            data: {
              id: item.id,
              shipment_id: item.shipmentId,
              batch_code: item.batchCode,
              product_name: item.productName,
              short_name: item.shortName,
              category: item.category,
              status: item.status,
              purchase_currency: item.purchaseCurrency,
              purchase_price_original: item.purchasePriceOriginal,
              cost_price_byn: item.costPriceBYN,
              retail_price: item.retailPrice,
              reserved_for: item.reservedFor,
              reserved_at: item.reservedAt,
              sold_at: item.soldAt,
              sale_id: item.saleId,
              notes: item.notes,
              photo_url: item.photoUrl,
              created_at: item.createdAt
            }
          });
        });
      }
    }

    return shipment;
  }, [inventory]);

  const createSale = useCallback((saleData: Omit<Sale, 'id' | 'number' | 'createdAt' | 'sentToTelegram'>): Sale => {
    const id = `sale-${Date.now()}`;
    const number = `#${1000 + sales.length + 1}`;
    const createdAt = new Date().toISOString();

    const sale: Sale = {
      ...saleData,
      id,
      number,
      createdAt,
      sentToTelegram: false
    };

    setSales(prev => [sale, ...prev]);

    // Помечаем товары как проданные
    setInventory(prev => prev.map(item => {
      const soldItem = sale.items.find(si => si.itemId === item.id);
      if (soldItem) {
        const updatedItem = { ...item, status: 'sold' as const, soldAt: createdAt, saleId: id };
        // Отправляем обновлённый статус в облако
        if (isSupabaseConfigured && navigator.onLine) {
          uploadInventoryItem(updatedItem);
        }
        return updatedItem;
      }
      return item;
    }));

    // Обновляем сумму покупок клиента
    setClients(prev => prev.map(c => {
      if (c.id === sale.clientId) {
        const updated = { ...c, totalPurchases: c.totalPurchases + sale.totalAmount };
        if (isSupabaseConfigured && navigator.onLine) {
          uploadClient(updated);
        }
        return updated;
      }
      return c;
    }));

    // Отправляем чек в облако
    if (isSupabaseConfigured) {
      if (navigator.onLine) {
        uploadSale(sale);
      } else {
        addToQueue({
          type: 'create',
          table: 'sh_sales',
          data: {
            id: sale.id,
            number: sale.number,
            manager_id: sale.managerId,
            manager_name: sale.managerName,
            client_id: sale.clientId,
            client_name: sale.clientName,
            client_phone: sale.clientPhone,
            client_telegram_id: sale.clientTelegramId,
            items: sale.items,
            subtotal: sale.subtotal,
            total_discount_amount: sale.totalDiscountAmount,
            total_discount_percent: sale.totalDiscountPercent,
            total_amount: sale.totalAmount,
            payment_method: sale.paymentMethod,
            global_discount: sale.globalDiscount,
            notes: sale.notes,
            sent_to_telegram: sale.sentToTelegram,
            created_at: sale.createdAt
          }
        });
      }
    }

    // Web Push уведомление
    notifications.newSale({
      number: sale.number,
      amount: sale.totalAmount,
      client: sale.clientName,
      manager: sale.managerName
    });

    return sale;
  }, [sales]);

  // ============================================================
  // ВОЗВРАТ ТОВАРА
  // ============================================================

  const refundSale = useCallback((saleId: string, reason: string = 'Возврат'): boolean => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return false;

    // Возвращаем товары на склад
    setInventory(prev => prev.map(item => {
      const soldItem = sale.items.find(si => si.itemId === item.id);
      if (soldItem && item.status === 'sold' && item.saleId === saleId) {
        const updated = {
          ...item,
          status: 'in_stock' as const,
          soldAt: undefined,
          saleId: undefined
        };
        if (isSupabaseConfigured && navigator.onLine) {
          uploadInventoryItem(updated);
        }
        return updated;
      }
      return item;
    }));

    // Уменьшаем сумму покупок клиента
    setClients(prev => prev.map(c => {
      if (c.id === sale.clientId) {
        const updated = {
          ...c,
          totalPurchases: Math.max(0, c.totalPurchases - sale.totalAmount)
        };
        if (isSupabaseConfigured && navigator.onLine) {
          uploadClient(updated);
        }
        return updated;
      }
      return c;
    }));

    // Помечаем чек как возвращённый (добавляем флаг)
    setSales(prev => prev.map(s => {
      if (s.id === saleId) {
        // В реальной базе данных добавим поле refunded
        return { ...s, notes: `${s.notes ? s.notes + ' | ' : ''}[ВОЗВРАТ ${new Date().toLocaleDateString('ru-RU')}: ${reason}]` };
      }
      return s;
    }));

    // Звук и уведомление
    notifications.lowStock({
      name: `Возврат: ${sale.number}`,
      stock: 0,
      minStock: 0
    });

    return true;
  }, [sales]);

  const createClient = useCallback((clientData: Omit<Client, 'id' | 'createdAt' | 'totalPurchases'>): Client => {
    const client: Client = {
      ...clientData,
      id: `c-${Date.now()}`,
      createdAt: new Date().toISOString(),
      totalPurchases: 0
    };
    setClients(prev => [client, ...prev]);

    // Отправляем в облако (если настроено)
    if (isSupabaseConfigured) {
      if (navigator.onLine) {
        uploadClient(client);
      } else {
        addToQueue({
          type: 'create',
          table: 'sh_clients',
          data: {
            id: client.id,
            name: client.name,
            phone: client.phone,
            email: client.email,
            telegram_id: client.telegramId,
            city: client.city,
            total_purchases: client.totalPurchases,
            notes: client.notes,
            created_at: client.createdAt
          }
        });
      }
    }

    return client;
  }, []);

  const createSupplier = useCallback((data: Omit<Supplier, 'id'>): Supplier => {
    const supplier: Supplier = {
      ...data,
      id: `s-${Date.now()}`
    };
    setSuppliers(prev => [...prev, supplier]);

    // Отправляем в облако
    if (isSupabaseConfigured) {
      if (navigator.onLine) {
        uploadSupplier(supplier);
      } else {
        addToQueue({
          type: 'create',
          table: 'sh_suppliers',
          data: {
            id: supplier.id,
            name: supplier.name,
            country: supplier.country,
            contact: supplier.contact
          }
        });
      }
    }

    return supplier;
  }, []);

  const saveTelegram = useCallback((settings: TelegramSettings) => {
    saveTelegramSettings(settings);
    setTelegramState(settings);
  }, []);

  // ============================================================
  // ОБЛАЧНАЯ СИНХРОНИЗАЦИЯ (Supabase)
  // ============================================================

  const [isCloudSync, setIsCloudSync] = useState<boolean>(false);
  const [cloudStatus, setCloudStatus] = useState<'offline' | 'syncing' | 'synced' | 'error'>('offline');
  const [cloudError, setCloudError] = useState<string | null>(null);

  const handleSyncFromCloud = useCallback(async () => {
    const sb = getSupabaseClient();
    if (!sb) {
      setIsCloudSync(false);
      setCloudStatus('offline');
      return;
    }
    setIsCloudSync(true);
    setCloudStatus('syncing');
    setCloudError(null);

    const result = await syncFromCloud();
    if (result.success) {
      setCloudStatus('synced');
      if (result.shipments) setShipments(result.shipments);
      if (result.inventory) setInventory(result.inventory);
      if (result.sales) setSales(result.sales);
      if (result.clients) setClients(result.clients);
      if (result.suppliers) setSuppliers(result.suppliers);
    } else {
      setCloudStatus('error');
      setCloudError(result.error || 'Unknown error');
    }
  }, []);

  // Пробуем синхронизироваться при монтировании
  useEffect(() => {
    handleSyncFromCloud();
  }, [handleSyncFromCloud]);

  // Подписка на realtime-обновления
  useEffect(() => {
    const sb = getSupabaseClient();
    if (!sb) return;

    const unsubscribe = subscribeToChanges(() => {
      handleSyncFromCloud();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [handleSyncFromCloud]);

  // Обработка оффлайн-очереди при восстановлении сети
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Сеть восстановлена, обрабатываем очередь...');
      tryProcessQueue();
    };
    window.addEventListener('online', handleOnline);
    // Первая проверка при монтировании
    if (navigator.onLine) {
      tryProcessQueue();
    }
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return (
    <AppContext.Provider value={{
      shipments,
      inventory,
      sales,
      clients,
      users,
      suppliers,
      currentUser,
      darkMode,
      telegram,
      isCloudSync,
      cloudStatus,
      cloudError,
      setCurrentUser,
      setDarkMode,
      saveTelegram,
      syncFromCloud: handleSyncFromCloud,
      createShipment,
      createSale,
      createClient,
      createSupplier,
      refundSale
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

// Сервис синхронизации между localStorage и Supabase
// Реализует стратегию: сначала работаем локально, синхронизируем в облако асинхронно

import { getSupabaseClient } from './supabaseClient';
import {
  Shipment,
  InventoryItem,
  Sale,
  Client,
  User,
  Supplier
} from './types';
import { STORAGE, saveToStorage } from './store';

const SYNC_STATUS_KEY = 'sh_sync_status';

export type SyncStatus = 'offline' | 'syncing' | 'synced' | 'error';

export interface SyncInfo {
  status: SyncStatus;
  lastSyncAt?: string;
  errorMessage?: string;
  pendingChanges: number;
}

export function getSyncStatus(): SyncInfo {
  const stored = localStorage.getItem(SYNC_STATUS_KEY);
  if (!stored) {
    return { status: 'offline', pendingChanges: 0 };
  }
  try {
    return JSON.parse(stored);
  } catch {
    return { status: 'offline', pendingChanges: 0 };
  }
}

export function setSyncStatus(status: Partial<SyncInfo>): void {
  const current = getSyncStatus();
  localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify({ ...current, ...status }));
}

// ============================================================
// ЗАГРУЗКА ДАННЫХ ИЗ SUPABASE
// ============================================================

export async function syncFromCloud(): Promise<{
  success: boolean;
  shipments?: Shipment[];
  inventory?: InventoryItem[];
  sales?: Sale[];
  clients?: Client[];
  users?: User[];
  suppliers?: Supplier[];
  error?: string;
}> {
  const sb = getSupabaseClient();
  if (!sb) return { success: false, error: 'Supabase не настроен' };

  setSyncStatus({ status: 'syncing', errorMessage: undefined });

  try {
    const [shipmentsRes, inventoryRes, salesRes, clientsRes, usersRes, suppliersRes] = await Promise.all([
      sb.from('sh_shipments').select('*'),
      sb.from('sh_inventory').select('*'),
      sb.from('sh_sales').select('*').order('created_at', { ascending: false }),
      sb.from('sh_clients').select('*'),
      sb.from('sh_users').select('*'),
      sb.from('sh_suppliers').select('*')
    ]);

    if (shipmentsRes.error) throw shipmentsRes.error;
    if (inventoryRes.error) throw inventoryRes.error;
    if (salesRes.error) throw salesRes.error;
    if (clientsRes.error) throw clientsRes.error;
    if (usersRes.error) throw usersRes.error;
    if (suppliersRes.error) throw suppliersRes.error;

    // Преобразуем формат snake_case → camelCase для нашего приложения
    const shipments: Shipment[] = (shipmentsRes.data || []).map(s => ({
      id: s.id,
      batchCode: s.batch_code,
      supplierId: s.supplier_id,
      date: s.date,
      totalLogistics: s.total_logistics,
      totalCustoms: s.total_customs,
      logisticsCurrency: s.logistics_currency,
      customsCurrency: s.customs_currency,
      exchangeRates: s.exchange_rates || {},
      items: s.items || [],
      notes: s.notes,
      createdAt: s.created_at
    }));

    const inventory: InventoryItem[] = (inventoryRes.data || []).map(i => ({
      id: i.id,
      shipmentId: i.shipment_id,
      batchCode: i.batch_code,
      productName: i.product_name,
      shortName: i.short_name || i.product_name,
      category: i.category,
      status: i.status,
      purchaseCurrency: i.purchase_currency,
      purchasePriceOriginal: i.purchase_price_original,
      costPriceBYN: i.cost_price_byn,
      retailPrice: i.retail_price,
      reservedFor: i.reserved_for,
      reservedAt: i.reserved_at,
      soldAt: i.sold_at,
      saleId: i.sale_id,
      notes: i.notes,
      photoUrl: i.photo_url,
      createdAt: i.created_at
    }));

    const sales: Sale[] = (salesRes.data || []).map(s => ({
      id: s.id,
      number: s.number,
      managerId: s.manager_id,
      managerName: s.manager_name,
      clientId: s.client_id,
      clientName: s.client_name,
      clientPhone: s.client_phone,
      clientTelegramId: s.client_telegram_id,
      items: s.items || [],
      subtotal: s.subtotal,
      totalDiscountAmount: s.total_discount_amount,
      totalDiscountPercent: s.total_discount_percent,
      totalAmount: s.total_amount,
      paymentMethod: s.payment_method,
      globalDiscount: s.global_discount,
      notes: s.notes,
      sentToTelegram: s.sent_to_telegram,
      createdAt: s.created_at
    }));

    const clients: Client[] = (clientsRes.data || []).map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      telegramId: c.telegram_id,
      city: c.city,
      totalPurchases: c.total_purchases,
      notes: c.notes,
      createdAt: c.created_at
    }));

    const users: User[] = (usersRes.data || []).map(u => ({
      id: u.id,
      name: u.name,
      role: u.role,
      telegramId: u.telegram_id,
      avatar: u.avatar
    }));

    const suppliers: Supplier[] = (suppliersRes.data || []).map(s => ({
      id: s.id,
      name: s.name,
      country: s.country,
      contact: s.contact
    }));

    // Сохраняем в localStorage
    saveToStorage(STORAGE.shipments, shipments);
    saveToStorage(STORAGE.inventory, inventory);
    saveToStorage(STORAGE.sales, sales);
    saveToStorage(STORAGE.clients, clients);
    saveToStorage(STORAGE.users, users);
    saveToStorage(STORAGE.suppliers, suppliers);

    setSyncStatus({
      status: 'synced',
      lastSyncAt: new Date().toISOString(),
      pendingChanges: 0
    });

    return { success: true, shipments, inventory, sales, clients, users, suppliers };
  } catch (e: any) {
    setSyncStatus({
      status: 'error',
      errorMessage: e.message || 'Ошибка синхронизации'
    });
    return { success: false, error: e.message };
  }
}

// ============================================================
// ЗАГРУЗКА ДАННЫХ В SUPABASE (при изменении)
// ============================================================

export async function uploadShipment(shipment: Shipment): Promise<boolean> {
  const sb = getSupabaseClient();
  if (!sb) return false;

  try {
    const { error } = await sb.from('sh_shipments').upsert({
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
      created_at: shipment.createdAt,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('uploadShipment error:', e);
    return false;
  }
}

export async function uploadInventoryItem(item: InventoryItem): Promise<boolean> {
  const sb = getSupabaseClient();
  if (!sb) return false;

  try {
    const { error } = await sb.from('sh_inventory').upsert({
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
      created_at: item.createdAt,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('uploadInventoryItem error:', e);
    return false;
  }
}

export async function uploadSale(sale: Sale): Promise<boolean> {
  const sb = getSupabaseClient();
  if (!sb) return false;

  try {
    const { error } = await sb.from('sh_sales').upsert({
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
      created_at: sale.createdAt,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('uploadSale error:', e);
    return false;
  }
}

export async function uploadClient(client: Client): Promise<boolean> {
  const sb = getSupabaseClient();
  if (!sb) return false;

  try {
    const { error } = await sb.from('sh_clients').upsert({
      id: client.id,
      name: client.name,
      phone: client.phone,
      email: client.email,
      telegram_id: client.telegramId,
      city: client.city,
      total_purchases: client.totalPurchases,
      notes: client.notes,
      created_at: client.createdAt,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('uploadClient error:', e);
    return false;
  }
}

export async function uploadSupplier(supplier: Supplier): Promise<boolean> {
  const sb = getSupabaseClient();
  if (!sb) return false;

  try {
    const { error } = await sb.from('sh_suppliers').upsert({
      id: supplier.id,
      name: supplier.name,
      country: supplier.country,
      contact: supplier.contact,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('uploadSupplier error:', e);
    return false;
  }
}

// ============================================================
// REALTIME ПОДПИСКА
// ============================================================

export type RealtimeCallback = () => void;

export function subscribeToChanges(onChange: RealtimeCallback): (() => void) | null {
  const sb = getSupabaseClient();
  if (!sb) return null;

  const channel = sb
    .channel('db-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sh_shipments' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sh_inventory' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sh_sales' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sh_clients' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sh_suppliers' }, onChange)
    .subscribe();

  return () => {
    sb.removeChannel(channel);
  };
}

// Утилита для миграции данных из localStorage в Supabase
// Используется один раз после первой настройки Supabase

import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { STORAGE, loadFromStorage } from './store';
import {
  Shipment,
  InventoryItem,
  Sale,
  Client,
  Supplier
} from './types';

export interface MigrationResult {
  success: boolean;
  shipmentsMigrated: number;
  inventoryMigrated: number;
  salesMigrated: number;
  clientsMigrated: number;
  suppliersMigrated: number;
  errors: string[];
}

export async function migrateLocalStorageToSupabase(): Promise<MigrationResult> {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      shipmentsMigrated: 0,
      inventoryMigrated: 0,
      salesMigrated: 0,
      clientsMigrated: 0,
      suppliersMigrated: 0,
      errors: ['Supabase не настроен']
    };
  }

  const sb = getSupabaseClient();
  if (!sb) {
    return {
      success: false,
      shipmentsMigrated: 0,
      inventoryMigrated: 0,
      salesMigrated: 0,
      clientsMigrated: 0,
      suppliersMigrated: 0,
      errors: ['Клиент Supabase не инициализирован']
    };
  }

  const result: MigrationResult = {
    success: true,
    shipmentsMigrated: 0,
    inventoryMigrated: 0,
    salesMigrated: 0,
    clientsMigrated: 0,
    suppliersMigrated: 0,
    errors: []
  };

  // 1. Поставщики
  try {
    const suppliers = loadFromStorage<Supplier[]>(STORAGE.suppliers, []);
    if (suppliers.length > 0) {
      const rows = suppliers.map(s => ({
        id: s.id,
        name: s.name,
        country: s.country,
        contact: s.contact
      }));
      const { error } = await sb.from('sh_suppliers').upsert(rows);
      if (error) throw error;
      result.suppliersMigrated = suppliers.length;
    }
  } catch (e: any) {
    result.errors.push(`Suppliers: ${e.message}`);
  }

  // 2. Клиенты
  try {
    const clients = loadFromStorage<Client[]>(STORAGE.clients, []);
    if (clients.length > 0) {
      const rows = clients.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        telegram_id: c.telegramId,
        city: c.city,
        total_purchases: c.totalPurchases,
        notes: c.notes,
        created_at: c.createdAt
      }));
      const { error } = await sb.from('sh_clients').upsert(rows);
      if (error) throw error;
      result.clientsMigrated = clients.length;
    }
  } catch (e: any) {
    result.errors.push(`Clients: ${e.message}`);
  }

  // 3. Поставки
  try {
    const shipments = loadFromStorage<Shipment[]>(STORAGE.shipments, []);
    if (shipments.length > 0) {
      const rows = shipments.map(s => ({
        id: s.id,
        batch_code: s.batchCode,
        supplier_id: s.supplierId,
        date: s.date,
        total_logistics: s.totalLogistics,
        total_customs: s.totalCustoms,
        logistics_currency: s.logisticsCurrency,
        customs_currency: s.customsCurrency,
        exchange_rates: s.exchangeRates,
        items: s.items,
        notes: s.notes,
        created_at: s.createdAt
      }));
      const { error } = await sb.from('sh_shipments').upsert(rows);
      if (error) throw error;
      result.shipmentsMigrated = shipments.length;
    }
  } catch (e: any) {
    result.errors.push(`Shipments: ${e.message}`);
  }

  // 4. Склад (InventoryItem)
  try {
    const inventory = loadFromStorage<InventoryItem[]>(STORAGE.inventory, []);
    if (inventory.length > 0) {
      const rows = inventory.map(i => ({
        id: i.id,
        shipment_id: i.shipmentId,
        batch_code: i.batchCode,
        product_name: i.productName,
        short_name: i.shortName,
        category: i.category,
        status: i.status,
        purchase_currency: i.purchaseCurrency,
        purchase_price_original: i.purchasePriceOriginal,
        cost_price_byn: i.costPriceBYN,
        retail_price: i.retailPrice,
        reserved_for: i.reservedFor,
        reserved_at: i.reservedAt,
        sold_at: i.soldAt,
        sale_id: i.saleId,
        notes: i.notes,
        photo_url: i.photoUrl,
        created_at: i.createdAt
      }));
      // Загружаем порциями по 100 штук
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        const { error } = await sb.from('sh_inventory').upsert(batch);
        if (error) throw error;
      }
      result.inventoryMigrated = inventory.length;
    }
  } catch (e: any) {
    result.errors.push(`Inventory: ${e.message}`);
  }

  // 5. Продажи
  try {
    const sales = loadFromStorage<Sale[]>(STORAGE.sales, []);
    if (sales.length > 0) {
      const rows = sales.map(s => ({
        id: s.id,
        number: s.number,
        manager_id: s.managerId,
        manager_name: s.managerName,
        client_id: s.clientId,
        client_name: s.clientName,
        client_phone: s.clientPhone,
        client_telegram_id: s.clientTelegramId,
        items: s.items,
        subtotal: s.subtotal,
        total_discount_amount: s.totalDiscountAmount,
        total_discount_percent: s.totalDiscountPercent,
        total_amount: s.totalAmount,
        payment_method: s.paymentMethod,
        global_discount: s.globalDiscount,
        notes: s.notes,
        sent_to_telegram: s.sentToTelegram,
        created_at: s.createdAt
      }));
      // Загружаем порциями по 100 штук
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        const { error } = await sb.from('sh_sales').upsert(batch);
        if (error) throw error;
      }
      result.salesMigrated = sales.length;
    }
  } catch (e: any) {
    result.errors.push(`Sales: ${e.message}`);
  }

  result.success = result.errors.length === 0;
  return result;
}

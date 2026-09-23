export type UserRole = 'admin' | 'manager';

export type Currency = 'BYN' | 'RUB' | 'USD' | 'EUR' | 'CNY';

export type ItemStatus = 'in_stock' | 'reserved' | 'sold' | 'in_transit';

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'sbp' | 'installment';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  telegramId?: string;
  avatar?: string;
}

export interface Supplier {
  id: string;
  name: string;
  country: string;
  contact: string;
}

export interface ShipmentItem {
  id: string;
  productName: string; // полное название (для отображения)
  shortName: string;   // короткое название (для этикетки/QR)
  category: string;
  quantity: number;
  purchaseCurrency: Currency;
  purchasePricePerUnit: number; // in purchase currency
  logisticsPerUnit: number;
  customsPerUnit: number;
  retailPrice: number; // in BYN (sale price)
  notes?: string;
  createdItemIds: string[];
}

export interface Shipment {
  id: string;
  batchCode: string; // e.g. "092026"
  supplierId: string;
  date: string;
  totalLogistics: number;
  totalCustoms: number;
  logisticsCurrency: Currency;
  customsCurrency: Currency;
  exchangeRates: { [K in Currency]?: number }; // курс к BYN на дату
  items: ShipmentItem[];
  notes?: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string; // unique, e.g. GF-L22-F-001
  shipmentId: string;
  batchCode: string;
  productName: string; // полное название
  shortName: string;   // короткое (на этикетке)
  category: string;
  status: ItemStatus;
  purchaseCurrency: Currency;
  purchasePriceOriginal: number;
  costPriceBYN: number; // зафиксированная себестоимость в BYN
  retailPrice: number; // цена продажи в BYN
  reservedFor?: string; // client id or manager id
  reservedAt?: string;
  soldAt?: string;
  saleId?: string;
  notes?: string;
  photoUrl?: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  telegramId?: string;
  city?: string;
  createdAt: string;
  totalPurchases: number;
  notes?: string;
}

export interface SaleItem {
  itemId: string;
  productName: string;
  batchCode: string;
  unitPrice: number; // базовая цена
  quantity: number; // количество единиц
  individualDiscount: number; // скидка на позицию в %
  finalPrice: number; // после скидки
}

export interface Sale {
  id: string;
  number: string; // human readable
  managerId: string;
  managerName: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  clientTelegramId?: string;
  items: SaleItem[];
  subtotal: number;
  totalDiscountAmount: number;
  totalDiscountPercent: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  globalDiscount: number; // общая скидка %
  notes?: string;
  sentToTelegram: boolean;
  createdAt: string;
}

export interface TelegramSettings {
  botToken: string;
  adminChatId: string;
  notificationsEnabled: boolean;
  sendReceiptsToClients: boolean;
}

// Резервирование товара под клиента
export interface Reservation {
  id: string;
  itemId: string;
  productName: string;
  shortName: string;
  batchCode: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  until: string; // дата окончания резерва
  notes?: string;
  managerId: string;
  managerName: string;
  createdAt: string;
}

// Алерты о низком остатке
export interface LowStockAlert {
  id: string;
  productName: string;
  shortName?: string;
  currentStock: number;
  minStock: number;
  notifiedAt?: string;
  acknowledged?: boolean;
}

// Активная сессия пользователя
export interface AuthSession {
  userId: string;
  loginTime: string;
  expiresAt: string;
  token: string;
}

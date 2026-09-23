import { Currency, User, Supplier } from './types';

// ============= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =============

export function generateBatchCode(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}${year}`;
}

export function parseBatchCode(code: string): { month: number; year: number } {
  const month = parseInt(code.slice(0, 2));
  const year = parseInt(code.slice(2, 6));
  return { month, year };
}

export function generateItemId(
  category: string,
  productName: string,
  index: number
): string {
  // Извлекаем код категории
  const catMap: { [key: string]: string } = {
    'Глюкофон': 'GF',
    'Чакрофон': 'CF',
    'Поющая чаша': 'TB',
    'Гонг': 'GNG',
    'Шейкер': 'SHK',
    'Космограмма': 'COS',
    'Тибетская чаша': 'TTB',
    'Rainstick': 'RS',
    'Диффузор': 'DIF',
    'Аромапалочки': 'INC',
    'Малат': 'MLT',
    'Колокольчик': 'BLL',
    'Камертон': 'TUN',
    'Барабан': 'DRM'
  };

  const prefix = catMap[category] || category.slice(0, 3).toUpperCase();
  const sizeMatch = productName.match(/(\d+)\s*(см|мм|мл|"|inch)/);
  const size = sizeMatch ? sizeMatch[1] : '00';
  const noteMatch = productName.match(/\b([A-G]#?)\b/);
  const note = noteMatch ? noteMatch[1].replace('#', 's') : 'X';
  const idx = String(index).padStart(3, '0');
  return `${prefix}-${size}-${note}-${idx}`;
}

export function formatCurrency(amount: number, currency: Currency = 'BYN'): string {
  const symbols: Record<Currency, string> = {
    BYN: 'Br',
    RUB: '₽',
    USD: '$',
    EUR: '€',
    CNY: '¥'
  };
  const value = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
  return `${value} ${symbols[currency]}`;
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('ru-RU').format(amount);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ============= НАЧАЛЬНЫЕ ДАННЫЕ =============

export const INITIAL_USERS: User[] = [
  { id: 'u-1', name: 'Ольга (директор)', role: 'admin', telegramId: '' },
  { id: 'u-2', name: 'Аня Петрова', role: 'manager' },
  { id: 'u-3', name: 'Михаил К.', role: 'manager' },
  { id: 'u-4', name: 'Дарья С.', role: 'manager' }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  { id: 's-1', name: 'Nepal Crafts Import', country: 'Непал', contact: '+977-1-4223456' },
  { id: 's-2', name: 'Tibet Sounds Co.', country: 'Тибет', contact: 'wechat: tibetsounds' },
  { id: 's-3', name: 'CrystalTone EU', country: 'Германия', contact: 'orders@crystaltone.de' },
  { id: 's-4', name: 'Sound Master UA', country: 'Украина', contact: '+380-44-1234567' }
];

export const CATEGORIES = [
  'Глюкофон',
  'Чакрофон',
  'Поющая чаша',
  'Гонг',
  'Тибетская чаша',
  'Космограмма',
  'Шейкер',
  'Rainstick',
  'Камертон',
  'Колокольчик',
  'Барабан',
  'Диффузор',
  'Аромапалочки'
];

// ============= LOCAL STORAGE =============

const STORAGE_KEYS = {
  shipments: 'sh_shipments',
  inventory: 'sh_inventory',
  sales: 'sh_sales',
  clients: 'sh_clients',
  users: 'sh_users',
  suppliers: 'sh_suppliers',
  telegram: 'sh_telegram',
  currentUser: 'sh_currentUser',
  darkMode: 'sh_darkMode'
};

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to storage', e);
  }
}

export const STORAGE = STORAGE_KEYS;

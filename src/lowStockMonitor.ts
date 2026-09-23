// Мониторинг низких остатков — автоматические уведомления

import { InventoryItem } from './types';
import { notifications } from './notifications';

const ALERTED_ITEMS_KEY = 'sh_alerted_items';

// Товары, для которых уже было уведомление (чтобы не спамить)
export function getAlertedItems(): Set<string> {
  const stored = localStorage.getItem(ALERTED_ITEMS_KEY);
  if (!stored) return new Set();
  try {
    return new Set(JSON.parse(stored));
  } catch {
    return new Set();
  }
}

export function markAsAlerted(itemId: string): void {
  const alerted = getAlertedItems();
  alerted.add(itemId);
  // Сохраняем только последние 100 (чтобы не засорять)
  const arr = Array.from(alerted).slice(-100);
  localStorage.setItem(ALERTED_ITEMS_KEY, JSON.stringify(arr));
}

export function clearAlert(itemId: string): void {
  const alerted = getAlertedItems();
  alerted.delete(itemId);
  localStorage.setItem(ALERTED_ITEMS_KEY, JSON.stringify(Array.from(alerted)));
}

export function clearAllAlerts(): void {
  localStorage.removeItem(ALERTED_ITEMS_KEY);
}

// Группировка товаров по названию для подсчёта общего остатка
export interface ProductStock {
  productName: string;
  shortName: string;
  category: string;
  totalStock: number;
  unitPrice: number;
  reserved: number;
  available: number;
  itemIds: string[];
}

export function calculateStock(inventory: InventoryItem[]): ProductStock[] {
  const grouped: { [key: string]: ProductStock } = {};

  inventory
    .filter(i => i.status === 'in_stock' || i.status === 'reserved')
    .forEach(item => {
      const key = item.productName;
      if (!grouped[key]) {
        grouped[key] = {
          productName: item.productName,
          shortName: item.shortName,
          category: item.category,
          totalStock: 0,
          unitPrice: item.retailPrice,
          reserved: 0,
          available: 0,
          itemIds: []
        };
      }
      grouped[key].totalStock++;
      grouped[key].itemIds.push(item.id);
      if (item.status === 'reserved') grouped[key].reserved++;
    });

  // Вычисляем доступные (в наличии - резерв)
  Object.values(grouped).forEach(p => {
    p.available = p.totalStock - p.reserved;
  });

  return Object.values(grouped).sort((a, b) => a.available - b.available);
}

// Проверка низких остатков
export function checkLowStock(
  inventory: InventoryItem[],
  threshold: number = 3
): ProductStock[] {
  const stock = calculateStock(inventory);
  return stock.filter(s => s.available <= threshold && s.available > 0);
}

export interface AlertResult {
  newAlerts: ProductStock[];
  totalLowStock: number;
}

// Проверить и отправить уведомления о новых низких остатках
export function monitorLowStock(inventory: InventoryItem[], threshold: number = 3): AlertResult {
  const lowStock = checkLowStock(inventory, threshold);
  const alerted = getAlertedItems();
  const newAlerts: ProductStock[] = [];

  lowStock.forEach(item => {
    // Проверяем что ещё НЕ уведомляли по этим конкретным ID
    const someNotAlerted = item.itemIds.some(id => !alerted.has(id));
    if (someNotAlerted) {
      newAlerts.push(item);
      // Помечаем все ID как alerted
      item.itemIds.forEach(id => markAsAlerted(id));
    }
  });

  // Отправляем уведомления (не больше 3 за раз, чтобы не спамить)
  if (newAlerts.length > 0 && newAlerts.length <= 3) {
    newAlerts.forEach(item => {
      notifications.lowStock({
        name: item.shortName || item.productName,
        stock: item.available,
        minStock: threshold
      });
    });
  } else if (newAlerts.length > 3) {
    // Если много — одно общее уведомление
    notifications.lowStock({
      name: `${newAlerts.length} товаров`,
      stock: 0,
      minStock: threshold
    });
  }

  return {
    newAlerts,
    totalLowStock: lowStock.length
  };
}

// Сбросить все алерты (например когда товар пополнили)
export function resetAlertsForProduct(_productName: string): void {
  // Заглушка — оставлено для будущего расширения
}

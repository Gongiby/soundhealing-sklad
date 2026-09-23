// Импорт/экспорт всей базы данных в JSON
// Для бэкапа и миграции между устройствами

import {
  Shipment, InventoryItem, Sale, Client, User, Supplier
} from './types';

const BACKUP_VERSION = 1;

export interface FullBackup {
  version: number;
  exportedAt: string;
  appName: string;
  data: {
    shipments: Shipment[];
    inventory: InventoryItem[];
    sales: Sale[];
    clients: Client[];
    users: User[];
    suppliers: Supplier[];
  };
}

export function createBackup(
  shipments: Shipment[],
  inventory: InventoryItem[],
  sales: Sale[],
  clients: Client[],
  users: User[],
  suppliers: Supplier[]
): FullBackup {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appName: 'SoundHealing.by',
    data: {
      shipments,
      inventory,
      sales,
      clients,
      users,
      suppliers
    }
  };
}

export function downloadBackup(backup: FullBackup): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  link.href = url;
  link.download = `belka-backup-${date}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  success: boolean;
  message: string;
  stats?: {
    shipments: number;
    inventory: number;
    sales: number;
    clients: number;
    users: number;
    suppliers: number;
  };
  error?: string;
}

export async function importBackup(file: File): Promise<ImportResult> {
  try {
    const text = await file.text();
    const backup: FullBackup = JSON.parse(text);

    // Валидация
    if (!backup.version || !backup.data) {
      return {
        success: false,
        message: 'Неверный формат файла бэкапа',
        error: 'Invalid backup format'
      };
    }

    if (backup.appName !== 'SoundHealing.by') {
      return {
        success: false,
        message: 'Файл не является бэкапом SoundHealing.by',
        error: 'Wrong app'
      };
    }

    return {
      success: true,
      message: 'Бэкап успешно прочитан. Импортируйте данные через кнопку ниже.',
      stats: {
        shipments: backup.data.shipments?.length || 0,
        inventory: backup.data.inventory?.length || 0,
        sales: backup.data.sales?.length || 0,
        clients: backup.data.clients?.length || 0,
        users: backup.data.users?.length || 0,
        suppliers: backup.data.suppliers?.length || 0
      }
    };
  } catch (e: any) {
    return {
      success: false,
      message: 'Ошибка чтения файла',
      error: e.message
    };
  }
}

// Применение импортированных данных в localStorage
export function applyBackup(backup: FullBackup): void {
  if (backup.data.shipments) localStorage.setItem('sh_shipments', JSON.stringify(backup.data.shipments));
  if (backup.data.inventory) localStorage.setItem('sh_inventory', JSON.stringify(backup.data.inventory));
  if (backup.data.sales) localStorage.setItem('sh_sales', JSON.stringify(backup.data.sales));
  if (backup.data.clients) localStorage.setItem('sh_clients', JSON.stringify(backup.data.clients));
  if (backup.data.users) localStorage.setItem('sh_users', JSON.stringify(backup.data.users));
  if (backup.data.suppliers) localStorage.setItem('sh_suppliers', JSON.stringify(backup.data.suppliers));
}

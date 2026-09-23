// Лог изменений для отслеживания действий пользователей

const LOG_KEY = 'sh_audit_log';
const MAX_ENTRIES = 500;

export type AuditAction =
  | 'create_shipment'
  | 'create_sale'
  | 'refund_sale'
  | 'create_client'
  | 'create_supplier'
  | 'create_reservation'
  | 'extend_reservation'
  | 'delete_reservation'
  | 'delete_item'
  | 'change_password'
  | 'reset_data'
  | 'import_backup'
  | 'export_backup'
  | 'login'
  | 'logout';

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: AuditAction;
  details: string;
  // Дополнительные данные
  targetId?: string;
  targetName?: string;
  metadata?: Record<string, any>;
}

export function logAction(
  userId: string,
  userName: string,
  action: AuditAction,
  details: string,
  metadata?: {
    targetId?: string;
    targetName?: string;
    extra?: Record<string, any>;
  }
): void {
  const logs = getAuditLog();
  const entry: AuditEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    action,
    details,
    targetId: metadata?.targetId,
    targetName: metadata?.targetName,
    metadata: metadata?.extra
  };

  logs.unshift(entry);

  // Храним только последние MAX_ENTRIES
  if (logs.length > MAX_ENTRIES) {
    logs.length = MAX_ENTRIES;
  }

  localStorage.setItem(LOG_KEY, JSON.stringify(logs));
}

export function getAuditLog(): AuditEntry[] {
  const stored = localStorage.getItem(LOG_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function getAuditLogForUser(userId: string): AuditEntry[] {
  return getAuditLog().filter(e => e.userId === userId);
}

export function getAuditLogForAction(action: AuditAction): AuditEntry[] {
  return getAuditLog().filter(e => e.action === action);
}

export function getAuditLogForPeriod(from: Date, to: Date): AuditEntry[] {
  return getAuditLog().filter(e => {
    const t = new Date(e.timestamp);
    return t >= from && t <= to;
  });
}

export function clearAuditLog(): void {
  localStorage.removeItem(LOG_KEY);
}

// Красивое название действия для отображения
export function getActionLabel(action: AuditAction): string {
  const labels: Record<AuditAction, string> = {
    'create_shipment': '📦 Создана поставка',
    'create_sale': '🛒 Продажа',
    'refund_sale': '↩️ Возврат',
    'create_client': '👤 Новый клиент',
    'create_supplier': '🏭 Новый поставщик',
    'create_reservation': '🎫 Резервирование',
    'extend_reservation': '⏰ Продление резерва',
    'delete_reservation': '🗑 Удаление резерва',
    'delete_item': '🗑 Удаление товара',
    'change_password': '🔐 Смена пароля',
    'reset_data': '⚠️ Сброс данных',
    'import_backup': '📥 Импорт бэкапа',
    'export_backup': '📤 Экспорт бэкапа',
    'login': '🔓 Вход',
    'logout': '🔒 Выход'
  };
  return labels[action] || action;
}

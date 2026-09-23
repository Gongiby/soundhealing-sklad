// Оффлайн-очередь для отложенной синхронизации
// Когда нет интернета — изменения копятся тут и отправятся при появлении сети

import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const QUEUE_KEY = 'sh_sync_queue';

export type QueuedAction = {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: 'sh_shipments' | 'sh_inventory' | 'sh_sales' | 'sh_clients' | 'sh_suppliers';
  data: any;
  createdAt: string;
  retries: number;
};

export function getQueue(): QueuedAction[] {
  const stored = localStorage.getItem(QUEUE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function addToQueue(action: Omit<QueuedAction, 'id' | 'createdAt' | 'retries'>): void {
  const queue = getQueue();
  queue.push({
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
    createdAt: new Date().toISOString(),
    retries: 0
  });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function removeFromQueue(id: string): void {
  const queue = getQueue().filter(a => a.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function clearQueue(): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify([]));
}

// Обработать всю очередь
export async function processQueue(): Promise<{ processed: number; failed: number }> {
  if (!isSupabaseConfigured) return { processed: 0, failed: 0 };

  const sb = getSupabaseClient();
  if (!sb) return { processed: 0, failed: 0 };

  const queue = getQueue();
  let processed = 0;
  let failed = 0;

  for (const action of queue) {
    try {
      let error;
      if (action.type === 'delete') {
        const res = await sb.from(action.table).delete().eq('id', action.data.id);
        error = res.error;
      } else {
        const res = await sb.from(action.table).upsert(action.data);
        error = res.error;
      }

      if (error) throw error;
      removeFromQueue(action.id);
      processed++;
    } catch (e) {
      console.error(`Queue action failed:`, e);
      // Увеличиваем счётчик попыток
      const updated = getQueue().map(a =>
        a.id === action.id ? { ...a, retries: a.retries + 1 } : a
      );
      localStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
      failed++;
      // Если больше 5 попыток — удаляем (не получится)
      if (action.retries >= 5) {
        removeFromQueue(action.id);
      }
    }
  }

  return { processed, failed };
}

// Автоматическая обработка очереди при появлении сети
let isProcessingQueue = false;
export async function tryProcessQueue(): Promise<void> {
  if (isProcessingQueue) return;
  if (!navigator.onLine) return;

  isProcessingQueue = true;
  await processQueue();
  isProcessingQueue = false;
}

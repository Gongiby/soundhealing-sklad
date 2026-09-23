import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Конфигурация Supabase
// Замените на свои значения после создания проекта на https://supabase.com
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Проверка: настроен ли Supabase
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Создаём клиент только если настроено
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  : null;

// Хранилище конфигурации в localStorage (для случая когда не используется .env)
const CONFIG_KEY = 'sh_supabase_config';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  configuredAt: string;
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({
    url,
    anonKey,
    configuredAt: new Date().toISOString()
  }));
}

export function loadSupabaseConfig(): SupabaseConfig | null {
  const stored = localStorage.getItem(CONFIG_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(CONFIG_KEY);
}

// Если конфиг хранится в localStorage — пробуем создать клиент
export function getSupabaseClient(): SupabaseClient | null {
  if (supabase) return supabase;

  const config = loadSupabaseConfig();
  if (!config || !config.url || !config.anonKey) return null;

  return createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  });
}

import { useState } from 'react';
import {
  saveSupabaseConfig,
  loadSupabaseConfig,
  clearSupabaseConfig,
  isSupabaseConfigured
} from '../supabaseClient';
import { migrateLocalStorageToSupabase } from '../migration';
import { Cloud, Save, Trash2, ExternalLink, CheckCircle2, AlertCircle, Loader2, Database } from 'lucide-react';

interface Props {
  onClose?: () => void;
}

export function SupabaseSettings({ onClose }: Props) {
  const [url, setUrl] = useState(loadSupabaseConfig()?.url || '');
  const [anonKey, setAnonKey] = useState(loadSupabaseConfig()?.anonKey || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const handleSave = () => {
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({ success: false, message: 'Заполните оба поля' });
      return;
    }
    saveSupabaseConfig(url.trim(), anonKey.trim());
    setSaved(true);
    setTestResult({ success: true, message: '✅ Настройки сохранены. Перезагрузите приложение для применения.' });
    setTimeout(() => {
      setSaved(false);
      if (onClose) onClose();
      location.reload(); // Перезагрузка чтобы клиент Supabase инициализировался с новыми настройками
    }, 1500);
  };

  const handleTest = async () => {
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({ success: false, message: 'Заполните оба поля' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      // Временно сохраняем для теста
      saveSupabaseConfig(url.trim(), anonKey.trim());

      const { createClient } = await import('@supabase/supabase-js');
      const testClient = createClient(url.trim(), anonKey.trim());
      const { error } = await testClient.from('sh_users').select('count').limit(1);

      if (error) {
        setTestResult({ success: false, message: `❌ Ошибка: ${error.message}\n\nВозможно, не запущен SQL-скрипт supabase/init.sql` });
      } else {
        setTestResult({ success: true, message: '✅ Подключение успешно! Таблицы найдены.' });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: `❌ Ошибка: ${e.message}` });
    }
    setTesting(false);
  };

  const handleClear = () => {
    if (confirm('Отключить Supabase? Данные останутся локально, синхронизация прекратится.')) {
      clearSupabaseConfig();
      setUrl('');
      setAnonKey('');
      location.reload();
    }
  };

  const handleMigrate = async () => {
    if (!confirm('Перенести все данные из локального хранилища в облако Supabase? Существующие данные в облаке будут дополнены, не перезаписаны.')) return;
    setMigrating(true);
    const result = await migrateLocalStorageToSupabase();
    setMigrating(false);
    if (result.success) {
      setTestResult({ success: true, message: `✅ Миграция завершена! Перенесено: ${result.shipmentsMigrated} поставок, ${result.inventoryMigrated} товаров, ${result.salesMigrated} продаж, ${result.clientsMigrated} клиентов, ${result.suppliersMigrated} поставщиков` });
    } else {
      setTestResult({ success: false, message: `❌ Ошибки миграции:\n${result.errors.join('\n')}` });
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-sky-50 dark:bg-sky-950/30 rounded-xl border border-sky-200 dark:border-sky-900">
        <div className="flex items-start gap-2 text-xs text-sky-900 dark:text-sky-200">
          <ExternalLink className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Как получить URL и ключ:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-[11px]">
              <li>Зарегистрируйтесь на <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline">supabase.com</a> (бесплатно)</li>
              <li>Создайте новый проект</li>
              <li>Settings → API → скопируйте "Project URL" и "anon public key"</li>
              <li>SQL Editor → выполните скрипт <code className="bg-sky-100 dark:bg-sky-900 px-1 rounded">supabase/init.sql</code></li>
              <li>Вставьте URL и ключ ниже</li>
            </ol>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
          🌐 Project URL
        </label>
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://xxxxx.supabase.co"
          className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-mono"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
          🔑 Anon Public Key
        </label>
        <textarea
          value={anonKey}
          onChange={e => setAnonKey(e.target.value)}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          rows={3}
          className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-mono resize-none"
        />
      </div>

      {testResult && (
        <div className={`p-3 rounded-xl text-xs whitespace-pre-line ${
          testResult.success
            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
            : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
        }`}>
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 inline mr-1" />
          ) : (
            <AlertCircle className="w-4 h-4 inline mr-1" />
          )}
          {testResult.message}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleTest}
          disabled={testing || !url || !anonKey}
          className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition"
        >
          {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          Тест подключения
        </button>
        <button
          onClick={handleSave}
          disabled={!url || !anonKey}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition"
        >
          {saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? 'Сохранено!' : 'Сохранить и перезагрузить'}
        </button>
        {isSupabaseConfigured && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-950/50 rounded-xl text-xs font-semibold transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Отключить облако
          </button>
        )}
      </div>

      {isSupabaseConfigured && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300">
          <Cloud className="w-4 h-4 inline mr-1" />
          Supabase подключен. Данные синхронизируются автоматически.
        </div>
      )}

      {/* Кнопка миграции — только если Supabase настроен */}
      {isSupabaseConfigured && (
        <div className="pt-3 border-t border-stone-200 dark:border-stone-800">
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition"
          >
            {migrating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
            {migrating ? 'Мигрирую данные в облако...' : '📦 Перенести данные из localStorage в облако'}
          </button>
          <p className="text-[10px] text-stone-500 mt-1.5">
            Используйте если у вас уже есть данные в браузере и вы впервые подключаете облако
          </p>
        </div>
      )}
    </div>
  );
}

import { useState, useRef } from 'react';
import { useApp } from '../AppContext';
import { createBackup, downloadBackup, importBackup, applyBackup, ImportResult } from '../backup';
import { requestNotificationPermission, getNotificationPermission } from '../notifications';
import { isSoundEnabled, setSoundEnabled } from '../sound';
import { sendBackupViaTelegram } from '../telegramBackup';
import {
  Download, Upload, Bell, BellOff, CheckCircle2,
  AlertCircle, FileJson, Save, Info, Volume2, VolumeX, Send, Loader2
} from 'lucide-react';

export function BackupSection() {
  const { shipments, inventory, sales, clients, users, suppliers } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [permission, setPermission] = useState(getNotificationPermission());
  const [soundEnabled, setSound] = useState(isSoundEnabled());
  const [sendingTelegram, setSendingTelegram] = useState(false);

  const handleExport = () => {
    const backup = createBackup(shipments, inventory, sales, clients, users, suppliers);
    downloadBackup(backup);
  };

  const handleSendTelegram = async () => {
    setSendingTelegram(true);
    const result = await sendBackupViaTelegram(shipments, inventory, sales, clients, users, suppliers);
    setSendingTelegram(false);
    if (result.success) {
      alert(`✅ Бэкап отправлен в Telegram (${result.chunksSent} сообщений)`);
    } else {
      alert(`❌ Ошибка: ${result.error}`);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const result = await importBackup(file);
    setImportResult(result);
  };

  const handleApplyImport = () => {
    if (!importResult?.success || !selectedFile) return;
    if (!confirm('⚠️ Импорт ПЕРЕЗАПИШЕТ все текущие данные! Продолжить?')) return;
    // Перечитать файл и применить
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target?.result as string);
        applyBackup(backup);
        alert('✅ Данные импортированы! Страница перезагрузится.');
        location.reload();
      } catch (err) {
        alert('Ошибка импорта');
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      new Notification('✅ Уведомления включены', {
        body: 'Теперь вы будете получать уведомления о новых продажах',
        icon: '/icon.png'
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Уведомления */}
      <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/50 shrink-0">
            {permission === 'granted' ? (
              <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            ) : (
              <BellOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
              Уведомления в браузере
            </p>
            <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
              {permission === 'granted'
                ? '✅ Включены — увидите уведомления о новых продажах'
                : permission === 'denied'
                ? '❌ Заблокированы — разблокируйте в настройках браузера'
                : '🔔 Включите чтобы получать уведомления даже без Telegram'}
            </p>
            {permission === 'default' && (
              <button
                onClick={handleRequestPermission}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition"
              >
                <Bell className="w-3 h-3" />
                Включить уведомления
               </button>
            )}
          </div>
        </div>
      </div>

      {/* Звуки */}
      <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-800">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-950/50 shrink-0">
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">
              🔊 Звуковые эффекты
            </p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              {soundEnabled
                ? '✅ Включены — звук при сканировании и продажах'
                : '❌ Выключены — тихий режим'}
            </p>
            <button
              onClick={() => {
                const newValue = !soundEnabled;
                setSound(newValue);
                setSoundEnabled(newValue);
              }}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold transition"
            >
              {soundEnabled ? 'Выключить звуки' : 'Включить звуки'}
            </button>
          </div>
        </div>
      </div>

      {/* Экспорт базы */}
      <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-800">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 shrink-0">
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">
              📦 Резервная копия (экспорт)
            </p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              Скачайте всю базу в JSON-файл. Можно хранить в облаке или перенести на другое устройство.
            </p>
            <p className="text-[10px] text-stone-400 mt-1">
              📊 {shipments.length} поставок · {inventory.length} товаров · {sales.length} продаж · {clients.length} клиентов · {suppliers.length} поставщиков
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
              >
                <Save className="w-3 h-3" />
                Скачать (.json)
              </button>
              <button
                onClick={handleSendTelegram}
                disabled={sendingTelegram}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition"
                title="Отправить бэкап в Telegram (требуется настройка бота)"
              >
                {sendingTelegram ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                В Telegram
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Импорт базы */}
      <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-800">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-950/50 shrink-0">
            <Upload className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">
              📥 Восстановление из бэкапа
            </p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              Загрузите ранее сохранённый JSON-файл чтобы восстановить данные.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex flex-wrap gap-2 mt-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold transition"
              >
                <FileJson className="w-3 h-3" />
                Выбрать файл
              </button>

              {selectedFile && importResult?.success && (
                <button
                  onClick={handleApplyImport}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Применить (перезапись!)
                </button>
              )}
            </div>

            {selectedFile && (
              <p className="text-[10px] text-stone-500 mt-1.5">
                📄 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}

            {importResult && (
              <div className={`mt-2 p-2 rounded-lg text-[11px] ${
                importResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                  : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
              }`}>
                {importResult.success ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 inline mr-1" />
                    {importResult.message}
                    {importResult.stats && (
                      <div className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                        Найдено: {importResult.stats.shipments} поставок, {importResult.stats.inventory} товаров, {importResult.stats.sales} продаж, {importResult.stats.clients} клиентов
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    {importResult.message}: {importResult.error}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Информация */}
      <div className="p-3 bg-sky-50 dark:bg-sky-950/30 rounded-xl border border-sky-200 dark:border-sky-900">
        <div className="flex items-start gap-2 text-xs text-sky-900 dark:text-sky-200">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Советы по бэкапам:</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-sky-700 dark:text-sky-300">
              <li>Делайте бэкап раз в неделю</li>
              <li>Храните копию в облаке (Google Drive, Яндекс.Диск)</li>
              <li>Перед обновлением приложения — обязательно бэкап</li>
              <li>При использовании Supabase — бэкап локальной базы не нужен</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

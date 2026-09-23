import { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { generateGuidePDF } from '../utils/generateGuidePDF';
import { generatePassportPDF } from '../utils/generatePassportPDF';
import { logout, changePassword, adminResetPassword } from '../auth';
import { SupabaseSettings } from '../components/SupabaseSettings';
import { BackupSection } from '../components/BackupSection';

import {
  Send, Check, AlertCircle, Save, RotateCcw,
  MessageCircle, Info, Trash2, FileText, KeyRound, LogOut, Cloud
} from 'lucide-react';

export function Settings() {
  const { telegram, saveTelegram, users, setCurrentUser, currentUser } = useApp();

  const [botToken, setBotToken] = useState(telegram.botToken);
  const [adminChatId, setAdminChatId] = useState(telegram.adminChatId);
  const [notificationsEnabled, setNotificationsEnabled] = useState(telegram.notificationsEnabled);
  const [sendReceiptsToClients, setSendReceiptsToClients] = useState(telegram.sendReceiptsToClients);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Смена пароля
  const [showPasswordForm, setShowPasswordForm] = useState<string | null>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordResult, setPasswordResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleChangePassword = async (userId: string) => {
    if (userId === currentUser.id) {
      // Свой пароль
      const result = await changePassword(currentUser.id, oldPassword, newPassword);
      setPasswordResult(result.success
        ? { success: true, message: '✅ Пароль изменён' }
        : { success: false, message: result.error || 'Ошибка' }
      );
    } else {
      // Сброс чужого пароля (только админ)
      if (currentUser.role !== 'admin') {
        setPasswordResult({ success: false, message: 'Только директор может сбрасывать чужие пароли' });
        return;
      }
      await adminResetPassword(userId, newPassword || '1234');
      setPasswordResult({ success: true, message: `✅ Пароль сброшен на "${newPassword || '1234'}"` });
    }
    setOldPassword('');
    setNewPassword('');
    setTimeout(() => setPasswordResult(null), 3000);
  };

  useEffect(() => {
    setBotToken(telegram.botToken);
    setAdminChatId(telegram.adminChatId);
    setNotificationsEnabled(telegram.notificationsEnabled);
    setSendReceiptsToClients(telegram.sendReceiptsToClients);
  }, [telegram]);

  const handleSave = () => {
    saveTelegram({
      botToken,
      adminChatId,
      notificationsEnabled,
      sendReceiptsToClients
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    if (!botToken || !adminChatId) {
      setTestResult({ success: false, message: 'Заполните токен и Chat ID' });
      return;
    }
    setTesting(true);
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: '🎉 Тестовое уведомление от SoundHealing.by\n\nБот успешно подключен!'
        })
      });
      const data = await response.json();
      if (data.ok) {
        setTestResult({ success: true, message: '✅ Сообщение отправлено! Проверьте Telegram.' });
      } else {
        setTestResult({ success: false, message: `❌ Ошибка: ${data.description}` });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: `❌ Ошибка сети: ${e.message}` });
    }
    setTesting(false);
    setTimeout(() => setTestResult(null), 5000);
  };

  const handleResetData = () => {
    import('../dangerConfirm').then(({ createDangerConfirm }) => {
      createDangerConfirm(
        'Удалить ВСЕ данные и загрузить демо-наполнение. Это действие НЕОБРАТИМО — будут удалены все поставки, продажи, клиенты.',
        {
          buttonText: 'Удерживайте 2 сек для удаления',
          holdMs: 2000,
          onConfirm: () => {
            localStorage.clear();
            location.reload();
          }
        }
      );
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">
          Настройки
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Telegram-бот, пользователи, документация
        </p>
      </div>

      {/* Telegram section */}
      <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-950/50">
            <MessageCircle className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base">Telegram-бот</h2>
            <p className="text-xs text-stone-500">Уведомления директору и чеки клиентам</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Bot Token <span className="text-stone-400">(от @BotFather)</span>
            </label>
            <input
              type="text"
              value={botToken}
              onChange={e => setBotToken(e.target.value)}
              placeholder="1234567890:ABCDefghijk..."
              className="w-full mt-1 px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Chat ID директора
            </label>
            <input
              type="text"
              value={adminChatId}
              onChange={e => setAdminChatId(e.target.value)}
              placeholder="-1001234567890 или 123456789"
              className="w-full mt-1 px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-mono"
            />
            <p className="text-[10px] text-stone-500 mt-1">
              Узнать свой ID: напишите боту @userinfobot или @getmyid_bot
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={e => setNotificationsEnabled(e.target.checked)}
                className="rounded accent-amber-600"
              />
              <span className="text-sm">Отправлять уведомления директору о продажах</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sendReceiptsToClients}
                onChange={e => setSendReceiptsToClients(e.target.checked)}
                className="rounded accent-amber-600"
              />
              <span className="text-sm">Автоматически отправлять чеки клиентам</span>
            </label>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition"
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Сохранено' : 'Сохранить'}
            </button>
            <button
              onClick={handleTest}
              disabled={testing || !botToken || !adminChatId}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition"
            >
              <Send className="w-4 h-4" />
              {testing ? 'Отправляю...' : 'Тест'}
            </button>
          </div>

          {testResult && (
            <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300'
            }`}>
              {testResult.success ? <Check className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        <details className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl">
          <summary className="text-xs font-semibold cursor-pointer flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            Как создать бота (инструкция)
          </summary>
          <ol className="mt-2 text-xs text-stone-700 dark:text-stone-300 space-y-1 pl-5 list-decimal">
            <li>Откройте @BotFather в Telegram</li>
            <li>Отправьте /newbot и следуйте инструкциям</li>
            <li>Скопируйте токен и вставьте выше</li>
            <li>Узнайте свой Chat ID через @userinfobot</li>
             <li>Нажмите "Тест" для проверки</li>
          </ol>
        </details>
      </section>

      {/* Supabase Cloud Sync */}
      <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-950/50">
            <Cloud className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base">Облачная синхронизация (Supabase)</h2>
            <p className="text-xs text-stone-500">Синхронизация между устройствами через облако</p>
          </div>
        </div>

        <SupabaseSettings />
      </section>

      {/* Backup & Notifications */}
      <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/50">
            <Save className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base">Бэкапы и уведомления</h2>
            <p className="text-xs text-stone-500">Резервное копирование данных и браузерные уведомления</p>
          </div>
        </div>

        <BackupSection />
      </section>

      {/* Logout */}
      <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white text-xs font-bold">
              {currentUser.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </div>
            <div>
              <p className="font-medium text-sm">{currentUser.name}</p>
              <p className="text-xs text-stone-500">
                Авторизован · сессия активна 7 дней
              </p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-lg text-xs font-semibold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Выйти
          </button>
        </div>
      </section>

      {/* Users */}
      <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-950/50">
            <KeyRound className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base">Пользователи и пароли</h2>
            <p className="text-xs text-stone-500">{users.length} пользователей · пароли хранятся в виде хэшей</p>
          </div>
        </div>

        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="space-y-1">
              <button
                onClick={() => setCurrentUser(u)}
                className={`w-full p-3 rounded-xl text-left transition flex items-center justify-between ${
                  currentUser.id === u.id
                    ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900'
                    : 'bg-stone-50 dark:bg-stone-800/30 hover:bg-stone-100 dark:hover:bg-stone-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white text-xs font-bold">
                    {u.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{u.name}</p>
                    <p className="text-xs text-stone-500">
                      {u.role === 'admin' ? '👑 Директор' : '🛒 Менеджер'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPasswordForm(showPasswordForm === u.id ? null : u.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500"
                    title="Сменить пароль"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>
                  {currentUser.id === u.id && <Check className="w-4 h-4 text-amber-600 ml-1" />}
                </div>
              </button>

              {/* Форма смены пароля */}
              {showPasswordForm === u.id && (
                <div className="ml-4 p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-200 dark:border-stone-700 space-y-2">
                  <p className="text-[11px] text-stone-600 dark:text-stone-400">
                    {u.id === currentUser.id
                      ? '🔐 Смена своего пароля'
                      : '🔑 Сброс пароля (только для директора)'}
                  </p>
                  {u.id === currentUser.id && (
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={e => setOldPassword(e.target.value)}
                      placeholder="Текущий пароль"
                      className="w-full px-2 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-xs"
                    />
                  )}
                  <input
                    type="text"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Новый пароль"
                    className="w-full px-2 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-xs"
                  />
                  <button
                    onClick={() => handleChangePassword(u.id)}
                    className="w-full px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold"
                  >
                    {u.id === currentUser.id ? 'Сохранить' : 'Сбросить пароль'}
                  </button>
                  {passwordResult && (
                    <div className={`text-[11px] p-2 rounded ${
                      passwordResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300'
                    }`}>
                      {passwordResult.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Reset */}
      <section className="bg-white dark:bg-stone-900 rounded-2xl border border-rose-200 dark:border-rose-900 p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/50">
            <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base text-rose-700 dark:text-rose-400">Опасная зона</h2>
            <p className="text-xs text-stone-500">Сброс всех данных</p>
          </div>
        </div>
        <button
          onClick={handleResetData}
          className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition"
        >
          <RotateCcw className="w-4 h-4" />
          Сбросить данные
        </button>
      </section>

      {/* Guide */}
      <section className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/50">
            <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base">📄 Документация</h2>
            <p className="text-xs text-stone-500">Скачать в PDF — доступно всем</p>
          </div>
        </div>
        <div className="space-y-2">
          <button
            onClick={() => generateGuidePDF()}
            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>📥 Руководство пользователя</span>
            </div>
            <span className="text-[10px] text-amber-100">9 стр.</span>
          </button>
          <button
            onClick={() => generatePassportPDF()}
            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-gradient-to-r from-stone-700 to-stone-800 hover:from-stone-800 hover:to-stone-900 text-white rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>📐 Технический паспорт</span>
            </div>
            <span className="text-[10px] text-stone-300">~20 стр.</span>
          </button>
        </div>
        <p className="text-[10px] text-stone-500 mt-2">
          Документы с полным описанием системы
        </p>
      </section>

      {/* About */}
      <section className="bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-950/30 dark:to-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-900 p-5">
        <p className="text-xs text-amber-900 dark:text-amber-200">
          <strong>SoundHealing.by</strong> — система управления магазином терапевтических инструментов.
          <br />
          Версия 1.0 · Полностью бесплатный стек (React + Vite + localStorage)
        </p>
      </section>
    </div>
  );
}

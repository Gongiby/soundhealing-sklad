import { useState, useEffect } from 'react';
import { getAuditLog, getActionLabel, AuditEntry, clearAuditLog } from '../auditLog';
import { formatDateTime } from '../store';
import {
  History, Search, Trash2, RefreshCw
} from 'lucide-react';

const ACTIONS = [
  'all',
  'create_sale',
  'refund_sale',
  'create_shipment',
  'create_client',
  'create_reservation',
  'change_password',
  'login',
  'logout'
] as const;

export function AuditLogScreen() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = () => {
    setLogs(getAuditLog());
  };

  const filtered = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.action === filter;
    const matchesSearch = !search.trim() ||
      log.userName.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleClear = () => {
    if (confirm(`Удалить ВСЮ историю (${logs.length} записей)? Это действие необратимо.`)) {
      clearAuditLog();
      loadLogs();
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <History className="w-7 h-7 text-amber-600" />
          История действий
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Аудит-лог: кто, что и когда делал в системе
        </p>
      </div>

      {/* Фильтры */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по пользователю или деталям..."
            className="w-full pl-10 pr-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-sm"
          />
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-sm"
        >
          {ACTIONS.map(a => (
            <option key={a} value={a}>
              {a === 'all' ? 'Все действия' : getActionLabel(a as any)}
            </option>
          ))}
        </select>
        <button
          onClick={loadLogs}
          className="p-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 rounded-xl"
          title="Обновить"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        {logs.length > 0 && currentUserIsAdmin() && (
          <button
            onClick={handleClear}
            className="p-2 bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-200 rounded-xl"
            title="Очистить всю историю"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-3 text-center">
          <p className="text-[10px] text-stone-500 uppercase">Всего</p>
          <p className="font-display font-bold text-lg">{logs.length}</p>
        </div>
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-3 text-center">
          <p className="text-[10px] text-stone-500 uppercase">Сегодня</p>
          <p className="font-display font-bold text-lg text-emerald-600">
            {logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length}
          </p>
        </div>
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-3 text-center">
          <p className="text-[10px] text-stone-500 uppercase">Показано</p>
          <p className="font-display font-bold text-lg text-amber-600">{filtered.length}</p>
        </div>
      </div>

      {/* Список */}
      <div className="space-y-1">
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-8 text-center">
            <History className="w-12 h-12 mx-auto text-stone-300 dark:text-stone-700 mb-2" />
            <p className="text-sm text-stone-500">
              {logs.length === 0
                ? 'История пуста. Действия начнут логироваться автоматически.'
                : 'Ничего не найдено по фильтру'}
            </p>
          </div>
        ) : filtered.slice(0, 100).map(log => (
          <div
            key={log.id}
            className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-3 hover:border-amber-300 transition"
          >
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-2 rounded-full bg-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-medium text-sm">
                    {getActionLabel(log.action)}
                  </p>
                  <span className="text-[10px] text-stone-500">
                    {formatDateTime(log.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
                  {log.details}
                </p>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-stone-500">
                  <span>👤 {log.userName}</span>
                  {log.targetId && (
                    <span className="font-mono">ID: {log.targetId.substring(0, 12)}...</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {filtered.length > 100 && (
          <p className="text-center text-xs text-stone-500 py-2">
            Показано первые 100 из {filtered.length} записей
          </p>
        )}
      </div>
    </div>
  );
}

// Вспомогательная функция — нужно для отображения кнопки очистки только админу
function currentUserIsAdmin(): boolean {
  try {
    const stored = localStorage.getItem('sh_currentUser');
    if (!stored) return false;
    const user = JSON.parse(stored);
    return user.role === 'admin';
  } catch {
    return false;
  }
}

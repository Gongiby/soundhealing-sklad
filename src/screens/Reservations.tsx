import { useState, useEffect, useMemo } from 'react';
import {
  getActiveReservations,
  getExpiredReservations,
  deleteReservation,
  extendReservation,
  cleanupExpiredReservations
} from '../reservations';
import { Reservation } from '../types';
import { formatCurrency, formatDate } from '../store';
import { useApp } from '../AppContext';
import {
  Clock, Trash2, User, Phone,
  AlertCircle
} from 'lucide-react';

export function Reservations() {
  const { inventory } = useApp();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filter, setFilter] = useState<'active' | 'expired' | 'all'>('active');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = () => {
    let all: Reservation[] = [];
    if (filter === 'active') all = getActiveReservations();
    else if (filter === 'expired') all = getExpiredReservations();
    else all = [...getActiveReservations(), ...getExpiredReservations()];

    if (search.trim()) {
      const q = search.toLowerCase();
      all = all.filter(r =>
        r.productName.toLowerCase().includes(q) ||
        (r.shortName && r.shortName.toLowerCase().includes(q)) ||
        r.clientName.toLowerCase().includes(q) ||
        (r.clientPhone && r.clientPhone.includes(q)) ||
        r.batchCode.toLowerCase().includes(q)
      );
    }

    // Сортировка: новые сверху
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setReservations(all);
  };

  useEffect(loadReservations, [filter, search]);

  const handleCleanup = () => {
    if (!confirm('Удалить все просроченные резервы?')) return;
    const removed = cleanupExpiredReservations();
    alert(`Удалено ${removed} просроченных резерва(ов)`);
    loadReservations();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Удалить резерв?')) return;
    deleteReservation(id);
    loadReservations();
  };

  const handleExtend = (id: string) => {
    const newDate = prompt('Продлить до (ГГГГ-ММ-ДД):', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    if (!newDate) return;
    extendReservation(id, newDate);
    loadReservations();
  };

  // Статистика
  const stats = useMemo(() => {
    const active = getActiveReservations();
    const expired = getExpiredReservations();
    const totalValue = active.reduce((sum, r) => {
      const inv = inventory.find(i => i.id === r.itemId);
      return sum + (inv?.retailPrice || 0);
    }, 0);
    const byClient: { [key: string]: number } = {};
    active.forEach(r => {
      byClient[r.clientName] = (byClient[r.clientName] || 0) + 1;
    });
    return {
      activeCount: active.length,
      expiredCount: expired.length,
      totalValue,
      topClient: Object.entries(byClient).sort((a, b) => b[1] - a[1])[0]
    };
  }, [inventory, reservations]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">
          Резервы товара
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Товары, закреплённые за конкретными клиентами
        </p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-3">
          <p className="text-[10px] text-stone-500 uppercase tracking-wider">Активных</p>
          <p className="font-display font-bold text-2xl text-amber-600 dark:text-amber-400 mt-1">
            {stats.activeCount}
          </p>
        </div>
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-3">
          <p className="text-[10px] text-stone-500 uppercase tracking-wider">Просрочено</p>
          <p className="font-display font-bold text-2xl text-rose-600 dark:text-rose-400 mt-1">
            {stats.expiredCount}
          </p>
        </div>
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-3">
          <p className="text-[10px] text-stone-500 uppercase tracking-wider">Сумма активных</p>
          <p className="font-display font-bold text-lg text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(stats.totalValue)}
          </p>
        </div>
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-3">
          <p className="text-[10px] text-stone-500 uppercase tracking-wider">Топ клиент</p>
          <p className="font-display font-bold text-sm text-stone-900 dark:text-stone-100 mt-1 truncate">
            {stats.topClient ? stats.topClient[0] : '—'}
          </p>
          {stats.topClient && (
            <p className="text-[10px] text-stone-500">{stats.topClient[1]} резерв(ов)</p>
          )}
        </div>
      </div>

      {/* Фильтры */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
          {[
            { v: 'active', label: '🟢 Активные', count: getActiveReservations().length },
            { v: 'expired', label: '🔴 Просроченные', count: getExpiredReservations().length },
            { v: 'all', label: 'Все', count: getActiveReservations().length + getExpiredReservations().length }
          ].map(f => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                filter === f.v
                  ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-sm'
                  : 'text-stone-600 dark:text-stone-300'
              }`}
            >
              {f.label} · {f.count}
            </button>
          ))}
        </div>

        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по товару, клиенту или партии..."
            className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm"
          />
        </div>

        {getExpiredReservations().length > 0 && (
          <button
            onClick={handleCleanup}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-950/50 rounded-xl text-xs font-semibold transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Очистить
          </button>
        )}
      </div>

      {/* Список */}
      <div className="space-y-2">
        {reservations.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-8 text-center">
            <Clock className="w-12 h-12 text-stone-300 dark:text-stone-700 mx-auto mb-2" />
            <p className="text-sm text-stone-500">
              {filter === 'active' ? 'Нет активных резервов' :
               filter === 'expired' ? 'Нет просроченных' :
               'Нет резервов'}
            </p>
            <p className="text-xs text-stone-400 mt-1">
              Создайте резерв через карточку товара в Складе
            </p>
          </div>
        ) : reservations.map(res => {
          const inv = inventory.find(i => i.id === res.itemId);
          const isExpired = new Date(res.until) < new Date();
          const daysLeft = Math.ceil((new Date(res.until).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

          return (
            <div
              key={res.id}
              className={`bg-white dark:bg-stone-900 rounded-2xl border p-4 transition ${
                isExpired
                  ? 'border-rose-300 dark:border-rose-900'
                  : daysLeft <= 1
                  ? 'border-amber-300 dark:border-amber-900'
                  : 'border-stone-200 dark:border-stone-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Заголовок */}
                  <div className="flex items-center gap-2 mb-1">
                    {isExpired ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                        <AlertCircle className="w-3 h-3" /> Просрочен
                      </span>
                    ) : daysLeft <= 1 ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                        <Clock className="w-3 h-3" /> Истекает сегодня
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <Clock className="w-3 h-3" /> Активен ({daysLeft} дн.)
                      </span>
                    )}
                    <span className="text-[10px] text-stone-500 font-mono">{res.batchCode}</span>
                  </div>

                  <h4 className="font-medium text-sm text-stone-900 dark:text-stone-100 truncate">
                    {res.shortName || res.productName}
                  </h4>
                  {res.shortName && res.shortName !== res.productName && (
                    <p className="text-[10px] text-stone-500 truncate">{res.productName}</p>
                  )}

                  {/* Клиент */}
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <User className="w-3 h-3 text-stone-400" />
                    <span className="font-medium">{res.clientName}</span>
                    {res.clientPhone && (
                      <span className="text-stone-500 flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5" />
                        {res.clientPhone}
                      </span>
                    )}
                  </div>

                  {res.notes && (
                    <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1 italic">
                      💬 {res.notes}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-2 text-[10px] text-stone-500">
                    <span>Создан: {formatDate(res.createdAt)}</span>
                    <span>Менеджер: {res.managerName}</span>
                  </div>
                </div>

                {/* Цена и действия */}
                <div className="text-right shrink-0">
                  {inv && (
                    <p className="font-display font-bold text-base text-amber-700 dark:text-amber-400">
                      {formatCurrency(inv.retailPrice)}
                    </p>
                  )}
                  <p className="text-[10px] text-stone-500 mt-1">
                    до {formatDate(res.until)}
                  </p>
                  <div className="flex flex-col gap-1 mt-2">
                    <button
                      onClick={() => handleExtend(res.id)}
                      className="px-2 py-1 bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-950/50 rounded-lg text-[10px] font-semibold transition"
                      title="Продлить резерв"
                    >
                      +7 дней
                    </button>
                    <button
                      onClick={() => handleDelete(res.id)}
                      className="px-2 py-1 bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-950/50 rounded-lg text-[10px] font-semibold transition"
                      title="Удалить резерв"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useApp } from '../AppContext';
import { InventoryItem, Client } from '../types';
import { formatCurrency } from '../store';
import { createReservation } from '../reservations';
import {
  X, Clock, CheckCircle2, Save
} from 'lucide-react';

interface Props {
  item: InventoryItem | null;
  onClose: () => void;
}

export function ReservationModal({ item, onClose }: Props) {
  const { clients, createClient, currentUser } = useApp();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '' });
  const [reservedUntil, setReservedUntil] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  if (!item) return null;

  const handleSave = () => {
    if (!selectedClient) {
      alert('Выберите клиента');
      return;
    }
    // Создаём резерв
    createReservation({
      itemId: item.id,
      productName: item.productName,
      shortName: item.shortName,
      batchCode: item.batchCode,
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      clientPhone: selectedClient.phone,
      until: reservedUntil,
      notes,
      managerId: currentUser.id,
      managerName: currentUser.name
    });

    setSaved(true);
    setTimeout(() => {
      onClose();
      location.reload(); // Перезагрузка чтобы обновить статус
    }, 1500);
  };

  const handleCreateClient = () => {
    if (!newClient.name.trim()) return;
    const created = createClient({
      name: newClient.name.trim(),
      phone: newClient.phone.trim() || undefined,
      email: newClient.email.trim() || undefined
    });
    setSelectedClient(created);
    setShowNewClient(false);
    setNewClient({ name: '', phone: '', email: '' });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/50">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base">Резервирование инструмента</h3>
              <p className="text-xs text-stone-500">Товар закрепляется за клиентом на срок</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* Информация о товаре */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900">
            <p className="text-xs text-amber-900 dark:text-amber-200 mb-1">
              📦 <strong>{item.productName}</strong>
            </p>
            <div className="flex items-center gap-2 text-[11px] text-amber-700 dark:text-amber-300">
              <span>Партия: <strong>{item.batchCode}</strong></span>
              <span>·</span>
              <span>ID: <code className="font-mono">{item.id}</code></span>
            </div>
            <p className="text-sm font-display font-bold text-amber-900 dark:text-amber-200 mt-1">
              {formatCurrency(item.retailPrice)}
            </p>
          </div>

          {/* Выбор клиента */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              👤 Клиент (для кого резервируем)
            </label>

            {selectedClient ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{selectedClient.name}</p>
                    {selectedClient.phone && (
                      <p className="text-xs text-stone-500 mt-0.5">{selectedClient.phone}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedClient(null)}
                    className="text-xs text-rose-600 hover:text-rose-700"
                  >
                    Изменить
                  </button>
                </div>
              </div>
            ) : showNewClient ? (
              <div className="space-y-2 p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl">
                <input
                  type="text"
                  value={newClient.name}
                  onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                  placeholder="Имя клиента"
                  className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm"
                />
                <input
                  type="tel"
                  value={newClient.phone}
                  onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                  placeholder="Телефон"
                  className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm"
                />
                <input
                  type="email"
                  value={newClient.email}
                  onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                  placeholder="Email (опционально)"
                  className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateClient}
                    className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                  >
                    ✓ Создать
                  </button>
                  <button
                    onClick={() => setShowNewClient(false)}
                    className="px-3 py-1.5 border border-stone-200 dark:border-stone-700 rounded-lg text-xs"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value=""
                  onChange={e => {
                    if (e.target.value === '__new__') {
                      setShowNewClient(true);
                    } else {
                      const c = clients.find(cl => cl.id === e.target.value);
                      if (c) setSelectedClient(c);
                    }
                  }}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm"
                >
                  <option value="">— Выбрать клиента —</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                  <option value="__new__">+ Создать нового клиента</option>
                </select>
              </div>
            )}
          </div>

          {/* Срок резерва */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              📅 Зарезервировано до
            </label>
            <input
              type="date"
              value={reservedUntil}
              onChange={e => setReservedUntil(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm"
            />
            <p className="text-[10px] text-stone-500 mt-1">
              После этой даты резерв автоматически снимается
            </p>
          </div>

          {/* Заметки */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              💬 Заметка (опционально)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Например: ждёт оплату до пятницы"
              rows={2}
              className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm resize-none"
            />
          </div>

          {/* Информация */}
          <div className="p-3 bg-sky-50 dark:bg-sky-950/30 rounded-xl border border-sky-200 dark:border-sky-900 text-xs text-sky-700 dark:text-sky-300">
            <p>💡 Резервирование не продаёт товар — он остаётся на складе, но помечается как зарезервированный за конкретным клиентом.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex gap-2 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-semibold"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedClient || saved}
            className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-1.5"
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Зарезервировано!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Зарезервировать
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

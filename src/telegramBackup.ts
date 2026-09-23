// Отправка бэкапа базы через Telegram-бот

import { createBackup } from './backup';
import { getTelegramSettings } from './telegram';
import { Shipment, InventoryItem, Sale, Client, User, Supplier } from './types';

const CHUNK_SIZE = 3000; // Telegram лимит ~4096, оставляем запас

export async function sendBackupViaTelegram(
  shipments: Shipment[],
  inventory: InventoryItem[],
  sales: Sale[],
  clients: Client[],
  users: User[],
  suppliers: Supplier[]
): Promise<{ success: boolean; chunksSent: number; error?: string }> {
  const settings = getTelegramSettings();
  if (!settings.botToken || !settings.adminChatId) {
    return { success: false, chunksSent: 0, error: 'Telegram не настроен. Укажите токен и chat ID в Настройках → Telegram-бот.' };
  }

  const backup = createBackup(shipments, inventory, sales, clients, users, suppliers);
  const json = JSON.stringify(backup, null, 2);
  const chunks: string[] = [];

  // Разбиваем на чанки
  for (let i = 0; i < json.length; i += CHUNK_SIZE) {
    chunks.push(json.slice(i, i + CHUNK_SIZE));
  }

  let chunksSent = 0;
  const totalStats = {
    shipments: shipments.length,
    inventory: inventory.length,
    sales: sales.length,
    clients: clients.length,
    suppliers: suppliers.length
  };

  try {
    // Первое сообщение — заголовок
    const headerMessage = `🗄 <b>Бэкап SoundHealing.by</b>\n\n` +
      `📅 ${new Date().toLocaleString('ru-RU')}\n\n` +
      `📊 <b>Статистика:</b>\n` +
      `• Поставки: ${totalStats.shipments}\n` +
      `• Товары: ${totalStats.inventory}\n` +
      `• Продажи: ${totalStats.sales}\n` +
      `• Клиенты: ${totalStats.clients}\n` +
      `• Поставщики: ${totalStats.suppliers}\n\n` +
      `📦 Файл разбит на <b>${chunks.length}</b> частей.\n` +
      `Соберите их в один файл для восстановления.`;

    const headerRes = await fetch(`https://api.telegram.org/bot${settings.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: settings.adminChatId,
        text: headerMessage,
        parse_mode: 'HTML'
      })
    });
    const headerData = await headerRes.json();
    if (!headerData.ok) {
      return { success: false, chunksSent: 0, error: `Telegram: ${headerData.description}` };
    }
    chunksSent++;

    // Отправляем чанки
    for (let i = 0; i < chunks.length; i++) {
      const chunkMessage = `📄 Часть ${i + 1}/${chunks.length} бэкапа\n\n` +
        `<code>${escapeHtml(chunks[i])}</code>`;

      await fetch(`https://api.telegram.org/bot${settings.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: settings.adminChatId,
          text: chunkMessage,
          parse_mode: 'HTML'
        })
      });
      chunksSent++;

      // Небольшая задержка чтобы не упереться в rate limit
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Финальное сообщение
    await fetch(`https://api.telegram.org/bot${settings.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: settings.adminChatId,
        text: '✅ Бэкап отправлен успешно!',
        parse_mode: 'HTML'
      })
    });

    return { success: true, chunksSent };
  } catch (e: any) {
    return { success: false, chunksSent, error: e.message };
  }
}

// Экранирование HTML для Telegram
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

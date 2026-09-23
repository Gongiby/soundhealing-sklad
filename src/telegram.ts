import { TelegramSettings } from './types';
import { STORAGE, formatCurrency, formatDateTime } from './store';
import { Sale } from './types';

// ============= TELEGRAM BOT =============

export function getTelegramSettings(): TelegramSettings {
  return {
    botToken: localStorage.getItem(`${STORAGE.telegram}_token`) || '',
    adminChatId: localStorage.getItem(`${STORAGE.telegram}_chat`) || '',
    notificationsEnabled: localStorage.getItem(`${STORAGE.telegram}_enabled`) === 'true',
    sendReceiptsToClients: localStorage.getItem(`${STORAGE.telegram}_receipts`) === 'true'
  };
}

export function saveTelegramSettings(settings: TelegramSettings) {
  localStorage.setItem(`${STORAGE.telegram}_token`, settings.botToken);
  localStorage.setItem(`${STORAGE.telegram}_chat`, settings.adminChatId);
  localStorage.setItem(`${STORAGE.telegram}_enabled`, String(settings.notificationsEnabled));
  localStorage.setItem(`${STORAGE.telegram}_receipts`, String(settings.sendReceiptsToClients));
}

export async function sendTelegramMessage(botToken: string, chatId: string, message: string): Promise<boolean> {
  if (!botToken || !chatId) {
    console.log('Telegram not configured, message:', message);
    return false;
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
    const data = await response.json();
    return data.ok === true;
  } catch (e) {
    console.error('Telegram error:', e);
    return false;
  }
}

export function formatSaleNotification(sale: Sale): string {
  const items = sale.items
    .map(i => `  • ${i.productName}\n    1 шт × ${formatCurrency(i.unitPrice)} = ${formatCurrency(i.finalPrice)}`)
    .join('\n');

  let msg = `🛒 <b>Новая продажа ${sale.number}</b>\n\n`;
  msg += `<b>Менеджер:</b> ${sale.managerName}\n`;
  msg += `<b>Клиент:</b> ${sale.clientName}\n`;
  if (sale.clientPhone) msg += `<b>Телефон:</b> ${sale.clientPhone}\n`;
  msg += `<b>Время:</b> ${formatDateTime(sale.createdAt)}\n\n`;
  msg += `<b>Позиции:</b>\n${items}\n\n`;

  if (sale.totalDiscountAmount > 0) {
    msg += `Сумма: ${formatCurrency(sale.subtotal)}\n`;
    msg += `Скидка: -${formatCurrency(sale.totalDiscountAmount)} (${sale.totalDiscountPercent}%)\n`;
  }
  msg += `<b>Итого: ${formatCurrency(sale.totalAmount)}</b>\n`;
  msg += `Оплата: ${getPaymentMethodLabel(sale.paymentMethod)}`;

  return msg;
}

export function formatSaleReceipt(sale: Sale): string {
  let msg = `🧾 <b>Чек ${sale.number}</b>\n`;
  msg += `Магазин «SoundHealing.by»\n`;
  msg += `${formatDateTime(sale.createdAt)}\n\n`;

  sale.items.forEach(i => {
    msg += `<b>${i.productName}</b>\n`;
    msg += `  1 шт × ${formatCurrency(i.unitPrice)}`;
    if (i.individualDiscount > 0) {
      msg += ` <s>${formatCurrency(i.unitPrice)}</s>`;
    }
    msg += ` = ${formatCurrency(i.finalPrice)}\n\n`;
  });

  msg += `─────────────────\n`;
  if (sale.totalDiscountAmount > 0) {
    msg += `Сумма: ${formatCurrency(sale.subtotal)}\n`;
    msg += `Скидка: -${formatCurrency(sale.totalDiscountAmount)}\n`;
  }
  msg += `<b>ИТОГО: ${formatCurrency(sale.totalAmount)}</b>\n`;
  msg += `Оплата: ${getPaymentMethodLabel(sale.paymentMethod)} ✅\n\n`;
  msg += `🙏 Спасибо за покупку!\n`;
  msg += `С любовью, команда SoundHealing.by`;

  return msg;
}

export function getPaymentMethodLabel(method: string): string {
  const labels: { [key: string]: string } = {
    cash: 'Наличные',
    card: 'Карта',
    transfer: 'Перевод',
    sbp: 'СБП',
    installment: 'Рассрочка'
  };
  return labels[method] || method;
}

// ============= СИМУЛЯЦИЯ (для демо) =============

// Реальная отправка через Telegram API (если бот настроен)
export async function simulateTelegramNotification(sale: Sale): Promise<void> {
  const settings = getTelegramSettings();
  if (!settings.notificationsEnabled) return;

  // Если токен и chat_id настроены — отправляем реально
  if (settings.botToken && settings.adminChatId) {
    try {
      // Уведомление директору о продаже
      await sendTelegramMessage(
        settings.botToken,
        settings.adminChatId,
        formatSaleNotification(sale)
      );

      // Чек клиенту в Telegram (если у клиента есть telegram_id)
      if (settings.sendReceiptsToClients && sale.clientTelegramId) {
        await sendTelegramMessage(
          settings.botToken,
          sale.clientTelegramId,
          formatSaleReceipt(sale)
        );
      }
    } catch {
      // Тихо игнорируем — не критично
    }
  }
}

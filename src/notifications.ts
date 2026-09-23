// Web Push Notifications — уведомления в браузере
// Работает даже когда Telegram не настроен

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  if (Notification.permission === 'denied') {
    return 'denied';
  }
  return await Notification.requestPermission();
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

export interface PushNotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  onClick?: () => void;
  data?: any;
}

export function showNotification(options: PushNotificationOptions): Notification | null {
  if (!('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;

  const notification = new Notification(options.title, {
    body: options.body,
    icon: options.icon || '/icon.png',
    badge: options.badge,
    tag: options.tag,
    requireInteraction: options.requireInteraction,
    data: options.data
  });

  if (options.onClick) {
    notification.onclick = () => {
      window.focus();
      options.onClick?.();
      notification.close();
    };
  }

  // Автоматически закрыть через 8 секунд
  setTimeout(() => notification.close(), 8000);

  return notification;
}

// Уведомления о событиях в приложении
export const notifications = {
  newSale: (saleInfo: { number: string; amount: number; client: string; manager: string }) => {
    return showNotification({
      title: `🛒 Новая продажа ${saleInfo.number}`,
      body: `${saleInfo.client} · ${saleInfo.amount.toFixed(2)} BYN · ${saleInfo.manager}`,
      tag: 'new-sale',
      onClick: () => {
        // Открываем раздел продаж
        window.location.hash = '#/sales';
      }
    });
  },

  lowStock: (itemInfo: { name: string; stock: number; minStock: number }) => {
    return showNotification({
      title: '⚠️ Заканчивается товар',
      body: `${itemInfo.name} — осталось ${itemInfo.stock} шт. (минимум ${itemInfo.minStock})`,
      tag: 'low-stock',
      requireInteraction: true
    });
  },

  newShipment: (shipmentInfo: { batchCode: string; totalUnits: number }) => {
    return showNotification({
      title: `📦 Новая поставка ${shipmentInfo.batchCode}`,
      body: `Добавлено ${shipmentInfo.totalUnits} единиц товара`,
      tag: 'new-shipment'
    });
  }
};

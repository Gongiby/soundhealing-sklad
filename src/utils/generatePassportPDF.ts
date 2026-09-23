import jsPDF from 'jspdf';

export function generatePassportPDF() {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  // === HELPERS ===
  const addText = (text: string, size: number = 10, style: 'normal' | 'bold' = 'normal', color: number[] = [40, 40, 40]) => {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += size * 0.42;
    });
    y += 2;
  };

  const addHeader = (text: string, level: 1 | 2 | 3 = 1) => {
    if (y > pageHeight - margin - 25) {
      doc.addPage();
      y = margin;
    }

    if (level === 1) {
      doc.setFillColor(180, 83, 9);
      doc.rect(margin - 2, y - 5, maxWidth + 4, 11, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text(text, margin, y + 3);
      y += 14;
    } else if (level === 2) {
      doc.setFillColor(254, 243, 199);
      doc.rect(margin - 2, y - 4, maxWidth + 4, 9, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(180, 83, 9);
      doc.text(text, margin, y + 2);
      y += 11;
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(120, 53, 15);
      doc.text('▶ ' + text, margin, y);
      y += 5;
    }
  };

  const addCode = (code: string) => {
    if (y > pageHeight - margin - 30) {
      doc.addPage();
      y = margin;
    }
    doc.setFillColor(245, 245, 244);
    doc.rect(margin, y, maxWidth, 4, 'F');
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);
    const lines = code.split('\n');
    lines.forEach((line: string) => {
      doc.text(line, margin + 2, y + 3);
      y += 3.5;
    });
    y += 3;
    doc.setFont('helvetica', 'normal');
  };

  const addDivider = () => {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  const addPageFooter = (pageNum: number, total: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `SoundHealing.by · Технический паспорт · Стр. ${pageNum}/${total}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  };

  // === ОБЛОЖКА ===
  doc.setFillColor(180, 83, 9);
  doc.rect(0, 0, pageWidth, 100, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(255, 255, 255);
  doc.text('SoundHealing.by', pageWidth / 2, 40, { align: 'center' });

  doc.setFontSize(14);
  doc.text('Технический паспорт', pageWidth / 2, 55, { align: 'center' });

  doc.setFontSize(11);
  doc.text('Система управления магазином', pageWidth / 2, 70, { align: 'center' });
  doc.text('терапевтических звуковых инструментов', pageWidth / 2, 80, { align: 'center' });

  y = 120;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('Технический паспорт приложения', pageWidth / 2, y, { align: 'center' });
  y += 15;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text('Версия: 1.0', pageWidth / 2, y, { align: 'center' });
  y += 7;
  doc.text(`Дата: ${new Date().toLocaleDateString('ru-RU')}`, pageWidth / 2, y, { align: 'center' });
  y += 20;

  doc.setFillColor(254, 243, 199);
  doc.rect(margin, y, maxWidth, 70, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(120, 53, 15);
  doc.text('Краткое описание:', margin + 5, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  const desc = 'Веб-приложение (PWA) для управления розничным магазином терапевтических звуковых инструментов. Система обеспечивает учёт поставок с мультивалютным расчётом себестоимости, генерацию QR-кодов для каждой единицы товара, печать этикеток 45мм, сканирование через камеру телефона, оформление продаж со скидками, отправку уведомлений директору и чеков клиентам через Telegram-бот, а также формирование аналитических отчётов с экспортом в Excel и PDF.';
  const descLines = doc.splitTextToSize(desc, maxWidth - 10);
  doc.text(descLines, margin + 5, y + 18);

  doc.addPage();
  y = margin;

  // === СОДЕРЖАНИЕ ===
  addHeader('Содержание', 1);
  const toc = [
    '1. Назначение и цели приложения',
    '2. Технологический стек',
    '3. Архитектура приложения',
    '4. Структура файлов и модулей',
    '5. Структура данных (типы и интерфейсы)',
    '6. Описание экранов',
    '7. Описание компонентов',
    '8. Утилиты и сервисы',
    '9. Бизнес-логика (ключевые алгоритмы)',
    '10. Стилизация и темизация',
    '11. Файлы оформления',
    '12. Хранение данных',
    '13. Интеграция с Telegram',
    '14. PWA и мобильная версия',
    '15. Производительность',
    '16. Безопасность',
    '17. Развёртывание',
    '18. Ограничения и TODO'
  ];
  toc.forEach(t => addText(t, 10));
  addDivider();

  // === 1. НАЗНАЧЕНИЕ ===
  addHeader('1. Назначение и цели приложения', 1);

  addText('SoundHealing.by — внутренняя система управления для розничного магазина терапевтических звуковых инструментов (глюкофоны, чакрофоны, поющие чаши, гонги, космограммы, шейкеры, rainstick-и, камертоны и др.).');

  addHeader('Целевая аудитория', 2);
  addText('• Директор магазина (полный доступ ко всем функциям, включая себестоимость и отчёты)');
  addText('• Менеджеры по продажам (только оформление продаж, без доступа к закупочным ценам)');

  addHeader('Решаемые проблемы', 2);

  const problems = [
    'Товары продаются по одинаковым розничным ценам, но приходят в разных поставках с разной себестоимостью (из-за колебаний курса валют, изменения цен поставщиком). Нужно точно знать маржу по каждой партии.',
    'Учёт количества — один и тот же инструмент может прийти в 5 поставках по 10 штук. Менеджер должен видеть какие именно продаются.',
    'Менеджеры работают удалённо и в шоуруме — нужна общая база с быстрым доступом с телефона.',
    'Директору нужны уведомления о каждой продаже в реальном времени.',
    'Печать этикеток должна быть простой — пришёл товар → сразу наклеил QR → продаётся.',
    'Клиенты хотят получать чеки в мессенджер, а не на бумаге.',
    'Отчёты нужны и в Excel (для работы), и в PDF (для печати).'
  ];
  problems.forEach(p => addText('• ' + p, 10));
  addDivider();

  // === 2. ТЕХНОЛОГИЧЕСКИЙ СТЕК ===
  addHeader('2. Технологический стек', 1);

  addHeader('Основные технологии', 2);
  const tech = [
    ['React', '19.2.6', 'UI-фреймворк'],
    ['TypeScript', '5.9.3', 'Типизация'],
    ['Vite', '7.3.2', 'Сборщик и dev-сервер'],
    ['Tailwind CSS', '4.1.17', 'Утилитарный CSS-фреймворк'],
    ['lucide-react', '1.45.0', 'Иконки (SVG)'],
    ['recharts', '3.10.1', 'Графики (импортирована, но не используется в финальной версии)']
  ];
  tech.forEach(([name, ver, desc]) => {
    addText(`${name} ${ver} — ${desc}`, 10);
  });
  y += 2;

  addHeader('Дополнительные библиотеки', 2);
  const libs = [
    ['qrcode', 'генерация QR-кодов в браузере'],
    ['jspdf', 'создание PDF-документов (этикетки, отчёты, чеки)'],
    ['jspdf-autotable', 'таблицы в PDF'],
    ['exceljs', 'создание XLSX-файлов'],
    ['html5-qrcode', 'сканирование QR через камеру']
  ];
  libs.forEach(([name, desc]) => {
    addText(`${name} — ${desc}`, 10);
  });
  y += 2;

  addHeader('Бесплатный стек', 2);
  addText('Все используемые технологии и сервисы полностью бесплатны:');
  y += 2;
  addText('• Хостинг: Vercel / Netlify / Cloudflare Pages (бесплатно до 100k запросов/мес)');
  addText('• База данных: localStorage в браузере (без бэкенда)');
  addText('• Telegram-бот: Telegram Bot API (бесплатно)');
  addText('• Домен: поддомен app.soundhealing.by (если уже есть основной)');
  y += 2;
  addText('Общая стоимость: 0 BYN в месяц.', 10, 'bold', [180, 83, 9]);
  addDivider();

  // === 3. АРХИТЕКТУРА ===
  addHeader('3. Архитектура приложения', 1);

  addText('Приложение построено на компонентной архитектуре React с глобальным состоянием через Context API. Вся бизнес-логика хранится в едином AppContext, который оборачивает всё приложение через Provider в main.tsx.');

  addHeader('Иерархия компонентов', 2);
  addCode(`main.tsx
  └── <AppProvider>          // Глобальный контекст с состоянием
      └── <App>               // Корневой компонент с маршрутизацией
          ├── <Header />      // Шапка (на мобильном) / Sidebar (на десктопе)
          ├── <main>
          │   ├── <Dashboard />    // Главный экран
          │   ├── <Scanner />      // Сканер + корзина
          │   ├── <Inventory />    // Склад
          │   ├── <Shipments />    // Поставки + NewShipmentForm
          │   ├── <Sales />        // Продажи + DraftSaleModal
          │   ├── <Reports />      // 5 типов отчётов
          │   └── <Settings />     // Telegram + роли
          ├── <ProductDetailModal />  // Модальное окно товара
          ├── <LiveOrdersModal />     // Лента заказов (в разработке)
          └── <NewBatchModal />      // Создание варки (в разработке)`);

  addHeader('Поток данных', 2);
  addText('1. Все данные хранятся в AppContext (React useState)');
  addText('2. При изменениях автоматически сохраняются в localStorage через useEffect');
  addText('3. Компоненты получают данные через хук useApp()');
  addText('4. Изменения вносятся через методы контекста (createShipment, createSale и т.д.)');
  addText('5. Методы сразу обновляют state и localStorage синхронно');
  y += 2;

  addHeader('Маршрутизация', 2);
  addText('Используется простая state-based маршрутизация через переменную tab в App.tsx. Никакого react-router — переключение экранов мгновенное, без анимаций.');
  y += 2;
  addText('Дополнительно: при URL вида #/scan/ITEM_ID показывается публичная карточка товара (для клиентов, сканирующих QR без логина в системе).');
  addDivider();

  // === 4. СТРУКТУРА ФАЙЛОВ ===
  addHeader('4. Структура файлов и модулей', 1);

  addHeader('Корневая структура', 2);
  addCode(`soundhealing.by/
├── index.html              # HTML-точка входа + meta + блокировка swipe-back
├── package.json            # Зависимости
├── vite.config.ts          # Конфиг сборщика
├── tsconfig.json           # Конфиг TypeScript
├── tailwind.config.js      # (опционально)
├── src/
│   ├── main.tsx           # Точка входа React
│   ├── App.tsx            # Корневой компонент
│   ├── AppContext.tsx     # Глобальный контекст состояния
│   ├── index.css          # Глобальные стили + анимации
│   ├── types.ts           # Все TypeScript-типы и интерфейсы
│   ├── store.ts           # Утилиты + дефолтные данные
│   ├── seedData.ts        # Генерация демо-данных
│   ├── telegram.ts        # Интеграция с Telegram-ботом
│   ├── exports.ts         # Экспорт в Excel и PDF
│   ├── labels.ts          # Генерация QR-этикеток
│   ├── components/        # Переиспользуемые компоненты
│   │   ├── ProductDetailModal.tsx
│   │   └── PublicProductView.tsx
│   ├── screens/           # Экраны приложения
│   │   ├── Dashboard.tsx
│   │   ├── Scanner.tsx
│   │   ├── Inventory.tsx
│   │   ├── Shipments.tsx
│   │   ├── Sales.tsx
│   │   ├── Reports.tsx
│   │   └── Settings.tsx
│   ├── utils/
│   │   ├── generateGuidePDF.ts
│   │   └── generatePassportPDF.ts
│   └── data/
│       └── mockData.ts    # (резерв для будущих данных)
└── dist/                  # Сборка после vite build`);

  addHeader('Краткое описание ключевых файлов', 2);

  const files = [
    ['index.html', 'HTML-оболочка + блокировка back-swipe через JS'],
    ['src/main.tsx', 'Точка входа React, оборачивает App в AppProvider'],
    ['src/App.tsx', 'Корневой компонент: маршрутизация, sidebar/bottom-nav, модальные окна'],
    ['src/AppContext.tsx', 'Глобальное состояние (state) + методы изменения + автосохранение в localStorage'],
    ['src/types.ts', 'Все TypeScript-интерфейсы: Shipment, InventoryItem, Sale, Client, User, Supplier, TelegramSettings'],
    ['src/store.ts', 'Утилиты: formatCurrency, formatDate, generateItemId, formatBatchCode, дефолтные данные пользователей и поставщиков'],
    ['src/seedData.ts', 'Генерация 3 демо-поставок с реалистичными инструментами и ценами'],
    ['src/telegram.ts', 'Интеграция с Telegram Bot API: sendTelegramMessage, formatSaleNotification, formatSaleReceipt, simulateTelegramNotification'],
    ['src/exports.ts', 'Экспорт отчётов: exportSalesToExcel, exportSalesToPDF, exportInventoryToExcel, exportShipmentReport, exportReceiptPDF'],
    ['src/labels.ts', 'Генерация QR-этикеток 45мм: generateLabelQR, generateLabelsPDF, generateSingleLabelPDF, generateLabelDataURL'],
    ['src/components/ProductDetailModal.tsx', 'Модальное окно с подробной информацией о товаре'],
    ['src/components/PublicProductView.tsx', 'Публичная карточка товара для клиентов (без логина)'],
    ['src/screens/Dashboard.tsx', 'Главный экран с KPI и быстрыми действиями'],
    ['src/screens/Scanner.tsx', 'Сканер QR + корзина + оформление продажи (основной экран менеджера)'],
    ['src/screens/Inventory.tsx', 'Склад с фильтрами, поиском, массовой печатью этикеток'],
    ['src/screens/Shipments.tsx', 'Управление поставками + форма создания поставки + создание поставщиков'],
    ['src/screens/Sales.tsx', 'История продаж + черновик новой продажи (мини-сканер)'],
    ['src/screens/Reports.tsx', '5 типов аналитических отчётов для директора'],
    ['src/screens/Settings.tsx', 'Настройки Telegram-бота, переключение ролей, сброс данных'],
    ['src/utils/generateGuidePDF.ts', 'Генерация руководства пользователя в PDF'],
    ['src/utils/generatePassportPDF.ts', 'Генерация технического паспорта (этот документ)']
  ];

  files.forEach(([name, desc]) => {
    addText(`${name}`, 10, 'bold', [180, 83, 9]);
    addText(desc, 9, 'normal', [80, 80, 80]);
    y += 1;
  });

  addDivider();

  // === 5. СТРУКТУРА ДАННЫХ ===
  addHeader('5. Структура данных (типы и интерфейсы)', 1);

  addText('Все данные типизированы в src/types.ts. Ниже полная схема:');

  addHeader('User (Пользователь)', 2);
  addCode(`interface User {
  id: string;          // 'u-1', 'u-2'...
  name: string;        // 'Ольга (директор)', 'Аня Петрова'...
  role: UserRole;      // 'admin' | 'manager'
  telegramId?: string; // для привязки к Telegram
  avatar?: string;
}`);

  addHeader('Supplier (Поставщик)', 2);
  addCode(`interface Supplier {
  id: string;       // 's-1', 's-new-${Date.now()}'
  name: string;     // 'Nepal Crafts Import'
  country: string;  // 'Непал'
  contact: string;  // '+977-1-4223456'
}`);

  addHeader('Shipment (Поставка)', 2);
  addCode(`interface Shipment {
  id: string;                       // 'ship-${Date.now()}'
  batchCode: string;                // '092026' (месяц + год)
  supplierId: string;
  date: string;                     // ISO дата
  totalLogistics: number;           // общая логистика в валюте
  totalCustoms: number;             // общая таможня в валюте
  logisticsCurrency: Currency;      // валюта логистики
  customsCurrency: Currency;        // валюта таможни
  exchangeRates: {                  // ЗАМОРОЖЕННЫЕ курсы к BYN
    BYN?: number;
    RUB?: number;
    USD?: number;
    EUR?: number;
    CNY?: number;
  };
  items: ShipmentItem[];            // позиции в поставке
  notes?: string;
  createdAt: string;
}`);

  addHeader('ShipmentItem (Позиция в поставке)', 2);
  addCode(`interface ShipmentItem {
  id: string;
  productName: string;              // полное название
  shortName: string;                // короткое (для этикетки)
  category: string;                 // 'Глюкофон' / 'Другой инструмент'
  quantity: number;                 // сколько единиц пришло
  purchaseCurrency: Currency;
  purchasePricePerUnit: number;     // цена закупки за ед. в валюте
  logisticsPerUnit: number;         // распределённая логистика
  customsPerUnit: number;           // распределённая таможня
  retailPrice: number;              // цена продажи в BYN
  notes?: string;
  createdItemIds: string[];         // ID созданных InventoryItem
}`);

  addHeader('InventoryItem (Конкретная единица на складе)', 2);
  addCode(`interface InventoryItem {
  id: string;                  // 'GF-22-F-001' (уникальный)
  shipmentId: string;
  batchCode: string;           // '092026'
  productName: string;         // полное название
  shortName: string;           // короткое
  category: string;
  status: ItemStatus;          // 'in_stock' | 'reserved' | 'sold' | 'in_transit'
  purchaseCurrency: Currency;
  purchasePriceOriginal: number;
  costPriceBYN: number;        // ЗАФИКСИРОВАННАЯ себестоимость в BYN
  retailPrice: number;
  reservedFor?: string;
  reservedAt?: string;
  soldAt?: string;
  saleId?: string;
  notes?: string;
  photoUrl?: string;
  createdAt: string;
}`);

  addHeader('Client (Клиент)', 2);
  addCode(`interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  telegramId?: string;
  city?: string;
  createdAt: string;
  totalPurchases: number;      // накопленная сумма покупок
  notes?: string;
}`);

  addHeader('Sale (Продажа/Чек)', 2);
  addCode(`interface Sale {
  id: string;
  number: string;              // '#1001' (человекочитаемый)
  managerId: string;
  managerName: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  clientTelegramId?: string;
  items: SaleItem[];
  subtotal: number;
  totalDiscountAmount: number;
  totalDiscountPercent: number;
  totalAmount: number;
  paymentMethod: PaymentMethod; // 'cash' | 'card' | 'transfer' | 'sbp' | 'installment'
  globalDiscount: number;       // общая скидка на чек
  notes?: string;
  sentToTelegram: boolean;
  createdAt: string;
}`);

  addHeader('SaleItem (Позиция в чеке)', 2);
  addCode(`interface SaleItem {
  itemId: string;
  productName: string;
  batchCode: string;
  unitPrice: number;           // цена за единицу
  quantity: number;            // сколько штук продали
  individualDiscount: number;  // скидка на позицию (%)
  finalPrice: number;          // итого: unitPrice × quantity × (1-discount)
}`);

  addHeader('TelegramSettings', 2);
  addCode(`interface TelegramSettings {
  botToken: string;            // от @BotFather
  adminChatId: string;         // куда слать уведомления
  notificationsEnabled: boolean;
  sendReceiptsToClients: boolean;
}`);

  addHeader('Вспомогательные типы', 2);
  addCode(`type UserRole = 'admin' | 'manager';
type Currency = 'BYN' | 'RUB' | 'USD' | 'EUR' | 'CNY';
type ItemStatus = 'in_stock' | 'reserved' | 'sold' | 'in_transit';
type PaymentMethod = 'cash' | 'card' | 'transfer' | 'sbp' | 'installment';`);

  addDivider();

  // === 6. ЭКРАНЫ ===
  addHeader('6. Описание экранов', 1);

  const screens = [
    {
      name: 'Dashboard (Дашборд)',
      file: 'src/screens/Dashboard.tsx',
      access: 'admin + manager',
      description: 'Главный экран приложения. Показывает:',
      features: [
        'KPI-карточки: в наличии, выручка, прибыль, средний чек',
        'Быстрые действия (кнопки перехода в сканер, склад, поставки, продажи)',
        '5 последних продаж с датой, клиентом, суммой',
        'Топ-5 категорий по выручке',
        'Маржинальность поставок (только для админа)'
      ]
    },
    {
      name: 'Scanner (Сканер)',
      file: 'src/screens/Scanner.tsx',
      access: 'admin + manager',
      description: 'Основной рабочий экран менеджера. Полный цикл продажи:',
      features: [
        'Камера с автодетекцией QR через BarcodeDetector API',
        'Ручной ввод ID (fallback если камера не работает)',
        'Поиск по каталогу',
        'Корзина с индивидуальной скидкой (input + кнопки ±5%)',
        'Количество товаров (input 1-99)',
        'Общая скидка на чек (input)',
        'Выбор/создание клиента',
        'Способ оплаты (наличные/карта/перевод/СБП)',
        'Автоматическая отправка чека в Telegram клиенту',
        'Уведомление директору в Telegram'
      ]
    },
    {
      name: 'Inventory (Склад)',
      file: 'src/screens/Inventory.tsx',
      access: 'admin + manager',
      description: 'Список всех единиц инструментов с возможностями:',
      features: [
        'Фильтр по статусу: в наличии / проданы / резерв',
        'Фильтр по партии',
        'Полнотекстовый поиск',
        'Массовое выделение чекбоксами',
        'Печать этикеток для выбранных позиций',
        'Печать ВСЕЙ партии одной кнопкой',
        'Клик на позицию → модалка с деталями и кнопкой печати'
      ]
    },
    {
      name: 'Shipments (Поставки)',
      file: 'src/screens/Shipments.tsx',
      access: 'только admin',
      description: 'Управление поставками с формой создания:',
      features: [
        'Список всех поставок с раскрытием деталей',
        'Создание поставки с 4 секциями (см. руководство)',
        'Создание поставщика прямо в форме',
        'Печать этикеток по позициям или всей партии',
        'Экспорт поставки в Excel',
        'Автогенерация уникальных ID для каждой единицы'
      ]
    },
    {
      name: 'Sales (Продажи)',
      file: 'src/screens/Sales.tsx',
      access: 'admin + manager',
      description: 'История + создание новых продаж:',
      features: [
        'Список всех чеков с фильтрами (по менеджеру, периоду)',
        'Поиск по чеку/клиенту/товару',
        'Экспорт в Excel и PDF',
        'Кнопка "+ Новая продажа" открывает мини-сканер прямо в этом экране',
        'Детальный просмотр чека в модалке'
      ]
    },
    {
      name: 'Reports (Отчёты)',
      file: 'src/screens/Reports.tsx',
      access: 'только admin',
      description: '5 типов аналитики:',
      features: [
        'Поставки — таблица с маржинальностью каждой партии',
        'Менеджеры — рейтинг продаж каждого сотрудника',
        'Периоды — помесячная динамика',
        'Залежи — что лежит >30 дней и съедает деньги',
        'Деньги — общий P&L отчёт'
      ]
    },
    {
      name: 'Settings (Настройки)',
      file: 'src/screens/Settings.tsx',
      access: 'только admin',
      description: 'Настройки системы:',
      features: [
        'Telegram-бот: токен, chat ID, галочки, кнопка "Тест"',
        'Список пользователей для переключения роли',
        'Сброс данных (опасная зона)',
        'Скачать руководство в PDF',
        'Скачать технический паспорт в PDF'
      ]
    }
  ];

  screens.forEach(s => {
    addHeader(s.name, 2);
    addText(`Файл: ${s.file}`, 9, 'normal', [100, 100, 100]);
    addText(`Доступ: ${s.access}`, 9, 'normal', [100, 100, 100]);
    addText(s.description, 10);
    s.features.forEach(f => addText('• ' + f, 10));
    y += 4;
  });

  addDivider();

  // === 7. КОМПОНЕНТЫ ===
  addHeader('7. Описание компонентов', 1);

  const components = [
    {
      name: 'ProductDetailModal',
      file: 'src/components/ProductDetailModal.tsx',
      props: 'item: InventoryItem, onClose: () => void, isAdmin: boolean',
      description: 'Модальное окно с подробной информацией о товаре. Показывает разную информацию для админа и менеджера (маржа скрыта от менеджера на уровне пропсов).'
    },
    {
      name: 'PublicProductView',
      file: 'src/components/PublicProductView.tsx',
      props: 'item: InventoryItem',
      description: 'Публичная карточка товара для клиентов. Показывается когда клиент сканирует QR без логина в системе (URL #/scan/ID). Красивый градиентный дизайн с анимацией звуковых волн.'
    }
  ];

  components.forEach(c => {
    addHeader(c.name, 2);
    addText(`Файл: ${c.file}`, 9, 'normal', [100, 100, 100]);
    addText(`Props: ${c.props}`, 9, 'normal', [100, 100, 100]);
    addText(c.description, 10);
    y += 3;
  });

  addDivider();

  // === 8. УТИЛИТЫ ===
  addHeader('8. Утилиты и сервисы', 1);

  addHeader('src/store.ts', 2);
  addText('Утилиты общего назначения:');
  y += 2;
  const storeUtils = [
    'generateBatchCode(date) — генерирует код партии вида "092026"',
    'parseBatchCode(code) — обратная операция, парсит в {month, year}',
    'generateItemId(category, productName, index) — генерирует ID вида "GF-22-F-001"',
    'formatCurrency(amount, currency) — форматирует деньги в BYN/RUB/USD/EUR/CNY',
    'formatNumber(amount) — форматирует числа с разделителями',
    'formatDate(date) — дата в формате DD.MM.YYYY',
    'formatDateTime(date) — дата + время',
    'loadFromStorage<T>(key, default) — загрузка из localStorage с fallback',
    'saveToStorage<T>(key, value) — сохранение в localStorage',
    'STORAGE — объект с ключами localStorage'
  ];
  storeUtils.forEach(u => addText('• ' + u, 9));
  y += 3;

  addHeader('src/telegram.ts', 2);
  addText('Интеграция с Telegram Bot API:');
  y += 2;
  const telegramUtils = [
    'getTelegramSettings() — читает настройки из localStorage',
    'saveTelegramSettings(settings) — сохраняет настройки',
    'sendTelegramMessage(botToken, chatId, message) — реальная отправка через fetch',
    'formatSaleNotification(sale) — форматирует уведомление директору',
    'formatSaleReceipt(sale) — форматирует чек для клиента',
    'simulateTelegramNotification(sale) — имитация для демо (выводит в console)',
    'getPaymentMethodLabel(method) — перевод способа оплаты'
  ];
  telegramUtils.forEach(u => addText('• ' + u, 9));
  y += 3;

  addHeader('src/exports.ts', 2);
  addText('Экспорт в Excel и PDF:');
  y += 2;
  const exportUtils = [
    'exportSalesToExcel(sales, filename) — все продажи в XLSX с форматированием',
    'exportInventoryToExcel(items, filename) — склад в XLSX',
    'exportShipmentReport(shipment, filename) — детальный отчёт по поставке',
    'exportSalesToPDF(sales, filename) — продажи в PDF (альбомная ориентация)',
    'exportInventoryToPDF(items, filename) — склад в PDF',
    'exportReceiptPDF(sale, filename) — узкий PDF для чековой ленты (80мм)',
    'downloadBlob(blob, filename) — утилита скачивания файла'
  ];
  exportUtils.forEach(u => addText('• ' + u, 9));
  y += 3;

  addHeader('src/labels.ts', 2);
  addText('Генерация QR-этикеток:');
  y += 2;
  const labelUtils = [
    'generateLabelQR(itemId, baseUrl) — возвращает QR как Data URL',
    'generateLabelsPDF(items, baseUrl, filename) — много этикеток на A4',
    'generateSingleLabelPDF(item, baseUrl, filename) — одна этикетка PDF 45×35мм',
    'generateLabelDataURL(item, baseUrl) — Data URL для превью',
    'Использует jspdf для генерации PDF',
    'Использует qrcode для генерации QR-кодов'
  ];
  labelUtils.forEach(u => addText('• ' + u, 9));
  y += 3;

  addDivider();

  // === 9. БИЗНЕС-ЛОГИКА ===
  addHeader('9. Бизнес-логика (ключевые алгоритмы)', 1);

  addHeader('Алгоритм создания поставки', 2);
  addCode(`1. Пользователь заполняет форму (см. руководство)
2. Нажимает "Создать"
3. AppContext.createShipment(data) выполняет:
   a. Генерирует уникальный ID партии
   b. Генерирует batchCode из даты ('092026')
   c. Для КАЖДОЙ позиции и КАЖДОЙ единицы:
      - Создаёт InventoryItem с уникальным ID
      - Считает себестоимость: 
        costBYN = (purchasePrice + logisticsPerUnit + customsPerUnit) 
                   × exchangeRate[currency]
      - Присваивает статус 'in_stock'
4. Добавляет Shipment в массив shipments
5. Добавляет все InventoryItem в массив inventory
6. useEffect автоматически сохраняет оба массива в localStorage`);

  addHeader('Алгоритм оформления продажи', 2);
  addCode(`1. Менеджер сканирует QR (камера) или вводит ID вручную
2. Система ищет InventoryItem по ID
3. Если найден и статус 'in_stock':
   - Добавляет в cart с quantity=1, individualDiscount=0
   - Телефон вибрирует (если поддерживается)
4. Менеджер может:
   - Изменить quantity (1-99)
   - Изменить individualDiscount (0-100%)
   - Применить общую скидку на чек (globalDiscount)
5. На этапе Checkout:
   - Выбирает клиента (из базы или создаёт нового)
   - Выбирает способ оплаты
6. При подтверждении AppContext.createSale() выполняет:
   a. Считает суммы с учётом скидок
   b. Создаёт объект Sale с уникальным номером (#1001, #1002...)
   c. Меняет статус всех InventoryItem в чеке на 'sold'
   d. Обновляет totalPurchases у клиента
   e. Отправляет уведомление в Telegram (симуляция)
   f. Отправляет чек клиенту (если включено)
   g. useEffect сохраняет всё в localStorage`);

  addHeader('Алгоритм расчёта маржинальности поставки', 2);
  addCode(`Для каждой поставки:
- totalUnits = количество InventoryItem в поставке
- soldUnits = количество со статусом 'sold'
- revenue = сумма retailPrice проданных
- cost = сумма costPriceBYN всех единиц
- profit = сумма (retailPrice - costPriceBYN) проданных
- margin = profit / revenue × 100%

Цветовая маркировка:
- margin > 40% → зелёный (отлично)
- margin 20-40% → жёлтый (норма)
- margin < 20% → красный (проблема)`);

  addHeader('Алгоритм генерации уникального ID товара', 2);
  addCode(`format: {PREFIX}-{SIZE}-{NOTE}-{INDEX}

PREFIX — код категории:
  Глюкофон → GF
  Чакрофон → CF
  Поющая чаша → TB
  Гонг → GNG
  Шейкер → SHK
  Космограмма → COS
  Тибетская чаша → TTB
  Rainstick → RS
  Диффузор → DIF
  Камертон → TUN
  Колокольчик → BLL
  Барабан → DRM

SIZE — извлекается из названия (число + см/мл)
NOTE — нота извлекается из названия (A-G#)
INDEX — глобальный счётчик (001, 002, 003...)

Пример: GF-22-F-001 (Глюкофон 22см нота F, единица №1)`);

  addHeader('Алгоритм заморозки курсов валют', 2);
  addCode(`При создании поставки:
- Пользователь вводит курсы: USD=3.48, EUR=3.62, RUB=0.038...
- Эти курсы сохраняются в Shipment.exchangeRates

При создании InventoryItem:
- costPriceBYN = originalCost × exchangeRate[originalCurrency]
- Эта цифра ЗАФИКСИРОВАНА в объекте InventoryItem
- Если завтра курс USD станет 3.70, старые товары останутся с 3.48

Это обеспечивает честную маржу — считаем по тому курсу, 
по которому реально покупали.`);

  addHeader('Алгоритм скрытия маржи от менеджера', 2);
  addText('Маржа НЕ скрывается через CSS или условный рендер — её просто НЕТ в данных, которые приходят менеджеру.');
  y += 2;
  addCode(`// В ProductDetailModal:
const margin = isAdmin 
  ? ((item.retailPrice - item.costPriceBYN) / item.retailPrice) * 100
  : null;

const profit = isAdmin 
  ? item.retailPrice - item.costPriceBYN 
  : null;

// В JSX:
{isAdmin && (
  <div>Маржа: {margin}%</div>
)}`);

  addText('Даже если менеджер посмотрит в код или localStorage, маржа высчитывается ТОЛЬКО в момент запроса для админа.');

  addDivider();

  // === 10. СТИЛИЗАЦИЯ ===
  addHeader('10. Стилизация и темизация', 1);

  addHeader('Подход к стилям', 2);
  addText('Используется Tailwind CSS 4 (utility-first). Никаких отдельных CSS-файлов для компонентов — все стили через className.');

  addHeader('Цветовая палитра', 2);
  addText('Основные цвета (амбер/янтарь + стоун):');
  y += 2;
  const colors = [
    ['amber-50/100/200', 'фоны, лёгкие акценты'],
    ['amber-500/600/700', 'основные кнопки, иконки, акценты'],
    ['amber-900', 'тёмный текст на янтарном фоне'],
    ['stone-50/100/200', 'нейтральные фоны'],
    ['stone-700/800/900', 'тёмные тексты'],
    ['stone-950', 'фон тёмной темы'],
    ['emerald-500/600', 'успех, "в наличии"'],
    ['rose-500/600', 'ошибка, удаление'],
    ['sky-500/600', 'информация, Telegram']
  ];
  colors.forEach(([c, desc]) => addText(`• ${c} — ${desc}`, 9));

  addHeader('Типографика', 2);
  addText('Два шрифта:');
  y += 2;
  addText('• Inter (300-800) — основной текст, цифры');
  addText('• Manrope (400-800) — заголовки (font-display класс)');
  y += 2;
  addText('Оба подключены через Google Fonts в index.html.');

  addHeader('Темы', 2);
  addText('Два режима: светлая и тёмная. Управляются через класс .dark на <html>:');
  y += 2;
  addCode(`// src/index.css
body { @apply bg-stone-50 text-stone-900; }
body.dark { @apply bg-stone-950 text-stone-100; }

// App.tsx / useEffect
useEffect(() => {
  darkMode 
    ? document.documentElement.classList.add('dark')
    : document.documentElement.classList.remove('dark');
}, [darkMode]);`);

  addText('Все компоненты используют классы вида bg-white dark:bg-stone-900 — автопереключение.');

  addHeader('Анимации', 2);
  addCode(`// src/index.css
@keyframes pulse-ring { /* пульсация */ }
@keyframes sound-wave { /* звуковые волны */ }
@keyframes scan-line { /* линия сканера */ }
@keyframes shimmer { /* загрузка */ }

.pulse-ring { animation: pulse-ring 2s infinite; }
.sound-wave { animation: sound-wave 1.2s infinite; }
.scan-line { animation: scan-line 2s infinite; }`);

  addHeader('Плавные переходы', 2);
  addCode(`// src/index.css
body, div, nav, aside, section, header, footer, button, input, select, textarea {
  transition-property: background-color, border-color, color, fill, stroke;
  transition-duration: 180ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}`);

  addDivider();

  // === 11. ФАЙЛЫ ОФОРМЛЕНИЯ ===
  addHeader('11. Файлы оформления', 1);

  addText('Основной файл стилей: src/index.css');

  addHeader('index.html (HTML-разметка)', 2);
  addCode(`<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#0c0a09" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,..." />
    <title>SoundHealing.by — Система управления магазином</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    <script>
      // Предотвращаем back-swipe и pull-to-refresh
      document.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) return;
      }, { passive: true });

      // Блокируем горизонтальный overscroll (свайп назад)
      let lastTouchX = 0;
      document.addEventListener('touchstart', function(e) {
        lastTouchX = e.touches[0].clientX;
      }, { passive: true });
      document.addEventListener('touchmove', function(e) {
        const touchX = e.touches[0].clientX;
        const diffX = lastTouchX - touchX;
        const isLeftEdge = lastTouchX < 30;
        if (isLeftEdge && diffX > 0) {
          e.preventDefault();
        }
        lastTouchX = touchX;
      }, { passive: false });

      // Блокируем context menu на долгом тапе
      document.addEventListener('contextmenu', function(e) {
        if (e.target.closest('.no-context-menu')) {
          e.preventDefault();
        }
      });
    </script>
  </body>
</html>`);

  addHeader('src/index.css (стили + анимации)', 2);
  addCode(`@import "tailwindcss";

@layer base {
  :root {
    --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
    --font-display: 'Manrope', system-ui, -apple-system, sans-serif;
  }

  * {
    -webkit-tap-highlight-color: transparent;
  }

  /* Отключаем swipe-back в мобильном браузере при выделении текста */
  html, body {
    overscroll-behavior-x: none;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
    overflow-x: hidden;
  }

  /* Отключаем pull-to-refresh и навигацию жестами */
  body {
    overscroll-behavior-y: contain;
  }

  body {
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    @apply bg-stone-50 text-stone-900;
  }

  body.dark {
    @apply bg-stone-950 text-stone-100;
  }

  /* Hide scrollbar but allow scroll */
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: rgba(180, 83, 9, 0.3);
    border-radius: 9999px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(180, 83, 9, 0.5);
  }

  /* Smooth transitions for theme */
  body, div, nav, aside, section, header, footer, button, input, select, textarea {
    transition-property: background-color, border-color, color, fill, stroke;
    transition-duration: 180ms;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Display font */
  .font-display {
    font-family: var(--font-display);
  }
}

/* Custom animations */
@keyframes pulse-ring {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.5); }
  70% { transform: scale(1); box-shadow: 0 0 0 15px rgba(217, 119, 6, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(217, 119, 6, 0); }
}

.pulse-ring {
  animation: pulse-ring 2s infinite;
}

@keyframes sound-wave {
  0%, 100% { transform: scaleY(0.4); }
  50% { transform: scaleY(1); }
}

.sound-wave {
  animation: sound-wave 1.2s ease-in-out infinite;
  transform-origin: bottom;
}

@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

.shimmer {
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}

/* Mobile camera frame */
.camera-frame {
  position: relative;
  overflow: hidden;
}
.camera-frame::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 70%;
  height: 35%;
  border: 2px solid #d97706;
  border-radius: 12px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

@keyframes scan-line {
  0% { top: 30%; }
  50% { top: 65%; }
  100% { top: 30%; }
}

.scan-line {
  animation: scan-line 2s ease-in-out infinite;
}`);

  addDivider();

  // === 12. ХРАНЕНИЕ ДАННЫХ ===
  addHeader('12. Хранение данных', 1);

  addText('Все данные хранятся в localStorage браузера. Никакого сервера нет.');

  addHeader('Ключи localStorage', 2);
  addCode(`sh_shipments       // массив Shipment[]
sh_inventory       // массив InventoryItem[]
sh_sales           // массив Sale[]
sh_clients         // массив Client[]
sh_users           // массив User[]
sh_suppliers       // массив Supplier[]
sh_currentUser     // ID текущего пользователя
sh_darkMode        // boolean
sh_telegram_token  // токен бота
sh_telegram_chat   // chat ID админа
sh_telegram_enabled    // notifications включены?
sh_telegram_receipts   // отправлять чеки клиентам?`);

  addHeader('Ограничения', 2);
  addText('• Лимит localStorage: ~5-10 МБ на домен');
  addText('• Данные НЕ синхронизируются между устройствами');
  addText('• При очистке кэша браузера данные теряются');
  addText('• Нет бэкапа — для реального использования нужна серверная БД');

  addHeader('Синхронизация между вкладками', 2);
  addText('Каждая вкладка использует СВОЙ экземпляр state. Изменения в одной вкладке НЕ появляются автоматически в другой. Для синхронизации можно добавить storage event listener (в разработке).');

  addDivider();

  // === 13. TELEGRAM ===
  addHeader('13. Интеграция с Telegram', 1);

  addHeader('Настройка бота', 2);
  addText('1. Открыть @BotFather в Telegram');
  addText('2. Команда /newbot');
  addText('3. Следовать инструкциям, получить токен вида "1234567890:ABC..."');
  addText('4. Узнать свой Chat ID через @userinfobot');
  addText('5. Вставить токен и Chat ID в Настройки приложения');
  addText('6. Нажать кнопку "Тест" — должно прийти сообщение');

  addHeader('Реальная отправка (sendTelegramMessage)', 2);
  addCode(`async function sendTelegramMessage(botToken, chatId, message) {
  const response = await fetch(
    \`https://api.telegram.org/bot\${botToken}/sendMessage\`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    }
  );
  const data = await response.json();
  return data.ok === true;
}`);

  addHeader('Формат уведомления директору', 2);
  addCode(`🛒 Новая продажа #1024

Менеджер: Аня Петрова
Клиент: Иванов Иван
Телефон: +375291234567
Время: 13.09.2026, 14:35

Позиции:
  • Глюкофон «Лотос» 22см F
    1 шт × 290 BYN = 290 BYN
  • Поющая чаша бронза 14см
    1 шт × 110 BYN = 110 BYN

Сумма: 400 BYN
Скидка: -40 BYN (10%)
ИТОГО: 360 BYN
Оплата: Карта`);

  addHeader('Формат чека клиенту', 2);
  addCode(`🧾 Чек #1024
Магазин «SoundHealing.by»
13.09.2026, 14:35

Глюкофон «Лотос» 22см F
  1 шт × 290 BYN = 290 BYN

Поющая чаша бронза 14см
  1 шт × 110 BYN = 110 BYN

─────────────────
ИТОГО: 360 BYN
Оплата: Карта ✅

🙏 Спасибо за покупку!`);

  addDivider();

  // === 14. PWA ===
  addHeader('14. PWA и мобильная версия', 1);

  addHeader('Установка как приложение', 2);
  addText('Приложение можно установить на телефон как обычное приложение:');
  y += 2;
  addText('Android: открыть в Chrome → меню (3 точки) → "Добавить на главный экран"');
  addText('iOS: открыть в Safari → кнопка "Поделиться" → "На экран Домой"');
  y += 2;
  addText('После установки иконка появится на рабочем столе, приложение откроется в полноэкранном режиме.');

  addHeader('Мета-теги для PWA', 2);
  addCode(`<meta name="theme-color" content="#0c0a09" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`);

  addHeader('Иконка приложения', 2);
  addText('Inline SVG favicon (круглый медальон в янтарных тонах):');
  y += 2;
  addCode(`<svg viewBox='0 0 100 100'>
  <circle cx='50' cy='50' r='45' fill='#b45309'/>
  <circle cx='50' cy='50' r='25' fill='#fef3c7'/>
  <circle cx='50' cy='50' r='10' fill='#b45309'/>
</svg>`);

  addHeader('Мобильная оптимизация', 2);
  addText('• viewport: width=device-width, initial-scale=1, maximum-scale=1 (запрет зума)');
  addText('• touch-action: pan-y (только вертикальный скролл)');
  addText('• overscroll-behavior: contain (нет pull-to-refresh)');
  addText('• Блокировка свайпа от левого края (защита от случайного back)');
  addText('• Увеличенные tap-зоны (минимум 44×44px)');
  addText('• Вибрация при успешном сканировании');

  addHeader('Адаптивность', 2);
  addText('Mobile-first подход через Tailwind breakpoints:');
  addCode(`// sm: 640px+ (телефон landscape)
// md: 768px+ (планшет)
// lg: 1024px+ (ноутбук)
// xl: 1280px+ (десктоп)

// Пример:
<div className="
  grid grid-cols-1     // мобильный: 1 колонка
  sm:grid-cols-2       // планшет: 2 колонки
  lg:grid-cols-3       // ноутбук: 3 колонки
  xl:grid-cols-6       // десктоп: 6 колонок
  gap-4
">`);

  addHeader('Различия Mobile vs Desktop', 2);
  addText('Mobile (мобильный):');
  addText('• Top-bar вверху с переключателем темы и аватаром');
  addText('• Bottom-nav внизу с 5 главными вкладками');
  addText('• Модальные окна открываются на полный экран (max-w-full)');
  y += 2;
  addText('Desktop (десктоп):');
  addText('• Sidebar слева с навигацией');
  addText('• Верхняя панель с действиями');
  addText('• Модальные окна центрируются (max-w-md/lg)');

  addDivider();

  // === 15. ПРОИЗВОДИТЕЛЬНОСТЬ ===
  addHeader('15. Производительность', 1);

  addHeader('Размер бандла', 2);
  addText('• Полный бандл: ~2.2 МБ (несжатый), ~640 КБ (gzip)');
  addText('• Single-file сборка через vite-plugin-singlefile (всё в index.html)');
  addText('• Минифицирован, готов к развёртыванию на любом статическом хостинге');

  addHeader('Оптимизации', 2);
  const optimizations = [
    'Нет react-router — мгновенные переходы между экранами',
    'Нет глобальных CSS-фреймворков кроме Tailwind',
    'Нет загрузки внешних ресурсов кроме шрифтов Google',
    'Ленивая загрузка модулей не используется (бандл один)',
    'Все компоненты функциональные с hooks',
    'useMemo для тяжёлых вычислений (отчёты)',
    'localStorage вместо серверных запросов = мгновенный отклик'
  ];
  optimizations.forEach(o => addText('• ' + o, 10));
  y += 3;

  addHeader('Известные узкие места', 2);
  addText('• HTML5-QRCode тяжёлый (~400 КБ) — можно заменить на BarcodeDetector API (уже используется)');
  addText('• При большом количестве продаж (10000+) localStorage может стать медленным');
  addText('• Перерендер всего дерева при смене tab — нет React.memo');

  addDivider();

  // === 16. БЕЗОПАСНОСТЬ ===
  addHeader('16. Безопасность', 1);

  addHeader('Реализованные меры', 2);
  const security = [
    'Маржа себестоимости НЕ доступна менеджерам (нет в данных для их роли)',
    'Telegram bot token хранится в localStorage (доступ только у админа)',
    'Роли проверяются на уровне компонентов (нет доступа к функциям)',
    'Скрытие навигации для админских разделов у менеджеров',
    'Блокировка context menu на чувствительных элементах'
  ];
  security.forEach(s => addText('• ' + s, 10));
  y += 3;

  addHeader('Известные риски', 2);
  const risks = [
    'localStorage доступен через DevTools любому пользователю',
    'Менеджер технически может посмотреть данные других менеджеров',
    'Нет HTTPS-шифрования (зависит от хостинга)',
    'Нет аудита действий (кто что менял)',
    'Токен Telegram-бота может быть украден из браузера'
  ];
  risks.forEach(r => addText('⚠ ' + r, 10));
  y += 3;

  addHeader('Рекомендации для production', 2);
  addText('• Перенести хранение на серверную БД (PostgreSQL, Supabase)');
  addText('• Добавить JWT-аутентификацию');
  addText('• Добавить аудит-лог всех изменений');
  addText('• Шифровать чувствительные данные (токены)');
  addText('• Использовать HTTPS only');
  addText('• Добавить CSRF-защиту если появится backend');

  addDivider();

  // === 17. РАЗВЁРТЫВАНИЕ ===
  addHeader('17. Развёртывание', 1);

  addHeader('Сборка', 2);
  addCode(`# Установка зависимостей
npm install

# Запуск dev-сервера (для разработки)
npm run dev
# Доступно на http://localhost:5173

# Production сборка
npm run build
# Создаёт dist/index.html (single-file)
# Можно открыть напрямую в браузере!

# Preview production сборки
npm run preview`);

  addHeader('Хостинг (все бесплатно)', 2);
  addText('Вариант 1: Netlify');
  addCode(`# 1. Создать аккаунт на netlify.com
# 2. Перетащить папку dist/ на dashboard
# 3. Получить URL вида random-name.netlify.app
# 4. Подключить свой домен (опционально)`);

  addText('Вариант 2: Vercel');
  addCode(`npm install -g vercel
vercel --prod`);

  addText('Вариант 3: Cloudflare Pages');
  addCode(`# Через Wrangler CLI или GitHub integration`);

  addHeader('Поддомен', 2);
  addText('Чтобы повесить на app.soundhealing.by:');
  y += 2;
  addText('1. В настройках DNS регистратора добавить CNAME запись:');
  addText('   app.soundhealing.by → random-name.netlify.app');
  addText('2. В настройках Netlify добавить custom domain');
  addText('3. SSL выпустится автоматически');

  addHeader('Переменные окружения', 2);
  addText('Не используются — всё на клиенте. В будущем можно вынести в .env:');
  addCode(`# VITE_API_URL=https://api.example.com
# VITE_TELEGRAM_BOT_TOKEN=...
# VITE_ADMIN_CHAT_ID=...`);

  addDivider();

  // === 18. ОГРАНИЧЕНИЯ ===
  addHeader('18. Ограничения и TODO', 1);

  addHeader('Текущие ограничения', 2);
  const limitations = [
    'localStorage — данные не синхронизируются между устройствами',
    'Нет авторизации — все "пользователи" в одном браузере',
    'Нет облачного бэкапа',
    'Один Telegram-бот на все магазины',
    'Нет multi-tenancy (нельзя вести несколько магазинов)',
    'Нет аудита изменений',
    'Нет экспорта/импорта базы данных',
    'Нет уведомлений о низком остатке',
    'Нет автоматического бронирования',
    'Нет интеграции с 1С / МойСклад',
    'Нет приёма онлайн-платежей',
    'Нет фотографий товаров в базе'
  ];
  limitations.forEach(l => addText('• ' + l, 10));
  y += 3;

  addHeader('Планы развития (Roadmap)', 2);
  const roadmap = [
    'v1.1: Подключение Supabase для синхронизации между менеджерами',
    'v1.2: Авторизация пользователей (логин/пароль)',
    'v1.3: Фотографии товаров (загрузка + отображение)',
    'v1.4: Уведомления о низком остатке',
    'v1.5: Бронирование товара под клиента',
    'v1.6: История изменений (audit log)',
    'v1.7: Импорт/экспорт всей базы в JSON',
    'v1.8: Интеграция с 1С / МойСклад',
    'v1.9: Онлайн-оплата (ЮKassa, Stripe)',
    'v2.0: Mobile app (React Native / Capacitor)'
  ];
  roadmap.forEach(r => addText('• ' + r, 10));
  y += 3;

  addHeader('Известные баги', 2);
  addText('• При большом количестве продаж список в Sales может тормозить (нет виртуализации)');
  addText('• BarcodeDetector API не поддерживается в Firefox — там сканер работает только вручную');
  addText('• На iOS Safari камера для сканера может не запускаться без HTTPS');
  addText('• localStorage имеет лимит 5-10 МБ — при 10000+ продаж может переполниться');

  addDivider();

  // === ЗАКЛЮЧЕНИЕ ===
  doc.setFillColor(254, 243, 199);
  doc.rect(margin - 5, y - 4, maxWidth + 10, 50, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(120, 53, 15);
  doc.text('Заключение', margin, y + 5);
  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  const conclusion = 'SoundHealing.by — это полностью функциональная система управления розничным магазином терапевтических инструментов, работающая полностью на клиенте без серверной части. Главные преимущества: мгновенный отклик, нулевая стоимость инфраструктуры, простота развёртывания. Главные ограничения: отсутствие синхронизации между устройствами и риск потери данных при очистке кэша браузера. Для production-использования рекомендуется подключить облачную базу данных (Supabase/Firebase).';
  const concLines = doc.splitTextToSize(conclusion, maxWidth - 10);
  doc.text(concLines, margin, y);
  y += concLines.length * 4 + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(180, 83, 9);
  doc.text('SoundHealing.by · Минск · 2025', margin, y);

  // Футеры на всех страницах
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPageFooter(i, totalPages);
  }

  doc.save('SoundHealing-Технический-паспорт.pdf');
}

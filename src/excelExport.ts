// Экспорт истории продаж и возвратов в Excel для бухгалтерии

import ExcelJS from 'exceljs';
import { Sale, Client } from './types';
import { formatDateTime } from './store';

export async function exportFullHistoryToExcel(
  sales: Sale[],
  clients: Client[],
  filename = 'sales-history.xlsx'
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SoundHealing.by';
  workbook.lastModifiedBy = 'System';

  // === Лист 1: Сводка по продажам ===
  const summarySheet = workbook.addWorksheet('Сводка', {
    properties: { tabColor: { argb: 'FFB45309' } }
  });

  summarySheet.columns = [
    { header: '№ чека', key: 'number', width: 12 },
    { header: 'Дата', key: 'date', width: 18 },
    { header: 'Клиент', key: 'client', width: 25 },
    { header: 'Телефон', key: 'phone', width: 18 },
    { header: 'Менеджер', key: 'manager', width: 20 },
    { header: 'Позиций', key: 'items', width: 10 },
    { header: 'Сумма (BYN)', key: 'subtotal', width: 14 },
    { header: 'Скидка (BYN)', key: 'discount', width: 14 },
    { header: 'Итого (BYN)', key: 'total', width: 14 },
    { header: 'Оплата', key: 'payment', width: 14 },
    { header: 'Возврат', key: 'refunded', width: 12 },
    { header: 'Примечания', key: 'notes', width: 30 }
  ];

  // Заголовок
  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFB45309' }
  };
  summarySheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(1).height = 24;

  // Данные
  const paymentLabels: Record<string, string> = {
    cash: 'Наличные',
    card: 'Карта',
    transfer: 'Перевод',
    sbp: 'СБП',
    installment: 'Рассрочка'
  };

  sales.forEach(sale => {
    const isRefunded = sale.notes?.includes('[ВОЗВРАТ]') || false;

    const row = summarySheet.addRow({
      number: sale.number,
      date: formatDateTime(sale.createdAt),
      client: sale.clientName,
      phone: sale.clientPhone || '',
      manager: sale.managerName,
      items: sale.items.length,
      subtotal: sale.subtotal,
      discount: sale.totalDiscountAmount,
      total: sale.totalAmount,
      payment: paymentLabels[sale.paymentMethod] || sale.paymentMethod,
      refunded: isRefunded ? '⚠️ ДА' : '',
      notes: sale.notes || ''
    });

    // Формат чисел
    row.getCell('subtotal').numFmt = '#,##0.00';
    row.getCell('discount').numFmt = '#,##0.00';
    row.getCell('total').numFmt = '#,##0.00';

    // Цвет строки если возврат
    if (isRefunded) {
      row.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEE2E2' }
        };
        cell.font = { italic: true, color: { argb: 'FF991B1B' } };
      });
    }
  });

  // Итоговая строка
  const totalRow = summarySheet.addRow({
    number: 'ИТОГО:',
    date: '',
    client: '',
    phone: '',
    manager: '',
    items: sales.length,
    subtotal: sales.reduce((s, x) => s + x.subtotal, 0),
    discount: sales.reduce((s, x) => s + x.totalDiscountAmount, 0),
    total: sales.reduce((s, x) => s + x.totalAmount, 0),
    payment: '',
    refunded: '',
    notes: ''
  });
  totalRow.font = { bold: true };
  totalRow.getCell('subtotal').numFmt = '#,##0.00';
  totalRow.getCell('discount').numFmt = '#,##0.00';
  totalRow.getCell('total').numFmt = '#,##0.00';
  totalRow.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFEF3C7' }
    };
  });

  // Границы таблицы
  const lastRow = summarySheet.lastRow?.number || 1;
  for (let i = 1; i <= lastRow; i++) {
    for (let j = 1; j <= 12; j++) {
      summarySheet.getCell(i, j).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
  }

  // Freeze первый ряд
  summarySheet.views = [{ state: 'frozen', ySplit: 1 }];

  // === Лист 2: Детали по позициям ===
  const itemsSheet = workbook.addWorksheet('Позиции', {
    properties: { tabColor: { argb: 'FF059669' } }
  });

  itemsSheet.columns = [
    { header: '№ чека', key: 'number', width: 12 },
    { header: 'Дата', key: 'date', width: 18 },
    { header: 'Товар', key: 'product', width: 35 },
    { header: 'Партия', key: 'batch', width: 10 },
    { header: 'Кол-во', key: 'qty', width: 8 },
    { header: 'Цена за ед.', key: 'price', width: 12 },
    { header: 'Скидка %', key: 'discount', width: 10 },
    { header: 'Итого позиции', key: 'total', width: 14 },
    { header: 'Клиент', key: 'client', width: 25 }
  ];

  itemsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  itemsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF059669' }
  };
  itemsSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  itemsSheet.getRow(1).height = 24;

  sales.forEach(sale => {
    sale.items.forEach(item => {
      const row = itemsSheet.addRow({
        number: sale.number,
        date: formatDateTime(sale.createdAt),
        product: item.productName,
        batch: item.batchCode,
        qty: item.quantity,
        price: item.unitPrice,
        discount: item.individualDiscount,
        total: item.finalPrice,
        client: sale.clientName
      });
      row.getCell('price').numFmt = '#,##0.00';
      row.getCell('total').numFmt = '#,##0.00';
    });
  });

  // Границы
  const itemsLastRow = itemsSheet.lastRow?.number || 1;
  for (let i = 1; i <= itemsLastRow; i++) {
    for (let j = 1; j <= 9; j++) {
      itemsSheet.getCell(i, j).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
  }
  itemsSheet.views = [{ state: 'frozen', ySplit: 1 }];

  // === Лист 3: Клиенты ===
  const clientsSheet = workbook.addWorksheet('Клиенты', {
    properties: { tabColor: { argb: 'FF7C3AED' } }
  });

  clientsSheet.columns = [
    { header: 'Имя', key: 'name', width: 30 },
    { header: 'Телефон', key: 'phone', width: 18 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Город', key: 'city', width: 15 },
    { header: 'Telegram', key: 'telegram', width: 15 },
    { header: 'Всего покупок (BYN)', key: 'total', width: 18 },
    { header: 'Кол-во чеков', key: 'count', width: 12 },
    { header: 'Дата регистрации', key: 'created', width: 18 }
  ];

  clientsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  clientsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF7C3AED' }
  };
  clientsSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  clientsSheet.getRow(1).height = 24;

  clients.forEach(client => {
    const clientSales = sales.filter(s => s.clientId === client.id);
    const row = clientsSheet.addRow({
      name: client.name,
      phone: client.phone || '',
      email: client.email || '',
      city: client.city || '',
      telegram: client.telegramId || '',
      total: client.totalPurchases,
      count: clientSales.length,
      created: client.createdAt.split('T')[0]
    });
    row.getCell('total').numFmt = '#,##0.00';
  });

  // Границы
  const clientsLastRow = clientsSheet.lastRow?.number || 1;
  for (let i = 1; i <= clientsLastRow; i++) {
    for (let j = 1; j <= 8; j++) {
      clientsSheet.getCell(i, j).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
  }
  clientsSheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Сохраняем
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

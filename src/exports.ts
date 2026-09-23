import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, Shipment, InventoryItem } from './types';
import { formatCurrency, formatDate, formatDateTime } from './store';

// ============= EXCEL EXPORT =============

export async function exportSalesToExcel(sales: Sale[], filename = 'sales-report.xlsx') {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Продажи');

  worksheet.columns = [
    { header: '№', key: 'number', width: 12 },
    { header: 'Дата', key: 'date', width: 18 },
    { header: 'Менеджер', key: 'manager', width: 20 },
    { header: 'Клиент', key: 'client', width: 25 },
    { header: 'Телефон', key: 'phone', width: 18 },
    { header: 'Позиции', key: 'items', width: 40 },
    { header: 'Сумма BYN', key: 'subtotal', width: 14 },
    { header: 'Скидка BYN', key: 'discount', width: 14 },
    { header: 'Итого BYN', key: 'total', width: 14 },
    { header: 'Оплата', key: 'payment', width: 14 }
  ];

  // Заголовок
  worksheet.getRow(1).font = { bold: true, size: 11 };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFB45309' }
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 24;

  sales.forEach(sale => {
    const itemsStr = sale.items.map(i => `${i.productName} (${i.batchCode})`).join('; ');
    worksheet.addRow({
      number: sale.number,
      date: formatDateTime(sale.createdAt),
      manager: sale.managerName,
      client: sale.clientName,
      phone: sale.clientPhone || '',
      items: itemsStr,
      subtotal: sale.subtotal,
      discount: sale.totalDiscountAmount,
      total: sale.totalAmount,
      payment: getPaymentLabel(sale.paymentMethod)
    });
  });

  // Итоговая строка
  const totalRow = worksheet.addRow({
    number: '',
    date: '',
    manager: '',
    client: '',
    phone: '',
    items: 'ИТОГО:',
    subtotal: sales.reduce((s, x) => s + x.subtotal, 0),
    discount: sales.reduce((s, x) => s + x.totalDiscountAmount, 0),
    total: sales.reduce((s, x) => s + x.totalAmount, 0),
    payment: ''
  });
  totalRow.font = { bold: true };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFEF3C7' }
  };

  // Формат чисел
  worksheet.getColumn('subtotal').numFmt = '#,##0.00';
  worksheet.getColumn('discount').numFmt = '#,##0.00';
  worksheet.getColumn('total').numFmt = '#,##0.00';

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(new Blob([buffer]), filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

export async function exportInventoryToExcel(items: InventoryItem[], filename = 'inventory.xlsx') {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Склад');

  worksheet.columns = [
    { header: 'ID', key: 'id', width: 18 },
    { header: 'Название', key: 'name', width: 35 },
    { header: 'Категория', key: 'category', width: 15 },
    { header: 'Партия', key: 'batch', width: 10 },
    { header: 'Себестоимость (BYN)', key: 'cost', width: 16 },
    { header: 'Цена (BYN)', key: 'price', width: 14 },
    { header: 'Статус', key: 'status', width: 14 },
    { header: 'Дата поступления', key: 'date', width: 16 }
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFB45309' }
  };
  worksheet.getRow(1).height = 24;

  items.forEach(item => {
    worksheet.addRow({
      id: item.id,
      name: item.productName,
      category: item.category,
      batch: item.batchCode,
      cost: item.costPriceBYN,
      price: item.retailPrice,
      status: getStatusLabel(item.status),
      date: formatDate(item.createdAt)
    });
  });

  worksheet.getColumn('cost').numFmt = '#,##0.00';
  worksheet.getColumn('price').numFmt = '#,##0.00';

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(new Blob([buffer]), filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

export async function exportShipmentReport(shipment: Shipment, filename = 'shipment-report.xlsx') {
  const workbook = new ExcelJS.Workbook();
  const ws1 = workbook.addWorksheet('Поставка');

  ws1.columns = [
    { header: 'Параметр', key: 'param', width: 25 },
    { header: 'Значение', key: 'value', width: 35 }
  ];
  ws1.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws1.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB45309' } };

  ws1.addRows([
    { param: 'Код партии', value: shipment.batchCode },
    { param: 'Дата прихода', value: formatDate(shipment.date) },
    { param: 'Поставщик', value: shipment.supplierId },
    { param: 'Логистика', value: `${shipment.totalLogistics} ${shipment.logisticsCurrency}` },
    { param: 'Таможня', value: `${shipment.totalCustoms} ${shipment.customsCurrency}` },
    { param: 'Примечания', value: shipment.notes || '—' }
  ]);

  const ws2 = workbook.addWorksheet('Позиции');
  ws2.columns = [
    { header: 'Название', key: 'name', width: 35 },
    { header: 'Категория', key: 'cat', width: 18 },
    { header: 'Кол-во', key: 'qty', width: 8 },
    { header: 'Закупка', key: 'purchase', width: 14 },
    { header: 'Логистика', key: 'log', width: 14 },
    { header: 'Таможня', key: 'cust', width: 14 },
    { header: 'Цена продажи', key: 'retail', width: 14 }
  ];
  ws2.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB45309' } };

  shipment.items.forEach(item => {
    ws2.addRow({
      name: item.productName,
      cat: item.category,
      qty: item.quantity,
      purchase: `${item.purchasePricePerUnit} ${item.purchaseCurrency}`,
      log: item.logisticsPerUnit.toFixed(2),
      cust: item.customsPerUnit.toFixed(2),
      retail: `${item.retailPrice} BYN`
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(new Blob([buffer]), filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

// ============= PDF EXPORT =============

export function exportSalesToPDF(sales: Sale[], filename = 'sales-report.pdf') {
  const doc = new jsPDF('landscape');

  // Заголовок
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('SoundHealing.by — Отчёт по продажам', 14, 20);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Период: ${formatDate(new Date().toISOString())}`, 14, 28);
  doc.text(`Всего продаж: ${sales.length}`, 14, 34);

  const totalAmount = sales.reduce((s, x) => s + x.totalAmount, 0);
  doc.text(`Общая сумма: ${formatCurrency(totalAmount)}`, 14, 40);

  // Таблица
  const tableData = sales.map(sale => [
    sale.number,
    formatDateTime(sale.createdAt),
    sale.managerName,
    sale.clientName,
    sale.items.map(i => i.productName).join('\n'),
    formatCurrency(sale.subtotal),
    formatCurrency(sale.totalDiscountAmount),
    formatCurrency(sale.totalAmount),
    getPaymentLabel(sale.paymentMethod)
  ]);

  autoTable(doc, {
    startY: 48,
    head: [['№', 'Дата', 'Менеджер', 'Клиент', 'Позиции', 'Сумма', 'Скидка', 'Итого', 'Оплата']],
    body: tableData,
    headStyles: { fillColor: [180, 83, 9], textColor: 255 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 32 },
      2: { cellWidth: 25 },
      3: { cellWidth: 28 },
      4: { cellWidth: 60 },
      5: { cellWidth: 22 },
      6: { cellWidth: 18 },
      7: { cellWidth: 22 },
      8: { cellWidth: 18 }
    }
  });

  doc.save(filename);
}

export function exportInventoryToPDF(items: InventoryItem[], filename = 'inventory.pdf') {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('SoundHealing.by — Склад', 14, 20);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Всего позиций: ${items.length}`, 14, 28);

  const tableData = items.map(item => [
    item.id,
    item.productName,
    item.batchCode,
    formatCurrency(item.retailPrice),
    getStatusLabel(item.status),
    formatDate(item.createdAt)
  ]);

  autoTable(doc, {
    startY: 36,
    head: [['ID', 'Название', 'Партия', 'Цена', 'Статус', 'Поступление']],
    body: tableData,
    headStyles: { fillColor: [180, 83, 9], textColor: 255 },
    styles: { fontSize: 8 }
  });

  doc.save(filename);
}

// ============= ЧЕК 45мм (для термопринтера магазина) =============

export interface ReceiptOptions {
  showLogo?: boolean;
  showManager?: boolean;
  showClient?: boolean;
  showBarcode?: boolean;
  footerText?: string;
}

export function exportReceiptPDF(
  sale: Sale,
  filename = 'receipt.pdf',
  options: ReceiptOptions = {}
) {
  // 45мм ширина, высота авто по контенту
  const widthMm = 45;
  const margin = 2;
  const contentWidth = widthMm - margin * 2;

  // Сначала считаем высоту — пройдёмся по контенту
  let estimatedHeight = 50; // шапка
  estimatedHeight += sale.items.length * 14; // позиции (~14мм каждая)
  estimatedHeight += 30; // итоги + футер

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [widthMm, estimatedHeight]
  });

  let y = margin + 2;

  // === Шапка ===
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('SoundHealing.by', widthMm / 2, y, { align: 'center' });
  y += 5;

  if (options.showLogo !== false) {
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('Магазин звукотерапии', widthMm / 2, y, { align: 'center' });
    y += 3;
  }

  // Разделитель
  doc.setLineWidth(0.1);
  doc.line(margin, y, widthMm - margin, y);
  y += 3;

  // === Информация о чеке ===
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(`ЧЕК ${sale.number}`, margin, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text(formatDateTime(sale.createdAt), margin, y);
  y += 3;

  if (options.showManager !== false) {
    doc.text(`Менеджер: ${sale.managerName.substring(0, 22)}`, margin, y);
    y += 3;
  }

  if (options.showClient !== false) {
    doc.text(`Клиент: ${sale.clientName.substring(0, 22)}`, margin, y);
    y += 3;
    if (sale.clientPhone) {
      doc.text(`Тел: ${sale.clientPhone}`, margin, y);
      y += 3;
    }
  }

  y += 1;
  doc.line(margin, y, widthMm - margin, y);
  y += 3;

  // === Позиции ===
  doc.setFontSize(7);
  sale.items.forEach((item, idx) => {
    // Название товара (для 45мм берём первые 38 символов)
    doc.setFont('helvetica', 'bold');
    const productText = item.productName.length > 38
      ? item.productName.substring(0, 36) + '..'
      : item.productName;
    const titleLines = doc.splitTextToSize(productText, contentWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 3.2;

    // Детали: кол-во × цена = итого
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    const qtyText = item.quantity > 1
      ? `${item.quantity} шт × ${formatCurrency(item.unitPrice)}`
      : `1 × ${formatCurrency(item.unitPrice)}`;
    doc.text(qtyText, margin, y);
    doc.text(formatCurrency(item.finalPrice), widthMm - margin, y, { align: 'right' });
    y += 3;

    if (item.individualDiscount > 0) {
      doc.setTextColor(180, 83, 9);
      doc.text(`   скидка -${item.individualDiscount}%`, margin, y);
      doc.setTextColor(0, 0, 0);
      y += 2.5;
    }

    // Разделитель между позициями (кроме последней)
    if (idx < sale.items.length - 1) {
      doc.setDrawColor(220, 220, 220);
      doc.line(margin + 3, y, widthMm - margin - 3, y);
      y += 2;
    }
  });

  y += 1;
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, y, widthMm - margin, y);
  y += 3;

  // === Итоги ===
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');

  if (sale.totalDiscountAmount > 0 || sale.subtotal !== sale.totalAmount) {
    doc.text('Сумма:', margin, y);
    doc.text(formatCurrency(sale.subtotal), widthMm - margin, y, { align: 'right' });
    y += 3.5;

    if (sale.totalDiscountAmount > 0) {
      doc.text('Скидка:', margin, y);
      doc.text(`-${formatCurrency(sale.totalDiscountAmount)}`, widthMm - margin, y, { align: 'right' });
      y += 3.5;
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ИТОГО:', margin, y + 1);
  doc.text(formatCurrency(sale.totalAmount), widthMm - margin, y + 1, { align: 'right' });
  y += 6;

  // Разделитель
  doc.line(margin, y, widthMm - margin, y);
  y += 3;

  // === Способ оплаты ===
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Оплата: ${getPaymentLabel(sale.paymentMethod)}`, margin, y);
  y += 4;

  // === Футер ===
  y += 1;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  const footer = options.footerText || '🙏 Спасибо за покупку!';
  const footerLines = doc.splitTextToSize(footer, contentWidth);
  doc.text(footerLines, widthMm / 2, y, { align: 'center' });
  y += footerLines.length * 3;

  y += 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.text('soundhealing.by', widthMm / 2, y, { align: 'center' });

  doc.save(filename);
}

// Прямая печать на Bluetooth термопринтер через Web Bluetooth API
export async function printReceiptViaBluetooth(sale: Sale): Promise<{ success: boolean; error?: string }> {
  if (!('bluetooth' in navigator)) {
    return { success: false, error: 'Web Bluetooth не поддерживается в этом браузере' };
  }

  try {
    // Запрашиваем устройство
    const device = await (navigator as any).bluetooth.requestDevice({
      filters: [
        { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Standard thermal printer
        { namePrefix: 'Printer' },
        { namePrefix: 'TP' }
      ],
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
    });

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
    const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

    // Формируем ESC/POS команды для термопринтера
    const commands: number[] = [];

    // Initialize
    commands.push(0x1B, 0x40);

    // Center align
    commands.push(0x1B, 0x61, 0x01);

    // Title
    const title = `SoundHealing.by\n`;
    const titleBytes = new TextEncoder().encode(title);
    titleBytes.forEach(b => commands.push(b));
    commands.push(0x0A);

    // Subtitle
    commands.push(0x1B, 0x61, 0x00); // Left align
    const subtitle = `Чек ${sale.number}\n${formatDateTime(sale.createdAt)}\n`;
    const subtitleBytes = new TextEncoder().encode(subtitle);
    subtitleBytes.forEach(b => commands.push(b));

    // Items
    sale.items.forEach(item => {
      const itemText = `${item.productName}\n` +
        `${item.quantity} × ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.finalPrice)}\n`;
      const itemBytes = new TextEncoder().encode(itemText);
      itemBytes.forEach(b => commands.push(b));
    });

    // Total
    commands.push(0x1B, 0x45, 0x01); // Bold on
    const totalText = `\nИТОГО: ${formatCurrency(sale.totalAmount)}\n`;
    const totalBytes = new TextEncoder().encode(totalText);
    totalBytes.forEach(b => commands.push(b));
    commands.push(0x1B, 0x45, 0x00); // Bold off

    // Payment
    const paymentText = `Оплата: ${getPaymentLabel(sale.paymentMethod)}\n`;
    const paymentBytes = new TextEncoder().encode(paymentText);
    paymentBytes.forEach(b => commands.push(b));

    // Feed and cut
    commands.push(0x0A, 0x0A, 0x0A);
    commands.push(0x1D, 0x56, 0x42, 0x00); // Full cut

    // Отправляем по чанкам (max 512 байт за раз для BLE)
    const chunkSize = 100; // Безопасный размер для BLE
    for (let i = 0; i < commands.length; i += chunkSize) {
      const chunk = new Uint8Array(commands.slice(i, i + chunkSize));
      await characteristic.writeValue(chunk);
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    device.gatt.disconnect();

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ============= HELPERS =============

function downloadBlob(blob: Blob, filename: string, _type: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getPaymentLabel(method: string): string {
  const labels: { [key: string]: string } = {
    cash: 'Наличные',
    card: 'Карта',
    transfer: 'Перевод',
    sbp: 'СБП',
    installment: 'Рассрочка'
  };
  return labels[method] || method;
}

function getStatusLabel(status: string): string {
  const labels: { [key: string]: string } = {
    in_stock: 'В наличии',
    reserved: 'Зарезервирован',
    sold: 'Продан',
    in_transit: 'В пути'
  };
  return labels[status] || status;
}

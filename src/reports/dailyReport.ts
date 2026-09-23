// Кассовый отчёт за день (X-отчёт / Z-отчёт)

import { Sale } from '../types';
import { formatCurrency } from '../store';

export interface DailyReport {
  date: string;
  shiftStart: string;
  shiftEnd: string;
  // Общая статистика
  totalSales: number;
  totalReturns: number;
  netRevenue: number;
  totalItems: number;
  // По способам оплаты
  byPayment: Record<string, { count: number; amount: number }>;
  // По менеджерам
  byManager: Record<string, { count: number; revenue: number }>;
  // Топ товаров
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  // Скидки
  totalDiscount: number;
}

export function generateDailyReport(sales: Sale[], date: Date = new Date()): DailyReport {
  const dateStr = date.toISOString().split('T')[0];
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const daySales = sales.filter(s => {
    const t = new Date(s.createdAt);
    return t >= dayStart && t <= dayEnd;
  });

  const isRefunded = (s: Sale) => s.notes?.includes('[ВОЗВРАТ');

  const activeSales = daySales.filter(s => !isRefunded(s));
  const refundedSales = daySales.filter(s => isRefunded(s));

  const totalRevenue = activeSales.reduce((s, x) => s + x.totalAmount, 0);
  const refundAmount = refundedSales.reduce((s, x) => s + x.totalAmount, 0);
  const netRevenue = totalRevenue - refundAmount;

  const totalDiscount = activeSales.reduce((s, x) => s + x.totalDiscountAmount, 0);

  const totalItems = activeSales.reduce((s, sale) =>
    s + sale.items.reduce((sum, item) => sum + item.quantity, 0), 0
  );

  // По способам оплаты
  const byPayment: DailyReport['byPayment'] = {};
  activeSales.forEach(sale => {
    const method = sale.paymentMethod;
    if (!byPayment[method]) {
      byPayment[method] = { count: 0, amount: 0 };
    }
    byPayment[method].count++;
    byPayment[method].amount += sale.totalAmount;
  });

  // По менеджерам
  const byManager: DailyReport['byManager'] = {};
  activeSales.forEach(sale => {
    if (!byManager[sale.managerName]) {
      byManager[sale.managerName] = { count: 0, revenue: 0 };
    }
    byManager[sale.managerName].count++;
    byManager[sale.managerName].revenue += sale.totalAmount;
  });

  // Топ товаров
  const productSales: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
  activeSales.forEach(sale => {
    sale.items.forEach(item => {
      const key = item.productName;
      if (!productSales[key]) {
        productSales[key] = { name: item.productName, quantity: 0, revenue: 0 };
      }
      productSales[key].quantity += item.quantity;
      productSales[key].revenue += item.finalPrice;
    });
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return {
    date: dateStr,
    shiftStart: dayStart.toISOString(),
    shiftEnd: dayEnd.toISOString(),
    totalSales: activeSales.length,
    totalReturns: refundedSales.length,
    netRevenue,
    totalItems,
    byPayment,
    byManager,
    topProducts,
    totalDiscount
  };
}

// Генерация текстового X-отчёта для печати на термопринтере
export function formatXReportForPrint(report: DailyReport, shopName: string = 'SoundHealing.by'): string {
  const lines: string[] = [];
  const paymentLabels: Record<string, string> = {
    cash: 'Наличные',
    card: 'Карта',
    transfer: 'Перевод',
    sbp: 'СБП',
    installment: 'Рассрочка'
  };

  lines.push('='.repeat(32));
  lines.push(centerText(shopName, 32));
  lines.push(centerText('КАССОВЫЙ ОТЧЁТ (X-ОТЧЁТ)', 32));
  lines.push('='.repeat(32));
  lines.push(`Дата: ${report.date}`);
  lines.push(`Период: ${new Date(report.shiftStart).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} - ${new Date(report.shiftEnd).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`);
  lines.push('');
  lines.push(`Продаж: ${report.totalSales}`);
  lines.push(`Возвратов: ${report.totalReturns}`);
  lines.push(`Позиций продано: ${report.totalItems}`);
  lines.push('');
  lines.push('-'.repeat(32));
  lines.push('ВЫРУЧКА:');
  lines.push(`Итого:           ${formatCurrency(report.netRevenue).padStart(20)}`);
  lines.push(`Скидки:         -${formatCurrency(report.totalDiscount).padStart(19)}`);
  lines.push('');
  lines.push('-'.repeat(32));
  lines.push('ПО СПОСОБАМ ОПЛАТЫ:');
  Object.entries(report.byPayment).forEach(([method, data]) => {
    const label = paymentLabels[method] || method;
    const line = `  ${label}:`;
    lines.push(line.padEnd(20) + `${formatCurrency(data.amount)}`.padStart(12));
    lines.push(`    ${data.count} чек(ов)`);
  });
  lines.push('');
  lines.push('-'.repeat(32));
  lines.push('ПО МЕНЕДЖЕРАМ:');
  Object.entries(report.byManager).forEach(([name, data]) => {
    const line = `  ${name.substring(0, 20)}`;
    lines.push(line.padEnd(22) + `${formatCurrency(data.revenue)}`.padStart(10));
    lines.push(`    ${data.count} продаж`);
  });
  lines.push('');
  lines.push('-'.repeat(32));
  lines.push('ТОП-5 ТОВАРОВ:');
  report.topProducts.slice(0, 5).forEach((p, i) => {
    const num = `${i + 1}.`;
    lines.push(`${num} ${truncate(p.name, 22)}`);
    lines.push(`   ${p.quantity} шт = ${formatCurrency(p.revenue)}`);
  });
  lines.push('');
  lines.push('='.repeat(32));
  lines.push(centerText('Отчёт составлен:', 32));
  lines.push(centerText(new Date().toLocaleString('ru-RU'), 32));
  lines.push('='.repeat(32));
  lines.push('');
  lines.push('');

  return lines.join('\n');
}

function centerText(text: string, width: number): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 1) + '…';
}

// Генерация PDF X-отчёта
export function generateXReportPDF(report: DailyReport, shopName: string = 'SoundHealing.by'): Promise<Blob> {
  return import('jspdf').then(({ default: jsPDF }) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const paymentLabels: Record<string, string> = {
      cash: 'Наличные',
      card: 'Карта',
      transfer: 'Перевод',
      sbp: 'СБП',
      installment: 'Рассрочка'
    };

    let y = 15;

    // Заголовок
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(shopName, 105, y, { align: 'center' });
    y += 8;

    doc.setFontSize(14);
    doc.text('КАССОВЫЙ ОТЧЁТ (X-ОТЧЁТ)', 105, y, { align: 'center' });
    y += 10;

    doc.setDrawColor(180, 83, 9);
    doc.line(15, y, 195, y);
    y += 8;

    // Информация
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Дата: ${report.date}`, 15, y);
    y += 6;
    doc.text(`Время формирования: ${new Date().toLocaleTimeString('ru-RU')}`, 15, y);
    y += 10;

    // Общая статистика
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('📊 Общая статистика', 15, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Продаж за день:`, 15, y);
    doc.text(`${report.totalSales}`, 195, y, { align: 'right' });
    y += 5;
    doc.text(`Возвратов:`, 15, y);
    doc.text(`${report.totalReturns}`, 195, y, { align: 'right' });
    y += 5;
    doc.text(`Позиций продано:`, 15, y);
    doc.text(`${report.totalItems} шт`, 195, y, { align: 'right' });
    y += 8;

    // Финансы
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('💰 Финансы', 15, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Выручка (нетто):`, 15, y);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(report.netRevenue), 195, y, { align: 'right' });
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(`Скидки предоставленные:`, 15, y);
    doc.text(`-${formatCurrency(report.totalDiscount)}`, 195, y, { align: 'right' });
    y += 8;

    // По способам оплаты
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('💳 По способам оплаты', 15, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    Object.entries(report.byPayment).forEach(([method, data]) => {
      const label = paymentLabels[method] || method;
      doc.text(`${label} (${data.count} чек.):`, 15, y);
      doc.text(formatCurrency(data.amount), 195, y, { align: 'right' });
      y += 5;
    });
    y += 3;

    // По менеджерам
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('👤 По менеджерам', 15, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    Object.entries(report.byManager).forEach(([name, data]) => {
      doc.text(`${name} (${data.count} продаж):`, 15, y);
      doc.text(formatCurrency(data.revenue), 195, y, { align: 'right' });
      y += 5;
    });
    y += 3;

    // Топ товаров
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('🏆 Топ товаров дня', 15, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    report.topProducts.forEach((p, i) => {
      doc.text(`${i + 1}. ${p.name}`, 15, y);
      y += 5;
      doc.setTextColor(100, 100, 100);
      doc.text(`   ${p.quantity} шт × ${formatCurrency(p.revenue / p.quantity)} = ${formatCurrency(p.revenue)}`, 20, y);
      doc.setTextColor(0, 0, 0);
      y += 6;
    });

    // Подпись
    y += 10;
    doc.setDrawColor(180, 83, 9);
    doc.line(15, y, 195, y);
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Отчёт сформирован автоматически системой SoundHealing.by', 105, y, { align: 'center' });

    return doc.output('blob');
  });
}

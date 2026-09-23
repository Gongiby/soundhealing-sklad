import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { InventoryItem } from './types';

// ============= LABEL GENERATION =============

const LABEL_WIDTH_MM = 45;
const LABEL_HEIGHT_MM = 35;

// Генерация этикетки в JPG (для Bluetooth-принтеров и мессенджеров)
export async function generateLabelJPG(item: InventoryItem): Promise<Blob> {
  // Создаём canvas для рендеринга
  const scale = 8; // для качества
  const canvasWidth = LABEL_WIDTH_MM * scale * 3.78; // mm → px (примерно)
  const canvasHeight = LABEL_HEIGHT_MM * scale * 3.78;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(canvasWidth);
  canvas.height = Math.round(canvasHeight);
  const ctx = canvas.getContext('2d')!;

  // Фон белый
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Рамка
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

  const labelText = (item.shortName || item.productName).substring(0, 36);

  // Короткое название сверху
  ctx.fillStyle = '#1c1917';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  const titleLines = labelText.split(' ');
  let titleY = 50;
  for (const line of titleLines) {
    ctx.fillText(line.substring(0, 18), canvas.width / 2, titleY);
    titleY += 36;
  }

  // QR-код
  const qrUrl = `${window.location.origin}/#/scan/${item.id}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 200,
    color: { dark: '#000000', light: '#FFFFFF' }
  });
  const qrSize = 180;
  const qrX = (canvas.width - qrSize) / 2;
  const qrY = canvas.height - qrSize - 50;
  const qrImg = new Image();
  await new Promise((resolve, reject) => {
    qrImg.onload = resolve;
    qrImg.onerror = reject;
    qrImg.src = qrDataUrl;
  });
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // Партия снизу
  ctx.fillStyle = '#b45309';
  ctx.font = 'bold 22px Arial';
  ctx.fillText(`Партия: ${item.batchCode}`, canvas.width / 2, canvas.height - 20);

  // Конвертируем canvas в JPG blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Не удалось создать JPG'));
    }, 'image/jpeg', 0.95);
  });
}

// Скачать одну этикетку как JPG
export async function downloadLabelJPG(item: InventoryItem): Promise<void> {
  const blob = await generateLabelJPG(item);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `label-${item.id}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function generateLabelQR(itemId: string, baseUrl: string): Promise<string> {
  const url = `${baseUrl}/#/scan/${itemId}`;
  return await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 256,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
}

export async function generateLabelsPDF(items: InventoryItem[], baseUrl: string, filename = 'labels.pdf') {
  if (items.length === 0) {
    alert('Нет товаров для печати');
    return;
  }
  // 45мм ширина, высота подбирается по контенту
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  // Используем короткое название на этикетке (если есть), иначе полное
  const getLabelText = (item: InventoryItem) => {
    return (item.shortName && item.shortName.length > 0 ? item.shortName : item.productName);
  };

  // Раскладка: 4 колонки по 45мм = 180мм, плюс отступы
  const cols = 4;
  const colWidth = LABEL_WIDTH_MM;
  const rowHeight = LABEL_HEIGHT_MM;
  const marginX = 10;
  const marginY = 15;
  const gap = 2;

  const pageHeight = 297;
  const labelsPerCol = Math.floor((pageHeight - marginY * 2) / (rowHeight + gap));

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const pos = i % (labelsPerCol * cols);
    if (i > 0 && pos === 0) {
      doc.addPage();
    }

    const col = pos % cols;
    const row = Math.floor(pos / cols);
    const x = marginX + col * (colWidth + gap);
    const y = marginY + row * (rowHeight + gap);

    // Рамка этикетки
    doc.setDrawColor(180, 83, 9);
    doc.setLineWidth(0.2);
    doc.rect(x, y, colWidth, rowHeight);

    // Короткое название сверху (если есть, иначе полное)
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(28, 25, 23);
    const labelText = getLabelText(item);
    const title = labelText.length > 30 ? labelText.substring(0, 28) + '...' : labelText;
    const titleLines = doc.splitTextToSize(title, colWidth - 4);
    doc.text(titleLines, x + colWidth / 2, y + 4, { align: 'center' });

    // QR-код
    const qrDataUrl = await generateLabelQR(item.id, baseUrl);
    const qrSize = 18;
    const qrX = x + (colWidth - qrSize) / 2;
    const qrY = y + 7;
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // Партия снизу
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    doc.text(`Партия: ${item.batchCode}`, x + colWidth / 2, y + rowHeight - 4, { align: 'center' });

    // ID мелким шрифтом
    doc.setFontSize(5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 113, 108);
    doc.text(item.id, x + colWidth / 2, y + rowHeight - 1.5, { align: 'center' });
  }

  doc.save(filename);
}

export async function generateSingleLabelPDF(item: InventoryItem, baseUrl: string, filename = `label-${item.id}.pdf`) {
  return generateLabelsPDF([item], baseUrl, filename);
}

export async function generateLabelDataURL(item: InventoryItem, baseUrl: string): Promise<string> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [LABEL_WIDTH_MM, LABEL_HEIGHT_MM]
  });

  // Рамка
  doc.setDrawColor(180, 83, 9);
  doc.setLineWidth(0.3);
  doc.rect(1, 1, LABEL_WIDTH_MM - 2, LABEL_HEIGHT_MM - 2);

  // Короткое название (или полное если нет)
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(28, 25, 23);
  const labelText = (item.shortName && item.shortName.length > 0 ? item.shortName : item.productName);
  const title = labelText.length > 32 ? labelText.substring(0, 30) + '...' : labelText;
  const titleLines = doc.splitTextToSize(title, LABEL_WIDTH_MM - 4);
  doc.text(titleLines, LABEL_WIDTH_MM / 2, 5, { align: 'center' });

  // QR
  const qrDataUrl = await generateLabelQR(item.id, baseUrl);
  const qrSize = 16;
  const qrX = (LABEL_WIDTH_MM - qrSize) / 2;
  const qrY = 9;
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

  // Партия
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text(`Партия: ${item.batchCode}`, LABEL_WIDTH_MM / 2, LABEL_HEIGHT_MM - 4, { align: 'center' });

  // ID
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 113, 108);
  doc.text(item.id, LABEL_WIDTH_MM / 2, LABEL_HEIGHT_MM - 1.5, { align: 'center' });

  return doc.output('datauristring');
}

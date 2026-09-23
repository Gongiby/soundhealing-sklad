import { Shipment, InventoryItem, Sale, Client } from './types';
import { INITIAL_USERS, INITIAL_SUPPLIERS, generateBatchCode, generateItemId } from './store';

export function generateSeedData(): {
  shipments: Shipment[];
  inventory: InventoryItem[];
  sales: Sale[];
  clients: Client[];
} {
  const now = new Date();
  const batch1 = generateBatchCode(new Date(now.getFullYear(), now.getMonth() - 2, 12));
  const batch2 = generateBatchCode(new Date(now.getFullYear(), now.getMonth() - 1, 5));
  const batch3 = generateBatchCode(new Date(now.getFullYear(), now.getMonth(), 1));

  const shipments: Shipment[] = [];
  const inventory: InventoryItem[] = [];
  const clients: Client[] = [];
  const sales: Sale[] = [];

  // === Поставка 1 (2 месяца назад) ===
  const ship1Items: Shipment['items'] = [];
  const ship1Products = [
    { name: 'Глюкофон «Лотос» 22 см нота F (432 Гц)', short: 'Глюкофон «Лотос» F', cat: 'Глюкофон', qty: 5, usd: 51.89, ret: 290 },
    { name: 'Чакрофон «Ом» 30 см нота A', short: 'Чакрофон «Ом» A', cat: 'Чакрофон', qty: 12, usd: 38.50, ret: 220 },
    { name: 'Поющая чаша бронзовая ручной работы 14 см', short: 'Чаша бронза 14см', cat: 'Поющая чаша', qty: 8, usd: 18.20, ret: 110 },
    { name: 'Камертон медицинский 440 Гц с активатором', short: 'Камертон 440Гц', cat: 'Камертон', qty: 20, usd: 4.50, ret: 35 }
  ];

  const ship1Id = 'ship-1';
  const ship1TotalLogisticsUSD = 425;
  const ship1TotalCustomsUSD = 280;

  let idx = 1;
  ship1Products.forEach(p => {
    const totalUnits = ship1Products.reduce((s, x) => s + x.qty, 0);
    const logisticsPerUnit = (ship1TotalLogisticsUSD / totalUnits);
    const customsPerUnit = (ship1TotalCustomsUSD / totalUnits);

    const itemIds: string[] = [];
    for (let i = 1; i <= p.qty; i++) {
      const itemId = generateItemId(p.cat, p.name, idx++);
      itemIds.push(itemId);
      const totalCostUSD = p.usd + logisticsPerUnit + customsPerUnit;
      const costBYN = totalCostUSD * 3.27; // курс 2 мес назад
      inventory.push({
        id: itemId,
        shipmentId: ship1Id,
        batchCode: batch1,
        productName: p.name,
        shortName: p.short || p.name,
        category: p.cat,
        status: 'in_stock',
        purchaseCurrency: 'USD',
        purchasePriceOriginal: p.usd + logisticsPerUnit + customsPerUnit,
        costPriceBYN: Math.round(costBYN * 100) / 100,
        retailPrice: p.ret,
        createdAt: new Date(now.getFullYear(), now.getMonth() - 2, 12).toISOString()
      });
    }

    ship1Items.push({
      id: `si-1-${p.cat}`,
      productName: p.name,
      shortName: p.short || p.name,
      category: p.cat,
      quantity: p.qty,
      purchaseCurrency: 'USD',
      purchasePricePerUnit: p.usd,
      logisticsPerUnit: Math.round(logisticsPerUnit * 100) / 100,
      customsPerUnit: Math.round(customsPerUnit * 100) / 100,
      retailPrice: p.ret,
      createdItemIds: itemIds
    });
  });

  shipments.push({
    id: ship1Id,
    batchCode: batch1,
    supplierId: 's-1',
    date: new Date(now.getFullYear(), now.getMonth() - 2, 12).toISOString(),
    totalLogistics: ship1TotalLogisticsUSD,
    totalCustoms: ship1TotalCustomsUSD,
    logisticsCurrency: 'USD',
    customsCurrency: 'USD',
    exchangeRates: { USD: 3.27, EUR: 3.55, CNY: 0.45, RUB: 0.036, BYN: 1 },
    items: ship1Items,
    notes: 'Первая крупная поставка из Непала, чартерный рейс',
    createdAt: new Date(now.getFullYear(), now.getMonth() - 2, 12).toISOString()
  });

  // === Поставка 2 (месяц назад, EUR) ===
  const ship2Items: Shipment['items'] = [];
  const ship2Id = 'ship-2';
  const ship2Products = [
    { name: 'Глюкофон «Улитка» 30 см нота D (528 Гц)', short: 'Глюкофон «Улитка» D', cat: 'Глюкофон', qty: 3, eur: 65.00, ret: 380 },
    { name: 'Гонг «Звук Вселенной» 60 см бронза премиум', short: 'Гонг «Вселенная» 60', cat: 'Гонг', qty: 2, eur: 280.00, ret: 1450 },
    { name: 'Космограмма «Активация» полнолуние', short: 'Космограмма Активация', cat: 'Космограмма', qty: 15, eur: 22.50, ret: 135 }
  ];
  const ship2TotalLogisticsEUR = 280;
  const ship2TotalCustomsEUR = 195;
  const ship2TotalUnits = ship2Products.reduce((s, x) => s + x.qty, 0);

  ship2Products.forEach(p => {
    const logisticsPerUnit = ship2TotalLogisticsEUR / ship2TotalUnits;
    const customsPerUnit = ship2TotalCustomsEUR / ship2TotalUnits;
    const itemIds: string[] = [];
    for (let i = 1; i <= p.qty; i++) {
      const itemId = generateItemId(p.cat, p.name, idx++);
      itemIds.push(itemId);
      const totalCostEUR = p.eur + logisticsPerUnit + customsPerUnit;
      const costBYN = totalCostEUR * 3.55; // курс месяц назад
      inventory.push({
        id: itemId,
        shipmentId: ship2Id,
        batchCode: batch2,
        productName: p.name,
        shortName: p.short || p.name,
        category: p.cat,
        status: 'in_stock',
        purchaseCurrency: 'EUR',
        purchasePriceOriginal: totalCostEUR,
        costPriceBYN: Math.round(costBYN * 100) / 100,
        retailPrice: p.ret,
        createdAt: new Date(now.getFullYear(), now.getMonth() - 1, 5).toISOString()
      });
    }
    ship2Items.push({
      id: `si-2-${p.cat}`,
      productName: p.name,
      shortName: p.short || p.name,
      category: p.cat,
      quantity: p.qty,
      purchaseCurrency: 'EUR',
      purchasePricePerUnit: p.eur,
      logisticsPerUnit: Math.round(logisticsPerUnit * 100) / 100,
      customsPerUnit: Math.round(customsPerUnit * 100) / 100,
      retailPrice: p.ret,
      createdItemIds: itemIds
    });
  });

  shipments.push({
    id: ship2Id,
    batchCode: batch2,
    supplierId: 's-3',
    date: new Date(now.getFullYear(), now.getMonth() - 1, 5).toISOString(),
    totalLogistics: ship2TotalLogisticsEUR,
    totalCustoms: ship2TotalCustomsEUR,
    logisticsCurrency: 'EUR',
    customsCurrency: 'EUR',
    exchangeRates: { USD: 3.42, EUR: 3.55, CNY: 0.47, RUB: 0.038, BYN: 1 },
    items: ship2Items,
    notes: 'Премиум гонги из Германии под заказ студии',
    createdAt: new Date(now.getFullYear(), now.getMonth() - 1, 5).toISOString()
  });

  // === Поставка 3 (этот месяц) ===
  const ship3Items: Shipment['items'] = [];
  const ship3Id = 'ship-3';
  const ship3Products = [
    { name: 'Тибетская чаша 7 металлов 18 см подарочная коробка', short: 'Чаша 7 металлов 18', cat: 'Тибетская чаша', qty: 6, rub: 3200, ret: 195 },
    { name: 'Шейкер кожаный «Земля» натуральная кожа', short: 'Шейкер «Земля»', cat: 'Шейкер', qty: 10, rub: 1450, ret: 85 },
    { name: 'Rainstick 50 см палочка дождя премиум', short: 'Rainstick 50см', cat: 'Rainstick', qty: 4, rub: 2800, ret: 165 }
  ];
  const ship3TotalUnits = ship3Products.reduce((s, x) => s + x.qty, 0);
  const ship3LogisticsRUB = 8500;
  const ship3CustomsRUB = 4200;

  ship3Products.forEach(p => {
    const logisticsPerUnit = ship3LogisticsRUB / ship3TotalUnits;
    const customsPerUnit = ship3CustomsRUB / ship3TotalUnits;
    const itemIds: string[] = [];
    for (let i = 1; i <= p.qty; i++) {
      const itemId = generateItemId(p.cat, p.name, idx++);
      itemIds.push(itemId);
      const totalCostRUB = p.rub + logisticsPerUnit + customsPerUnit;
      const costBYN = totalCostRUB * 0.038; // курс RUB к BYN
      inventory.push({
        id: itemId,
        shipmentId: ship3Id,
        batchCode: batch3,
        productName: p.name,
        shortName: p.short || p.name,
        category: p.cat,
        status: 'in_stock',
        purchaseCurrency: 'RUB',
        purchasePriceOriginal: totalCostRUB,
        costPriceBYN: Math.round(costBYN * 100) / 100,
        retailPrice: p.ret,
        createdAt: new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      });
    }
    ship3Items.push({
      id: `si-3-${p.cat}`,
      productName: p.name,
      shortName: p.short || p.name,
      category: p.cat,
      quantity: p.qty,
      purchaseCurrency: 'RUB',
      purchasePricePerUnit: p.rub,
      logisticsPerUnit: Math.round(logisticsPerUnit * 100) / 100,
      customsPerUnit: Math.round(customsPerUnit * 100) / 100,
      retailPrice: p.ret,
      createdItemIds: itemIds
    });
  });

  shipments.push({
    id: ship3Id,
    batchCode: batch3,
    supplierId: 's-2',
    date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    totalLogistics: ship3LogisticsRUB,
    totalCustoms: ship3CustomsRUB,
    logisticsCurrency: 'RUB',
    customsCurrency: 'RUB',
    exchangeRates: { USD: 3.48, EUR: 3.62, CNY: 0.48, RUB: 0.038, BYN: 1 },
    items: ship3Items,
    notes: 'Регулярная поставка из РФ, наземный транспорт',
    createdAt: new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  });

  // === Помечаем некоторые товары как проданные (для отчётов) ===
  const itemsSold = inventory.slice(0, 18).map(i => i.id);

  // === Клиенты ===
  const sampleClients: Omit<Client, 'createdAt' | 'totalPurchases'>[] = [
    { id: 'c-1', name: 'Ирина Минск', phone: '+375291234567', city: 'Минск' },
    { id: 'c-2', name: 'Андрей Гродно', phone: '+375336543210', city: 'Гродно' },
    { id: 'c-3', name: 'Студия «Гармония»', phone: '+375173456789', city: 'Минск', email: 'harmony@studio.by' },
    { id: 'c-4', name: 'Юлия Брест', phone: '+375259876543', city: 'Брест' },
    { id: 'c-5', name: 'Олег Гомель', phone: '+375447654321', city: 'Гомель' }
  ];
  sampleClients.forEach(c => {
    clients.push({ ...c, createdAt: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), totalPurchases: 0 });
  });

  // === Продажи (для отчётов) ===
  itemsSold.forEach((itemId, idx) => {
    const item = inventory.find(i => i.id === itemId)!;
    const client = clients[idx % clients.length];
    const saleNumber = 1000 + idx;
    const manager = INITIAL_USERS[idx % 3 + 1];
    const sale: Sale = {
      id: `sale-${idx}`,
      number: `#${saleNumber}`,
      managerId: manager.id,
      managerName: manager.name,
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      items: [{
        itemId: item.id,
        productName: item.productName,
        batchCode: item.batchCode,
        unitPrice: item.retailPrice,
        quantity: idx % 3 === 0 ? 2 : 1,
        individualDiscount: idx % 4 === 0 ? 5 : 0,
        finalPrice: item.retailPrice * (1 - (idx % 4 === 0 ? 0.05 : 0)) * (idx % 3 === 0 ? 2 : 1)
      }],
      subtotal: item.retailPrice * (idx % 3 === 0 ? 2 : 1),
      totalDiscountAmount: idx % 4 === 0 ? item.retailPrice * 0.05 * (idx % 3 === 0 ? 2 : 1) : 0,
      totalDiscountPercent: idx % 4 === 0 ? 5 : 0,
      totalAmount: (idx % 4 === 0 ? item.retailPrice * 0.95 : item.retailPrice) * (idx % 3 === 0 ? 2 : 1),
      paymentMethod: ['cash', 'card', 'transfer'][idx % 3] as any,
      globalDiscount: 0,
      sentToTelegram: false,
      createdAt: new Date(now.getFullYear(), now.getMonth() - Math.floor(idx / 6), idx % 28 + 1, 10 + (idx % 8), 30).toISOString()
    };
    sales.push(sale);
    item.status = 'sold';
    item.soldAt = sale.createdAt;
    item.saleId = sale.id;
    client.totalPurchases += sale.totalAmount;
  });

  return { shipments, inventory, sales, clients };
}

export { INITIAL_USERS, INITIAL_SUPPLIERS };

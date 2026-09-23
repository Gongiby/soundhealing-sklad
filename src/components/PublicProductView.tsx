import { InventoryItem } from '../types';
import { formatCurrency } from '../store';
import { Package, ShoppingBag, MessageCircle } from 'lucide-react';

interface Props {
  item: InventoryItem;
}

// Публичная карточка — что видит клиент при сканировании QR без логина
export function PublicProductView({ item }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-amber-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white font-bold">
              SH
            </div>
            <div className="text-left">
              <p className="font-display font-bold text-base text-stone-900 dark:text-stone-100">SoundHealing.by</p>
              <p className="text-[10px] text-stone-500">Авторские звуковые инструменты</p>
            </div>
          </div>
        </div>

        {/* Product card */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-amber-200 dark:border-amber-900 shadow-2xl overflow-hidden">
          {/* Visual */}
          <div className="aspect-square bg-gradient-to-br from-amber-200 to-amber-400 dark:from-amber-900 dark:to-amber-700 relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 shadow-2xl flex items-center justify-center pulse-ring">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-300 to-amber-500" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Package className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>
            {/* Sound waves */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-1 h-8">
              {[0.4, 0.7, 1, 0.6, 0.8, 0.5, 0.9, 0.6].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-white/70 rounded-full sound-wave"
                  style={{ height: `${h * 100}%`, animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-semibold mb-1">
                {item.category}
              </p>
              <h1 className="font-display text-2xl font-bold text-stone-900 dark:text-stone-100">
                {item.productName}
              </h1>
            </div>

            <div className="pt-4 border-t border-stone-200 dark:border-stone-800">
              <p className="text-xs text-stone-500 mb-1">Цена</p>
              <p className="font-display text-3xl font-bold text-amber-700 dark:text-amber-400">
                {formatCurrency(item.retailPrice)}
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-800">
              <p className="text-xs text-stone-500">Характеристики:</p>
              <ul className="text-sm space-y-1 text-stone-700 dark:text-stone-300">
                <li>• Категория: {item.category}</li>
                <li>• В наличии — можно забрать или заказать доставку</li>
                <li>• Партия: {item.batchCode}</li>
              </ul>
            </div>

            <div className="space-y-2 pt-4 border-t border-stone-200 dark:border-stone-800">
              <a
                href="https://soundhealing.by"
                className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-2xl font-display font-bold transition shadow-lg shadow-amber-500/30"
              >
                <ShoppingBag className="w-4 h-4" />
                Купить на сайте
              </a>
              <a
                href="https://t.me/soundhealing_by"
                className="flex items-center justify-center gap-2 w-full py-3 bg-sky-100 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-950/50 rounded-2xl font-display font-semibold transition"
              >
                <MessageCircle className="w-4 h-4" />
                Спросить в Telegram
              </a>
            </div>
          </div>

          <div className="px-6 pb-4 text-center">
            <p className="text-[10px] text-stone-400">
              SoundHealing.by · Минск · +375 29 123-45-67
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Простой onboarding для нового пользователя
// Показывает подсказки при первом входе

const ONBOARDING_KEY = 'sh_onboarding_done';

export function isOnboardingDone(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

export function markOnboardingDone(): void {
  localStorage.setItem(ONBOARDING_KEY, 'true');
}

export function resetOnboarding(): void {
  localStorage.removeItem(ONBOARDING_KEY);
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  action?: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: '👋 Добро пожаловать в SoundHealing.by!',
    description: 'Это система управления магазином звукотерапии. Пройдите 5 шагов чтобы настроить всё за 5 минут.',
    icon: '👋'
  },
  {
    id: 'password',
    title: '🔐 Смените пароли',
    description: 'Сейчас у вас дефолтные пароли (admin/belka2026, manager/1234). Откройте Настройки → Пользователи → 🔑 и смените их. Это критично для безопасности!',
    icon: '🔐',
    action: 'Перейти в Настройки'
  },
  {
    id: 'telegram',
    title: '🤖 Подключите Telegram (опционально)',
    description: 'Создайте бота через @BotFather, получите токен. Вставьте в Настройки → Telegram-бот. После этого каждая продажа будет присылать вам уведомление.',
    icon: '🤖'
  },
  {
    id: 'cloud',
    title: '☁️ Подключите облако (опционально)',
    description: 'Если работает несколько менеджеров — подключите Supabase. Это бесплатно. Без этого каждый видит данные только на своём устройстве.',
    icon: '☁️'
  },
  {
    id: 'first-sale',
    title: '🎯 Готово! Сделайте первую продажу',
    description: 'Откройте Сканер → включите камеру → отсканируйте QR-код инструмента → выберите клиента → Оформить. Если QR-кодов ещё нет — добавьте поставку.',
    icon: '🎯'
  }
];

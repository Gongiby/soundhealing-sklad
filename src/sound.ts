// Звуковые эффекты через Web Audio API
// Не требуют файлов — генерируются программно

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    audioContext = new AudioCtx();
    return audioContext;
  } catch {
    return null;
  }
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Разблокировать аудио контекст (требуется после первого взаимодействия пользователя)
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch {
    // Ignore audio errors
  }
}

export const sounds = {
  // Успешное сканирование — приятный короткий звук
  scanSuccess(): void {
    playTone(880, 0.1, 'sine', 0.25); // A5
    setTimeout(() => playTone(1320, 0.08, 'sine', 0.2), 80); // E6
  },

  // Ошибка — низкий звук
  scanError(): void {
    playTone(220, 0.2, 'square', 0.2);
  },

  // Успешная продажа — мелодия
  saleSuccess(): void {
    playTone(523, 0.1, 'sine', 0.25); // C5
    setTimeout(() => playTone(659, 0.1, 'sine', 0.25), 100); // E5
    setTimeout(() => playTone(784, 0.15, 'sine', 0.25), 200); // G5
  },

  // Клик (универсальный)
  click(): void {
    playTone(1000, 0.05, 'sine', 0.15);
  },

  // Уведомление (звонкий)
  notification(): void {
    playTone(1200, 0.08, 'sine', 0.2);
    setTimeout(() => playTone(1500, 0.08, 'sine', 0.2), 100);
  },

  // Ошибка/предупреждение (двойной низкий)
  warning(): void {
    playTone(440, 0.15, 'square', 0.2);
    setTimeout(() => playTone(440, 0.15, 'square', 0.2), 200);
  }
};

// Настройка: включить/выключить звуки (сохраняется в localStorage)
const SOUND_ENABLED_KEY = 'sh_sound_enabled';

export function isSoundEnabled(): boolean {
  const stored = localStorage.getItem(SOUND_ENABLED_KEY);
  return stored !== 'false'; // по умолчанию включено
}

export function setSoundEnabled(enabled: boolean): void {
  localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
}

// Обёртки с проверкой настройки
export const playSound = {
  scanSuccess: () => isSoundEnabled() && sounds.scanSuccess(),
  scanError: () => isSoundEnabled() && sounds.scanError(),
  saleSuccess: () => isSoundEnabled() && sounds.saleSuccess(),
  click: () => isSoundEnabled() && sounds.click(),
  notification: () => isSoundEnabled() && sounds.notification(),
  warning: () => isSoundEnabled() && sounds.warning()
};

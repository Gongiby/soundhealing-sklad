// Простая система авторизации через localStorage
// Пароли хэшируются через простой SHA-256 (через Web Crypto API)

export interface AuthSession {
  userId: string;
  loginTime: string;
  expiresAt: string;
  token: string; // простой токен сессии
}

export interface UserCredentials {
  userId: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

const STORAGE_KEYS = {
  session: 'sh_auth_session',
  credentials: 'sh_credentials',
  users: 'sh_users'
};

// Хэширование пароля через Web Crypto API (с fallback)
export async function hashPassword(password: string): Promise<string> {
  const salted = password + '::belka_salt_2026';

  // Проверяем поддержку Web Crypto API
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(salted);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback: простой хэш (для очень старых браузеров)
  return simpleHash(salted);
}

// Простой fallback-хэш (для старых браузеров без Web Crypto)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  // Возвращаем 8-символьный хэш + повтор для 64 символов
  const part = Math.abs(hash).toString(16).padStart(8, '0');
  return (part + part + part + part + part + part + part + part).substring(0, 64);
}

// Проверка пароля
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}

// Генерация токена сессии
function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Загрузить все credentials
export function loadCredentials(): UserCredentials[] {
  const stored = localStorage.getItem(STORAGE_KEYS.credentials);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

// Сохранить credentials
export function saveCredentials(creds: UserCredentials[]): void {
  localStorage.setItem(STORAGE_KEYS.credentials, JSON.stringify(creds));
}

// Загрузить текущую сессию
export function loadSession(): AuthSession | null {
  const stored = localStorage.getItem(STORAGE_KEYS.session);
  if (!stored) return null;

  try {
    const session: AuthSession = JSON.parse(stored);
    // Проверяем срок
    if (new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem(STORAGE_KEYS.session);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

// Сохранить сессию
export function saveSession(session: AuthSession): void {
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
}

// Войти
export async function login(username: string, password: string): Promise<{ success: boolean; userId?: string; error?: string }> {
  const creds = loadCredentials();
  const cred = creds.find(c => c.username.toLowerCase() === username.toLowerCase());

  if (!cred) {
    return { success: false, error: 'Пользователь не найден' };
  }

  const valid = await verifyPassword(password, cred.passwordHash);
  if (!valid) {
    return { success: false, error: 'Неверный пароль' };
  }

  // Создаём сессию на 7 дней
  const loginTime = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const token = generateToken();

  const session: AuthSession = {
    userId: cred.userId,
    loginTime,
    expiresAt,
    token
  };

  saveSession(session);
  return { success: true, userId: cred.userId };
}

// Выйти
export function logout(): void {
  localStorage.removeItem(STORAGE_KEYS.session);
}

// Сменить пароль
export async function changePassword(userId: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const creds = loadCredentials();
  const idx = creds.findIndex(c => c.userId === userId);

  if (idx === -1) {
    return { success: false, error: 'Пользователь не найден' };
  }

  const valid = await verifyPassword(oldPassword, creds[idx].passwordHash);
  if (!valid) {
    return { success: false, error: 'Неверный текущий пароль' };
  }

  creds[idx].passwordHash = await hashPassword(newPassword);
  saveCredentials(creds);
  return { success: true };
}

// Сброс пароля админом
export async function adminResetPassword(userId: string, newPassword: string): Promise<void> {
  const creds = loadCredentials();
  const idx = creds.findIndex(c => c.userId === userId);
  if (idx !== -1) {
    creds[idx].passwordHash = await hashPassword(newPassword);
    saveCredentials(creds);
  }
}

// Создать пользователя с паролем
export async function createUserCredentials(userId: string, username: string, password: string): Promise<void> {
  const creds = loadCredentials();
  const exists = creds.find(c => c.userId === userId);
  if (exists) return;

  creds.push({
    userId,
    username,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString()
  });
  saveCredentials(creds);
}

// Инициализация дефолтных пользователей (при первом запуске)
export async function initDefaultUsers(): Promise<void> {
  const creds = loadCredentials();
  if (creds.length > 0) return; // уже инициализированы

  // Дефолтные логины/пароли для первого запуска
  // Директору: admin / belka2026
  // Менеджерам: manager / 1234
  const defaults = [
    { userId: 'u-1', username: 'admin', password: 'belka2026' },
    { userId: 'u-2', username: 'manager', password: '1234' },
    { userId: 'u-3', username: 'misha', password: '1234' },
    { userId: 'u-4', username: 'dasha', password: '1234' }
  ];

  for (const d of defaults) {
    await createUserCredentials(d.userId, d.username, d.password);
  }
}

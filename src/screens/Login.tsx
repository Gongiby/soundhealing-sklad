import { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { login, initDefaultUsers } from '../auth';
import { Flame, Lock, User as UserIcon, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

export function Login() {
  const { users, setCurrentUser } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    initDefaultUsers().then(() => setInitializing(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login(username, password);

    if (result.success && result.userId) {
      const user = users.find(u => u.id === result.userId);
      if (user) {
        setCurrentUser(user);
      } else {
        setError('Ошибка: пользователь не найден в базе');
      }
    } else {
      setError(result.error || 'Ошибка входа');
    }
    setLoading(false);
  };

  const handleQuickLogin = async (loginName: string, defaultPassword: string) => {
    setUsername(loginName);
    setPassword(defaultPassword);
    setError(null);
    setLoading(true);
    const result = await login(loginName, defaultPassword);
    if (result.success && result.userId) {
      const user = users.find(u => u.id === result.userId);
      if (user) setCurrentUser(user);
    } else {
      setError(result.error || 'Ошибка входа');
    }
    setLoading(false);
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950">
        <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-stone-50 to-orange-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 text-white shadow-lg shadow-amber-500/30 mb-3 pulse-ring">
            <Flame className="w-8 h-8" />
          </div>
          <h1 className="font-display text-3xl font-bold text-stone-900 dark:text-stone-100">
            SoundHealing.by
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            Система управления магазином
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl p-6 sm:p-8 space-y-5">
          <div className="text-center">
            <h2 className="font-display font-bold text-xl text-stone-900 dark:text-stone-100">
              Вход в систему
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Введите логин и пароль
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                👤 Логин
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="admin или manager"
                  autoFocus
                  autoComplete="username"
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                🔒 Пароль
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-display font-bold transition shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Входим...
                </>
              ) : (
                'Войти'
              )}
            </button>
          </form>

          {/* Quick login */}
          <div className="pt-4 border-t border-stone-200 dark:border-stone-800">
            <p className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 text-center mb-2">
              Быстрый вход (демо):
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleQuickLogin('admin', 'belka2026')}
                disabled={loading}
                className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-lg text-xs transition text-left"
              >
                <p className="font-bold text-amber-700 dark:text-amber-400">👑 Директор</p>
                <p className="text-[10px] text-stone-500">admin / belka2026</p>
              </button>
              <button
                onClick={() => handleQuickLogin('manager', '1234')}
                disabled={loading}
                className="px-3 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-lg text-xs transition text-left"
              >
                <p className="font-bold text-stone-700 dark:text-stone-300">🛒 Менеджер</p>
                <p className="text-[10px] text-stone-500">manager / 1234</p>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-stone-400 dark:text-stone-500 mt-4">
          Сессия активна 7 дней · Данные хранятся локально
        </p>
      </div>
    </div>
  );
}

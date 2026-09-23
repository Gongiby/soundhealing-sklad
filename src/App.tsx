import { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { loadSession, logout } from './auth';
import { Login } from './screens/Login';
import { Dashboard } from './screens/Dashboard';
import { Scanner } from './screens/Scanner';
import { Inventory } from './screens/Inventory';
import { Reservations } from './screens/Reservations';
import { CashRegister } from './screens/CashRegister';
import { Shipments } from './screens/Shipments';
import { AuditLogScreen } from './screens/AuditLog';
import { Sales } from './screens/Sales';
import { Reports } from './screens/Reports';
import { Settings } from './screens/Settings';
import { ProductDetailModal } from './components/ProductDetailModal';
import { PublicProductView } from './components/PublicProductView';
import { ReservationModal } from './components/ReservationModal';
import { GlobalSearch } from './components/GlobalSearch';
import { OnboardingModal } from './components/OnboardingModal';
import { isOnboardingDone } from './onboarding';
import { InventoryItem } from './types';
import {
  LayoutDashboard,
  ScanLine,
  Package,
  Truck,
  Receipt,
  BarChart3,
  Settings as SettingsIcon,
  Bell,
  Moon,
  Sun,
  Circle,
  User as UserIcon,
  Calendar,
  Calculator,
  Search,
  History,
  Monitor
} from 'lucide-react';

type Tab = 'dashboard' | 'scanner' | 'inventory' | 'reservations' | 'cash' | 'shipments' | 'sales' | 'reports' | 'audit' | 'settings';

export default function App() {
  const { currentUser, darkMode, setDarkMode, setCurrentUser, users, telegram, inventory } = useApp();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const [reservingItem, setReservingItem] = useState<InventoryItem | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(!isOnboardingDone());

  // Режим терминала (только продажи — скрывает админские разделы)
  const [terminalMode, setTerminalMode] = useState<boolean>(() => {
    return localStorage.getItem('sh_terminal_mode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sh_terminal_mode', String(terminalMode));
  }, [terminalMode]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  // Проверка сессии при загрузке
  useEffect(() => {
    const session = loadSession();
    if (session) {
      // Сессия есть — проверяем что пользователь существует
      const user = users.find(u => u.id === session.userId);
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
      }
    }
    setAuthChecked(true);
  }, [users]);

  // Обновляем isAuthenticated при смене currentUser
  useEffect(() => {
    if (currentUser && authChecked) {
      const session = loadSession();
      setIsAuthenticated(!!session && session.userId === currentUser.id);
    }
  }, [currentUser, authChecked]);

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
    setShowUserSwitcher(false);
  };

  // Глобальный поиск по Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Определяем режим публичного сканирования через URL
  // Если URL вида /#/scan/ITEM_ID — показываем публичную карточку (без логина)
  const [publicItemId, setPublicItemId] = useState<string | null>(() => {
    const hash = window.location.hash;
    const match = hash.match(/#\/scan\/([A-Z0-9\-]+)$/i);
    return match ? match[1] : null;
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const match = hash.match(/#\/scan\/([A-Z0-9\-]+)$/i);
      setPublicItemId(match ? match[1] : null);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Если не авторизован — экран логина
  if (!isAuthenticated) {
    return <Login />;
  }

  // Если это публичный режим — показываем только публичную карточку
  if (publicItemId) {
    const publicItem = inventory.find(i => i.id === publicItemId);
    if (publicItem) {
      return <PublicProductView item={publicItem} />;
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950 p-4">
        <div className="text-center max-w-md">
          <h1 className="font-display text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">
            Товар не найден
          </h1>
          <p className="text-sm text-stone-500">
            Возможно, инструмент был продан или этикетка повреждена. Свяжитесь с нами для уточнения.
          </p>
          <a
            href="https://soundhealing.by"
            className="inline-block mt-4 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold"
          >
            На главную
          </a>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser.role === 'admin';
  // В терминальном режиме директор тоже видит только базовые разделы
  const effectiveIsAdmin = isAdmin && !terminalMode;

  const navItems: { id: Tab; label: string; icon: any; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Дашборд', icon: LayoutDashboard },
    { id: 'scanner', label: 'Сканер', icon: ScanLine },
    { id: 'inventory', label: 'Склад', icon: Package },
    { id: 'reservations', label: 'Резервы', icon: Calendar },
    { id: 'cash', label: 'Касса', icon: Calculator },
    { id: 'shipments', label: 'Поставки', icon: Truck, adminOnly: true },
    { id: 'sales', label: 'Продажи', icon: Receipt },
    { id: 'reports', label: 'Отчёты', icon: BarChart3, adminOnly: true },
    { id: 'audit', label: 'История', icon: History },
    { id: 'settings', label: 'Настройки', icon: SettingsIcon, adminOnly: true }
  ];

  return (
    <div className="min-h-screen flex bg-stone-50 dark:bg-stone-950">
      {/* Sidebar (desktop) / Bottom nav (mobile) */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 sticky top-0 h-screen">
         <div className="p-5 border-b border-stone-200 dark:border-stone-800 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white font-bold">
              SH
            </div>
            <div>
              <h1 className="font-display font-bold text-base text-stone-900 dark:text-stone-100">SoundHealing</h1>
              <p className="text-xs text-stone-500 dark:text-stone-400">.by — система управления</p>
            </div>
          </div>

          {/* Кнопка поиска */}
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 bg-stone-100 dark:bg-stone-800/50 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-xl text-stone-500 dark:text-stone-400 transition group"
            title="Глобальный поиск (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-xs flex-1 text-left">Поиск...</span>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-stone-900 rounded border border-stone-200 dark:border-stone-700 text-[10px] font-mono group-hover:border-amber-400">
              ⌘K
            </kbd>
          </button>

          {/* Переключатель режима терминала */}
          {isAdmin && (
            <button
              onClick={() => {
                if (!terminalMode) {
                  if (confirm('Включить режим терминала?\n\nБудут скрыты:\n• Поставки\n• Отчёты\n• История\n• Настройки\n• Бэкапы\n\nТолько Сканер, Склад, Резервы, Касса, Продажи')) {
                    setTerminalMode(true);
                  }
                } else {
                  setTerminalMode(false);
                }
              }}
              className={`w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition ${
                terminalMode
                  ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200'
                  : 'bg-stone-50 dark:bg-stone-800/30 text-stone-600 dark:text-stone-400 hover:bg-stone-100'
              }`}
              title={terminalMode ? 'Режим терминала (упрощённый интерфейс)' : 'Полный режим'}
            >
              {terminalMode ? <Monitor className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
              <span className="flex-1 text-left">{terminalMode ? '🖥 Режим терминала' : '🖥 Полный режим'}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                terminalMode ? 'bg-amber-200 dark:bg-amber-900' : 'bg-stone-200 dark:bg-stone-700'
              }`}>
                {terminalMode ? 'ВКЛ' : 'ВЫКЛ'}
              </span>
            </button>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            if (item.adminOnly && !effectiveIsAdmin) return null;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  tab === item.id
                    ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/30'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer sidebar */}
        <div className="p-3 border-t border-stone-200 dark:border-stone-800">
          <button
            onClick={() => setShowUserSwitcher(!showUserSwitcher)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition relative"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white text-xs font-bold">
              {currentUser.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">{currentUser.name}</p>
              <p className="text-[10px] text-stone-500 dark:text-stone-400">
                {currentUser.role === 'admin' ? '👑 Директор' : 'Менеджер'}
              </p>
            </div>
          </button>

          {showUserSwitcher && (
            <div className="absolute bottom-20 left-3 right-3 lg:w-56 lg:left-auto lg:right-auto lg:bottom-16 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xl p-2 z-50">
              <p className="text-[10px] text-stone-500 dark:text-stone-400 px-2 py-1 uppercase font-semibold">Переключить роль</p>
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    setCurrentUser(u);
                    setShowUserSwitcher(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition ${
                    currentUser.id === u.id
                      ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                      : 'hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  <UserIcon className="w-3 h-3" />
                  <span className="flex-1 truncate">{u.name}</span>
                  {currentUser.id === u.id && <Circle className="w-2 h-2 fill-amber-600 text-amber-600" />}
                </button>
              ))}
              {/* Кнопка выхода */}
              <div className="border-t border-stone-200 dark:border-stone-800 mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <span className="w-3 h-3 flex items-center justify-center">🚪</span>
                  <span className="flex-1">Выйти из аккаунта</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 mt-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{darkMode ? 'Свет' : 'Тьма'}</span>
            </button>
            {telegram.notificationsEnabled && (
              <div className="px-2 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                <Bell className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white font-bold text-xs">
              SH
            </div>
            <div>
              <p className="text-sm font-display font-bold text-stone-900 dark:text-stone-100">SoundHealing</p>
              <p className="text-[10px] text-stone-500 dark:text-stone-400">{currentUser.role === 'admin' ? 'Директор' : 'Менеджер'}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 relative"
            >
              <Bell className="w-4 h-4 text-stone-600 dark:text-stone-300" />
              {telegram.notificationsEnabled && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-600" />}
            </button>
            <button
              onClick={() => setShowUserSwitcher(!showUserSwitcher)}
              className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 relative"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white text-[10px] font-bold">
                {currentUser.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>
            </button>
          </div>
        </div>

        {showUserSwitcher && (
          <div className="absolute right-3 top-14 w-56 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xl p-2 z-50">
            <p className="text-[10px] text-stone-500 dark:text-stone-400 px-2 py-1 uppercase font-semibold">Переключить роль</p>
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => {
                  setCurrentUser(u);
                  setShowUserSwitcher(false);
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition ${
                  currentUser.id === u.id
                    ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                    : 'hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <UserIcon className="w-3 h-3" />
                <span className="flex-1 truncate">{u.name}</span>
              </button>
            ))}
            {/* Кнопка выхода */}
            <div className="border-t border-stone-200 dark:border-stone-800 mt-1 pt-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <span className="w-3 h-3 flex items-center justify-center">🚪</span>
                <span className="flex-1">Выйти из аккаунта</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 pt-16 lg:pt-0 pb-20 lg:pb-0">
        {tab === 'dashboard' && <Dashboard onTabChange={setTab} onItemSelect={setSelectedItem} />}
        {tab === 'scanner' && <Scanner onItemSelect={setSelectedItem} />}
        {tab === 'inventory' && <Inventory onItemSelect={setSelectedItem} />}
        {tab === 'reservations' && <Reservations />}
        {tab === 'cash' && <CashRegister />}
        {tab === 'shipments' && effectiveIsAdmin && <Shipments />}
        {tab === 'sales' && <Sales onSaleSelect={() => {}} />}
        {tab === 'reports' && effectiveIsAdmin && <Reports />}
        {tab === 'audit' && <AuditLogScreen />}
        {tab === 'settings' && effectiveIsAdmin && <Settings />}
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 z-30">
        <div className="flex justify-around items-center px-1 py-2">
          {navItems.filter(i => !i.adminOnly || isAdmin).slice(0, 5).map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition ${
                  tab === item.id
                    ? 'text-amber-600'
                    : 'text-stone-500 dark:text-stone-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals */}
      {selectedItem && (
        <ProductDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          isAdmin={isAdmin}
          onReserve={() => {
            setReservingItem(selectedItem);
            setSelectedItem(null);
          }}
        />
      )}

      {/* Reservation Modal */}
      {reservingItem && (
        <ReservationModal
          item={reservingItem}
          onClose={() => setReservingItem(null)}
        />
      )}

      {/* Глобальный поиск */}
      <GlobalSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={(tab) => setTab(tab as Tab)}
        onSelectProduct={(id) => {
          const item = inventory.find(i => i.id === id);
          if (item) setSelectedItem(item);
        }}
      />

      {/* Onboarding для нового пользователя */}
      {onboardingOpen && (
        <OnboardingModal
          onClose={() => setOnboardingOpen(false)}
          onNavigate={(tab) => setTab(tab as Tab)}
        />
      )}
    </div>
  );
}

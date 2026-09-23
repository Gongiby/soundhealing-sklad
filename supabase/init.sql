-- ============================================
-- SoundHealing.by — Supabase Schema
-- ============================================
-- Запустите этот скрипт в Supabase SQL Editor
-- https://supabase.com/dashboard/project/_/sql

-- ============================================
-- 1. ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ
-- ============================================
CREATE TABLE IF NOT EXISTS sh_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager')),
  username TEXT UNIQUE,
  password_hash TEXT,
  telegram_id TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. ТАБЛИЦА ПОСТАВЩИКОВ
-- ============================================
CREATE TABLE IF NOT EXISTS sh_suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT,
  contact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. ТАБЛИЦА КЛИЕНТОВ
-- ============================================
CREATE TABLE IF NOT EXISTS sh_clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  telegram_id TEXT,
  city TEXT,
  total_purchases DECIMAL(12, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. ТАБЛИЦА ПОСТАВОК
-- ============================================
CREATE TABLE IF NOT EXISTS sh_shipments (
  id TEXT PRIMARY KEY,
  batch_code TEXT NOT NULL,
  supplier_id TEXT REFERENCES sh_suppliers(id),
  date TIMESTAMPTZ NOT NULL,
  total_logistics DECIMAL(12, 2) DEFAULT 0,
  total_customs DECIMAL(12, 2) DEFAULT 0,
  logistics_currency TEXT DEFAULT 'USD',
  customs_currency TEXT DEFAULT 'USD',
  exchange_rates JSONB DEFAULT '{}'::jsonb,
  items JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sh_shipments_batch ON sh_shipments(batch_code);

-- ============================================
-- 5. ТАБЛИЦА СКЛАДА (каждая единица отдельно)
-- ============================================
CREATE TABLE IF NOT EXISTS sh_inventory (
  id TEXT PRIMARY KEY,
  shipment_id TEXT REFERENCES sh_shipments(id) ON DELETE CASCADE,
  batch_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  short_name TEXT,
  category TEXT,
  status TEXT DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'reserved', 'sold', 'in_transit')),
  purchase_currency TEXT DEFAULT 'USD',
  purchase_price_original DECIMAL(12, 2),
  cost_price_byn DECIMAL(12, 4),
  retail_price DECIMAL(12, 2) NOT NULL,
  reserved_for TEXT,
  reserved_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,
  sale_id TEXT,
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sh_inventory_batch ON sh_inventory(batch_code);
CREATE INDEX IF NOT EXISTS idx_sh_inventory_status ON sh_inventory(status);
CREATE INDEX IF NOT EXISTS idx_sh_inventory_shipment ON sh_inventory(shipment_id);

-- ============================================
-- 6. ТАБЛИЦА ПРОДАЖ (чеки)
-- ============================================
CREATE TABLE IF NOT EXISTS sh_sales (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  manager_id TEXT REFERENCES sh_users(id),
  manager_name TEXT NOT NULL,
  client_id TEXT REFERENCES sh_clients(id),
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_telegram_id TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal DECIMAL(12, 2) NOT NULL,
  total_discount_amount DECIMAL(12, 2) DEFAULT 0,
  total_discount_percent DECIMAL(5, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  global_discount DECIMAL(5, 2) DEFAULT 0,
  notes TEXT,
  sent_to_telegram BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sh_sales_created ON sh_sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sh_sales_manager ON sh_sales(manager_id);
CREATE INDEX IF NOT EXISTS idx_sh_sales_client ON sh_sales(client_id);

-- ============================================
-- 7. ТАБЛИЦА TELEGRAM НАСТРОЕК (одна строка)
-- ============================================
CREATE TABLE IF NOT EXISTS sh_telegram_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  bot_token TEXT,
  admin_chat_id TEXT,
  notifications_enabled BOOLEAN DEFAULT FALSE,
  send_receipts_to_clients BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (id = 1)
);

-- ============================================
-- 8. ROW LEVEL SECURITY (RLS) — безопасность
-- ============================================

-- Включаем RLS на всех таблицах
ALTER TABLE sh_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sh_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sh_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sh_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sh_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sh_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sh_telegram_settings ENABLE ROW LEVEL SECURITY;

-- Политики: разрешаем ВСЁ для аутентифицированных пользователей
-- (для нашего случая это нормально — авторизация уже сделана на клиенте)

DROP POLICY IF EXISTS "Allow all for authenticated" ON sh_users;
CREATE POLICY "Allow all for authenticated" ON sh_users
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON sh_suppliers;
CREATE POLICY "Allow all for authenticated" ON sh_suppliers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON sh_clients;
CREATE POLICY "Allow all for authenticated" ON sh_clients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON sh_shipments;
CREATE POLICY "Allow all for authenticated" ON sh_shipments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON sh_inventory;
CREATE POLICY "Allow all for authenticated" ON sh_inventory
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON sh_sales;
CREATE POLICY "Allow all for authenticated" ON sh_sales
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON sh_telegram_settings;
CREATE POLICY "Allow all for authenticated" ON sh_telegram_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- 9. REALTIME (реалтайм-обновления)
-- ============================================

-- Включаем realtime для основных таблиц
ALTER PUBLICATION supabase_realtime ADD TABLE sh_shipments;
ALTER PUBLICATION supabase_realtime ADD TABLE sh_inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE sh_sales;
ALTER PUBLICATION supabase_realtime ADD TABLE sh_clients;
ALTER PUBLICATION supabase_realtime ADD TABLE sh_suppliers;
ALTER PUBLICATION supabase_realtime ADD TABLE sh_users;

-- ============================================
-- 10. ТРИГГЕРЫ (автообновление updated_at)
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_users_updated ON sh_users;
CREATE TRIGGER tr_users_updated BEFORE UPDATE ON sh_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_suppliers_updated ON sh_suppliers;
CREATE TRIGGER tr_suppliers_updated BEFORE UPDATE ON sh_suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_clients_updated ON sh_clients;
CREATE TRIGGER tr_clients_updated BEFORE UPDATE ON sh_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_shipments_updated ON sh_shipments;
CREATE TRIGGER tr_shipments_updated BEFORE UPDATE ON sh_shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_inventory_updated ON sh_inventory;
CREATE TRIGGER tr_inventory_updated BEFORE UPDATE ON sh_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_sales_updated ON sh_sales;
CREATE TRIGGER tr_sales_updated BEFORE UPDATE ON sh_sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 11. ДЕФОЛТНЫЕ ДАННЫЕ (опционально)
-- ============================================

-- Дефолтные пользователи (пароли: admin/belka2026, manager/1234)
-- Хэши будут добавлены автоматически при первом запуске приложения

INSERT INTO sh_users (id, name, role, username) VALUES
  ('u-1', 'Ольга (директор)', 'admin', 'admin'),
  ('u-2', 'Аня Петрова', 'manager', 'manager'),
  ('u-3', 'Михаил К.', 'manager', 'misha'),
  ('u-4', 'Дарья С.', 'manager', 'dasha')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ГОТОВО! 🎉
-- ============================================
-- После выполнения этого скрипта:
-- 1. Скопируйте URL проекта и anon key из настроек Supabase
-- 2. Вставьте их в src/supabaseClient.ts
-- 3. Запустите приложение — оно автоматически синхронизируется с облаком

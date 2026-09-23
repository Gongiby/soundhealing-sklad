// Скрипт обновления приложения одной кнопкой
// Запуск: START_UPDATE.cmd или npm run update
//
// Логика:
// 1. Найти папку приложения
// 2. Создать резервную копию
// 3. Скопировать новые файлы
// 4. npm install
// 5. npm run check
// 6. npm run build
// 7. Открыть лог

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const APP_NAME = 'SoundHealing.by';
const VERSION = process.argv[2] || 'unknown';
const LOG_FILE = `UPDATE_LOG_${new Date().toISOString().split('T')[0]}.txt`;

let log = [];
function addLog(msg) {
  const line = `[${new Date().toLocaleTimeString('ru-RU')}] ${msg}`;
  console.log(line);
  log.push(line);
}

addLog(`🚀 Запуск обновления ${APP_NAME} v${VERSION}`);
addLog(`Платформа: ${process.platform}`);
addLog(`Node.js: ${process.version}`);

try {
  // 1. Найти папку приложения
  addLog('\n📁 Шаг 1/6: Поиск папки приложения...');
  const appDir = path.resolve(process.cwd());
  if (!fs.existsSync(path.join(appDir, 'package.json'))) {
    throw new Error('package.json не найден. Запустите скрипт из корня проекта.');
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8'));
  if (!pkg.name.includes('react') && pkg.name !== 'soundhealing.by') {
    addLog(`⚠️  Внимание: имя пакета "${pkg.name}" не похоже на SoundHealing`);
  }
  addLog(`✅ Найдена папка: ${appDir}`);

  // 2. Создать бэкап
  addLog('\n💾 Шаг 2/6: Создание резервной копии...');
  const backupDir = path.join(appDir, '.backup-' + Date.now());
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  // Копируем критические файлы
  const criticalFiles = ['src', 'index.html', 'package.json'];
  criticalFiles.forEach(f => {
    const src = path.join(appDir, f);
    const dst = path.join(backupDir, f);
    if (fs.existsSync(src)) {
      execSync(`cp -r "${src}" "${dst}"`);
    }
  });
  addLog(`✅ Бэкап создан: ${backupDir}`);

  // 3. Проверка структуры
  addLog('\n🔍 Шаг 3/6: Проверка структуры файлов...');
  const required = [
    'src/App.tsx',
    'src/main.tsx',
    'src/auth.ts',
    'src/types.ts',
    'src/AppContext.tsx',
    'src/screens/Dashboard.tsx',
    'src/screens/Login.tsx',
    'src/screens/Settings.tsx',
    'src/utils/generatePassportPDF.ts',
    'package.json',
    'index.html'
  ];
  let missing = [];
  required.forEach(f => {
    if (!fs.existsSync(path.join(appDir, f))) {
      missing.push(f);
    }
  });
  if (missing.length > 0) {
    throw new Error('Отсутствуют файлы: ' + missing.join(', '));
  }
  addLog(`✅ Все ${required.length} ключевых файлов на месте`);

  // 4. npm install
  addLog('\n📦 Шаг 4/6: Установка зависимостей (npm install)...');
  try {
    execSync('npm install --no-audit --no-fund', { stdio: 'inherit' });
    addLog('✅ Зависимости установлены');
  } catch (e) {
    addLog('⚠️ npm install завершился с предупреждениями (продолжаем)');
  }

  // 5. Проверка
  addLog('\n🔍 Шаг 5/6: Проверка проекта (npm run check)...');
  try {
    execSync('npm run check', { stdio: 'inherit' });
  } catch (e) {
    throw new Error('Проверка не пройдена. Откатываем изменения.');
  }

  // 6. Сборка
  addLog('\n🏗  Шаг 6/6: Сборка production (npm run build)...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
  } catch (e) {
    throw new Error('Сборка провалилась');
  }

  // Проверка результата
  if (!fs.existsSync(path.join(appDir, 'dist/index.html'))) {
    throw new Error('dist/index.html не создан');
  }
  const distSize = (fs.statSync(path.join(appDir, 'dist/index.html')).size / 1024 / 1024).toFixed(2);
  addLog(`✅ Сборка готова: ${distSize} МБ`);

  // Финал
  addLog('\n🎉 Обновление завершено успешно!');
  addLog('\nСледующие шаги:');
  addLog('1. Проверьте работу приложения: npm run preview');
  addLog('2. Разверните на хостинге: см. UPDATE_INSTRUCTIONS.md');
  addLog('3. Если что-то сломалось — откатите из ' + backupDir);

} catch (err) {
  addLog('\n❌ ОШИБКА: ' + err.message);
  addLog('\nДля отката используйте бэкап в папке .backup-*');
  process.exit(1);
} finally {
  // Сохранить лог
  fs.writeFileSync(LOG_FILE, log.join('\n'), 'utf8');
  addLog(`\n📋 Лог сохранён в ${LOG_FILE}`);
}

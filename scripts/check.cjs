// Скрипт проверки проекта перед обновлением
// Запуск: npm run check

const fs = require('fs');
const path = require('path');

let errors = 0;
let warnings = 0;

console.log('🔍 Проверка проекта SoundHealing.by...\n');

function check(label, condition, errorMsg) {
  if (condition) {
    console.log(`✅ ${label}`);
  } else {
    console.log(`❌ ${label}: ${errorMsg}`);
    errors++;
  }
}

function warn(label, condition, warnMsg) {
  if (condition) {
    console.log(`✅ ${label}`);
  } else {
    console.log(`⚠️  ${label}: ${warnMsg}`);
    warnings++;
  }
}

// 1. Проверка структуры
console.log('📁 Структура файлов:');
check('package.json существует', fs.existsSync('package.json'), 'не найден');
check('src/ существует', fs.existsSync('src'), 'не найден');
check('src/App.tsx существует', fs.existsSync('src/App.tsx'), 'не найден');
check('src/main.tsx существует', fs.existsSync('src/main.tsx'), 'не найден');
check('src/types.ts существует', fs.existsSync('src/types.ts'), 'не найден');
check('src/auth.ts существует', fs.existsSync('src/auth.ts'), 'не найден');
check('src/AppContext.tsx существует', fs.existsSync('src/AppContext.tsx'), 'не найден');
check('index.html существует', fs.existsSync('index.html'), 'не найден');

// 2. Проверка src/screens
console.log('\n📱 Экраны:');
const screens = ['Dashboard', 'Scanner', 'Inventory', 'Shipments', 'Sales', 'Reports', 'Settings', 'Login'];
screens.forEach(s => {
  check(`src/screens/${s}.tsx`, fs.existsSync(`src/screens/${s}.tsx`), 'не найден');
});

// 3. Проверка src/components
console.log('\n🧩 Компоненты:');
['ProductDetailModal', 'PublicProductView'].forEach(c => {
  check(`src/components/${c}.tsx`, fs.existsSync(`src/components/${c}.tsx`), 'не найден');
});

// 4. Проверка src/utils
console.log('\n🛠 Утилиты:');
['exports.ts', 'labels.ts', 'telegram.ts'].forEach(u => {
  check(`src/utils/${u}`, fs.existsSync(`src/utils/${u}`), 'не найден');
});
check('src/utils/generateGuidePDF.ts', fs.existsSync('src/utils/generateGuidePDF.ts'), 'не найден');
check('src/utils/generatePassportPDF.ts', fs.existsSync('src/utils/generatePassportPDF.ts'), 'не найден');

// 5. Проверка зависимостей в package.json
console.log('\n📦 Зависимости:');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const required = ['react', 'react-dom', 'qrcode', 'jspdf', 'exceljs', 'lucide-react', 'tailwind-merge'];
required.forEach(dep => {
  check(`${dep}`, pkg.dependencies[dep] || pkg.devDependencies[dep], 'не установлен');
});

// 6. Проверка node_modules
console.log('\n🔧 Установленные пакеты:');
check('node_modules/', fs.existsSync('node_modules'), 'запустите npm install');

// 7. Предупреждения
console.log('\n⚠️  Предупреждения:');
warn('dist/ не слишком большой', !fs.existsSync('dist') || fs.statSync('dist').size < 10 * 1024 * 1024, 'dist больше 10 МБ — проверьте');

// Итоги
console.log('\n' + '─'.repeat(40));
console.log(`Ошибок: ${errors}, Предупреждений: ${warnings}`);

if (errors > 0) {
  console.log('\n❌ Проверка не пройдена. Исправьте ошибки и запустите снова.');
  process.exit(1);
} else {
  console.log('\n✅ Проект готов к обновлению!');
  process.exit(0);
}

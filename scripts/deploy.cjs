// Скрипт развёртывания на хостинг
// Запуск: npm run deploy

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Развёртывание SoundHealing.by\n');

// 1. Проверка
console.log('Шаг 1/4: Проверка проекта...');
try {
  execSync('npm run check', { stdio: 'inherit' });
} catch (e) {
  console.log('\n❌ Проверка не пройдена. Развёртывание отменено.');
  process.exit(1);
}

// 2. Сборка
console.log('\nШаг 2/4: Сборка production...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (e) {
  console.log('\n❌ Сборка провалилась.');
  process.exit(1);
}

// 3. Проверка результата
console.log('\nШаг 3/4: Проверка сборки...');
if (!fs.existsSync('dist/index.html')) {
  console.log('\n❌ Файл dist/index.html не найден. Сборка не удалась.');
  process.exit(1);
}

const distSize = (fs.statSync('dist/index.html').size / 1024 / 1024).toFixed(2);
console.log(`✅ Сборка готова: dist/index.html (${distSize} МБ)`);

// 4. Инструкция для развёртывания
console.log('\nШаг 4/4: Развёртывание\n');
console.log('📦 Сборка готова в папке dist/');
console.log('\nСпособы развёртывания:');
console.log('');
console.log('1️⃣  Netlify: перетащите папку dist/ на https://app.netlify.com/drop');
console.log('2️⃣  Vercel:  vercel --prod');
console.log('3️⃣  Cloudflare Pages: wrangler pages deploy dist/');
console.log('4️⃣  GitHub Pages: push в репозиторий, включите Pages в настройках');
console.log('');
console.log('Подробнее: см. раздел "Развёртывание" в техническом паспорте');
console.log('\n✅ Готово!');

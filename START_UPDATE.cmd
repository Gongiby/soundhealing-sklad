@echo off
chcp 65001 >nul
title SoundHealing.by - Обновление

echo ===============================================
echo   SoundHealing.by - Обновление приложения
echo ===============================================
echo.

REM Проверка наличия Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo [ОШИБКА] Node.js не найден!
    echo Установите Node.js с https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js найден:
node --version
echo.

REM Запуск скрипта обновления
echo Запускаю скрипт обновления...
echo.
node scripts/update.cjs %*

if errorlevel 1 (
    echo.
    echo ===============================================
    echo   ОШИБКА ПРИ ОБНОВЛЕНИИ!
    echo ===============================================
    echo Откройте файл UPDATE_LOG_*.txt для деталей.
    echo.
) else (
    echo.
    echo ===============================================
    echo   ОБНОВЛЕНИЕ ЗАВЕРШЕНО УСПЕШНО!
    echo ===============================================
)

pause

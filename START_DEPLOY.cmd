@echo off
chcp 65001 >nul
title SoundHealing.by - Развёртывание

echo ===============================================
echo   SoundHealing.by - Развёртывание на хостинг
echo ===============================================
echo.

REM Проверка наличия Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo [ОШИБКА] Node.js не найден!
    pause
    exit /b 1
)

echo [OK] Node.js найден:
node --version
echo.

REM Запуск развёртывания
echo Запускаю сборку и развёртывание...
echo.
node scripts/deploy.cjs

pause

@echo off
chcp 65001 >nul
title HR面试助手

echo ========================================
echo    🎙️  HR面试助手 - 首次电话沟通
echo ========================================
echo.

cd /d "%~dp0"

REM 检查Python是否可用
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 检测到 Python
    echo 🚀 正在启动服务器...
    echo.
    echo 📱 请在浏览器中访问: http://localhost:8000
    echo ⏹️  按 Ctrl+C 停止服务器
    echo.
    echo ========================================
    echo.
    python -m http.server 8000
    goto end
)

py --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 检测到 Python
    echo 🚀 正在启动服务器...
    echo.
    echo 📱 请在浏览器中访问: http://localhost:8000
    echo ⏹️  按 Ctrl+C 停止服务器
    echo.
    echo ========================================
    echo.
    py -m http.server 8000
    goto end
)

echo ❌ 未检测到 Python
echo.
echo 请先安装 Python，或使用以下方式之一：
echo.
echo 方式1: 直接双击 index.html 打开
echo 方式2: 使用 Node.js: npm install -g http-server ^&^& http-server -p 8000
echo 方式3: 使用 PHP: php -S localhost:8000
echo.

:end
pause

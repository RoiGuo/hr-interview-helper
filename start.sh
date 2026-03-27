#!/bin/bash

# HR面试助手 - 启动脚本 (macOS/Linux)
# 用法: ./start.sh

echo "========================================"
echo "   🎙️  HR面试助手 - 首次电话沟通"
echo "========================================"
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 检查Python是否可用
if command -v python3 &> /dev/null; then
    echo "✅ 检测到 Python 3"
    echo "🚀 正在启动服务器..."
    echo ""
    echo "📱 请在浏览器中访问: http://localhost:8000"
    echo "⏹️  按 Ctrl+C 停止服务器"
    echo ""
    echo "========================================"
    echo ""
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    echo "✅ 检测到 Python"
    echo "🚀 正在启动服务器..."
    echo ""
    echo "📱 请在浏览器中访问: http://localhost:8000"
    echo "⏹️  按 Ctrl+C 停止服务器"
    echo ""
    echo "========================================"
    echo ""
    python -m SimpleHTTPServer 8000
else
    echo "❌ 未检测到 Python"
    echo ""
    echo "请先安装 Python，或使用以下方式之一："
    echo ""
    echo "方式1: 直接双击 index.html 打开"
    echo "方式2: 使用 Node.js: npm install -g http-server && http-server -p 8000"
    echo "方式3: 使用 PHP: php -S localhost:8000"
    echo ""
    exit 1
fi

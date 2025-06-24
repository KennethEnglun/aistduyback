#!/bin/bash

# LPMS AI問答平台啟動腳本

echo "🎓 LPMS - LPedia AI溫習問答系統"
echo "=================================="

# 檢查Node.js是否安裝
if ! command -v node &> /dev/null; then
    echo "❌ 錯誤: 未發現Node.js安裝，請先安裝Node.js"
    exit 1
fi

# 檢查npm是否安裝
if ! command -v npm &> /dev/null; then
    echo "❌ 錯誤: 未發現npm安裝，請先安裝Node.js和npm"
    exit 1
fi

echo "✅ Node.js版本: $(node --version)"
echo "✅ npm版本: $(npm --version)"

# 檢查依賴是否已安裝
if [ ! -d "node_modules" ]; then
    echo "📦 正在安裝依賴..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依賴安裝失敗"
        exit 1
    fi
    echo "✅ 依賴安裝完成"
fi

# 檢查端口3000是否被佔用
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null; then
    echo "⚠️  端口3000已被佔用，正在嘗試終止..."
    lsof -ti:3000 | xargs kill -9
    sleep 2
fi

echo "🚀 正在啟動LPMS AI問答平台..."
echo "📍 URL: http://localhost:3000"
echo "⏹️  按 Ctrl+C 停止服務器"
echo "=================================="

# 啟動服務器
node server.js 
#!/bin/bash

# 网站分析平台 - 启动脚本 (Linux/Mac)

echo "🚀 启动网站分析平台..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

echo "✓ Node.js 版本: $(node --version)"

# 进入后端目录
cd "$(dirname "$0")/backend"

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
fi

# 启动服务器
echo "🌐 启动服务器..."
echo "📊 仪表盘地址: http://localhost:3000"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

npm start

# 网站分析平台 - 启动脚本

Write-Host "🚀 启动网站分析平台..." -ForegroundColor Cyan

# 检查 Node.js
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 错误: 未找到 Node.js，请先安装 Node.js" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Node.js 版本: $(node --version)" -ForegroundColor Green

# 进入后端目录
$backendDir = Join-Path $PSScriptRoot "backend"
Set-Location $backendDir

# 检查 node_modules
if (!(Test-Path "node_modules")) {
    Write-Host "📦 安装依赖..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 依赖安装失败" -ForegroundColor Red
        exit 1
    }
}

# 启动服务器
Write-Host "🌐 启动服务器..." -ForegroundColor Green
Write-Host "📊 仪表盘地址: http://localhost:3000" -ForegroundColor Cyan
Write-Host "" 
Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Gray
Write-Host ""

npm start

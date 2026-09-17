# 飞书多维表格插件快速部署脚本（Windows）
# 使用方法: .\scripts\deploy.ps1 [vercel|docker|local]

param(
    [ValidateSet("vercel", "docker", "local")]
    [string]$Mode = "local"
)

# 颜色输出函数
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# 检查命令是否存在
function Test-Command {
    param([string]$Command)
    return Get-Command $Command -ErrorAction SilentlyContinue
}

# 检查环境
function Check-Environment {
    Write-Info "检查环境..."

    # 检查 Node.js
    if (-not (Test-Command node)) {
        Write-Error "未找到 Node.js，请先安装 Node.js 24+"
        exit 1
    }

    $nodeVersion = node -v
    Write-Success "Node.js 版本: $nodeVersion"

    # 检查 pnpm
    if (-not (Test-Command pnpm)) {
        Write-Warning "未找到 pnpm，正在安装..."
        npm install -g pnpm
    }

    $pnpmVersion = pnpm -v
    Write-Success "pnpm 已安装: $pnpmVersion"
}

# 安装依赖
function Install-Dependencies {
    Write-Info "安装项目依赖..."
    pnpm install
    Write-Success "依赖安装完成"
}

# 构建项目
function Build-Project {
    Write-Info "构建项目..."
    pnpm build
    Write-Success "项目构建完成"
}

# Vercel 部署
function Deploy-Vercel {
    Write-Info "准备部署到 Vercel..."

    if (-not (Test-Command vercel)) {
        Write-Warning "未找到 Vercel CLI，正在安装..."
        pnpm add -g vercel
    }

    Write-Info "请按照提示登录 Vercel..."
    vercel login

    Write-Info "开始部署..."
    vercel

    Write-Success "Vercel 部署完成！"
}

# Docker 部署
function Deploy-Docker {
    Write-Info "准备使用 Docker 部署..."

    if (-not (Test-Command docker)) {
        Write-Error "未找到 Docker，请先安装 Docker"
        exit 1
    }

    Write-Info "构建 Docker 镜像..."
    docker build -t bitable-plugin:latest .

    Write-Info "停止旧容器（如果存在）..."
    docker stop bitable-plugin 2>$null
    docker rm bitable-plugin 2>$null

    Write-Info "启动新容器..."
    docker run -d `
        --name bitable-plugin `
        -p 5000:5000 `
        --restart unless-stopped `
        bitable-plugin:latest

    Write-Success "Docker 部署完成！"
    Write-Info "访问地址: http://localhost:5000"
}

# 本地部署
function Deploy-Local {
    Write-Info "准备本地部署..."

    # 检查 PM2
    if (-not (Test-Command pm2)) {
        Write-Info "安装 PM2..."
        pnpm add -g pm2
    }

    # 停止旧进程
    pm2 stop bitable-plugin 2>$null
    pm2 delete bitable-plugin 2>$null

    # 启动新进程
    Write-Info "启动应用..."
    pm2 start npm --name "bitable-plugin" -- start

    pm2 save

    Write-Success "本地部署完成！"
    Write-Info "访问地址: http://localhost:5000"
    Write-Info "查看状态: pm2 status"
    Write-Info "查看日志: pm2 logs bitable-plugin"
}

# 主函数
function Main {
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "  飞书多维表格插件 - 快速部署工具" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host ""

    # 检查环境
    Check-Environment

    # 安装依赖
    Install-Dependencies

    # 构建项目
    Build-Project

    # 根据模式选择部署方式
    switch ($Mode) {
        "vercel" {
            Deploy-Vercel
        }
        "docker" {
            Deploy-Docker
        }
        "local" {
            Deploy-Local
        }
    }

    Write-Host ""
    Write-Success "部署完成！"
}

# 运行主函数
Main

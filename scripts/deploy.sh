#!/bin/bash

# 飞书多维表格插件快速部署脚本
# 使用方法: ./scripts/deploy.sh [vercel|docker|local]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查环境
check_environment() {
    print_info "检查环境..."

    # 检查 Node.js
    if ! command_exists node; then
        print_error "未找到 Node.js，请先安装 Node.js 24+"
        exit 1
    fi

    local node_version=$(node -v)
    print_success "Node.js 版本: $node_version"

    # 检查 pnpm
    if ! command_exists pnpm; then
        print_warning "未找到 pnpm，正在安装..."
        npm install -g pnpm
    fi

    print_success "pnpm 已安装: $(pnpm -v)"
}

# 安装依赖
install_dependencies() {
    print_info "安装项目依赖..."
    pnpm install
    print_success "依赖安装完成"
}

# 构建项目
build_project() {
    print_info "构建项目..."
    pnpm build
    print_success "项目构建完成"
}

# Vercel 部署
deploy_vercel() {
    print_info "准备部署到 Vercel..."

    if ! command_exists vercel; then
        print_warning "未找到 Vercel CLI，正在安装..."
        pnpm add -g vercel
    fi

    print_info "请按照提示登录 Vercel..."
    vercel login

    print_info "开始部署..."
    vercel

    print_success "Vercel 部署完成！"
}

# Docker 部署
deploy_docker() {
    print_info "准备使用 Docker 部署..."

    if ! command_exists docker; then
        print_error "未找到 Docker，请先安装 Docker"
        exit 1
    fi

    print_info "构建 Docker 镜像..."
    docker build -t bitable-plugin:latest .

    print_info "停止旧容器（如果存在）..."
    docker stop bitable-plugin 2>/dev/null || true
    docker rm bitable-plugin 2>/dev/null || true

    print_info "启动新容器..."
    docker run -d \
        --name bitable-plugin \
        -p 5000:5000 \
        --restart unless-stopped \
        bitable-plugin:latest

    print_success "Docker 部署完成！"
    print_info "访问地址: http://localhost:5000"
}

# 本地部署
deploy_local() {
    print_info "准备本地部署..."

    # 安装 PM2
    if ! command_exists pm2; then
        print_info "安装 PM2..."
        pnpm add -g pm2
    fi

    # 停止旧进程
    pm2 stop bitable-plugin 2>/dev/null || true
    pm2 delete bitable-plugin 2>/dev/null || true

    # 启动新进程
    print_info "启动应用..."
    pm2 start npm --name "bitable-plugin" -- start

    pm2 save

    print_success "本地部署完成！"
    print_info "访问地址: http://localhost:5000"
    print_info "查看状态: pm2 status"
    print_info "查看日志: pm2 logs bitable-plugin"
}

# 主函数
main() {
    echo "========================================="
    echo "  飞书多维表格插件 - 快速部署工具"
    echo "========================================="
    echo ""

    # 检查环境
    check_environment

    # 安装依赖
    install_dependencies

    # 构建项目
    build_project

    # 根据参数选择部署方式
    case "${1:-local}" in
        vercel)
            deploy_vercel
            ;;
        docker)
            deploy_docker
            ;;
        local)
            deploy_local
            ;;
        *)
            echo "使用方法: $0 [vercel|docker|local]"
            echo ""
            echo "选项:"
            echo "  vercel  - 部署到 Vercel（推荐新手）"
            echo "  docker  - 使用 Docker 部署"
            echo "  local   - 本地部署（默认）"
            exit 1
            ;;
    esac

    echo ""
    print_success "部署完成！"
}

# 运行主函数
main "$@"

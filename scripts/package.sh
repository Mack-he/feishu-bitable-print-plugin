#!/bin/bash

# 飞书插件打包脚本

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

# 创建图标（如果没有的话）
create_icon() {
    if [ ! -f "public/icon.png" ]; then
        print_warning "未找到 icon.png，创建默认图标..."
        # 这里应该有一个真实的图标文件
        print_warning "请手动添加 256x256 的 icon.png 到 public 目录"
    fi
}

# 清理旧文件
clean_build() {
    print_info "清理旧构建文件..."
    rm -rf out dist package
    print_success "清理完成"
}

# 构建项目
build_project() {
    print_info "构建项目..."
    pnpm build
    print_success "构建完成"
}

# 复制必要文件到输出目录
copy_files() {
    print_info "复制必要文件..."
    
    # 创建输出目录
    mkdir -p package
    
    # 复制 manifest.json
    cp public/manifest.json package/
    
    # 复制 icon.png（如果存在）
    if [ -f "public/icon.png" ]; then
        cp public/icon.png package/
    fi
    
    # 复制构建后的文件
    cp -r out/* package/
    
    # 复制 index.html
    cp public/index.html package/
    
    print_success "文件复制完成"
}

# 检查文件大小
check_size() {
    print_info "检查插件大小..."
    
    # 计算总大小（单位：MB）
    local size=$(du -sm package | cut -f1)
    
    print_info "插件总大小: ${size}MB"
    
    if [ "$size" -gt 10 ]; then
        print_warning "插件大小超过 10MB，可能会影响上传"
    else
        print_success "插件大小符合要求"
    fi
}

# 创建压缩包
create_zip() {
    print_info "创建压缩包..."
    
    local version=$(grep '"version"' package/manifest.json | cut -d'"' -f4)
    local zip_name="feishu-bitable-plugin-v${version}.zip"
    
    cd package
    zip -r "../${zip_name}" * -x "*.DS_Store" -x "__MACOSX/*"
    cd ..
    
    print_success "压缩包创建完成: ${zip_name}"
}

# 生成报告
generate_report() {
    print_info "生成打包报告..."
    
    cat > package-report.txt << EOF
飞书多维表格边栏插件打包报告
================================

打包时间: $(date)
插件版本: $(grep '"version"' package/manifest.json | cut -d'"' -f4)
插件大小: $(du -sm package | cut -f1)MB

文件列表:
EOF
    
    cd package
    find . -type f | sort >> ../package-report.txt
    cd ..
    
    print_success "报告生成完成: package-report.txt"
}

# 主函数
main() {
    echo "========================================="
    echo "  飞书多维表格边栏插件打包工具"
    echo "========================================="
    echo ""
    
    # 检查环境
    print_info "检查环境..."
    if ! command_exists pnpm; then
        print_error "未找到 pnpm，请先安装"
        exit 1
    fi
    
    if [ ! -f "package.json" ]; then
        print_error "未找到 package.json，请确认在项目根目录"
        exit 1
    fi
    
    print_success "环境检查通过"
    
    # 执行打包流程
    clean_build
    build_project
    create_icon
    copy_files
    check_size
    create_zip
    generate_report
    
    echo ""
    echo "========================================="
    print_success "打包完成！"
    echo "========================================="
    echo ""
    print_info "上传步骤："
    echo "1. 登录飞书开放平台"
    echo "2. 进入插件管理"
    echo "3. 创建/更新插件"
    echo "4. 上传 ${zip_name} 文件"
    echo "5. 提交审核"
    echo ""
    print_warning "注意：请确保已在 public 目录添加 256x256 的 icon.png"
}

# 运行主函数
main

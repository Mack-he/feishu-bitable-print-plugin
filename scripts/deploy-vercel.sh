#!/bin/bash

# 飞书多维表格排版打印插件 - Vercel 部署脚本
# 作者：扣子编程
# 版本：v2.0.0

set -e

echo "========================================="
echo "  飞书多维表格插件 - Vercel 部署"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 步骤 1：检查 Vercel CLI
echo -e "${BLUE}[步骤 1/5]${NC} 检查 Vercel CLI..."
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}未检测到 Vercel CLI，正在安装...${NC}"
    npm install -g vercel
    echo -e "${GREEN}✓ Vercel CLI 安装成功${NC}"
else
    echo -e "${GREEN}✓ Vercel CLI 已安装${NC}"
fi
echo ""

# 步骤 2：检查登录状态
echo -e "${BLUE}[步骤 2/5]${NC} 检查登录状态..."
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}未登录 Vercel，即将打开浏览器进行登录...${NC}"
    vercel login
else
    VERCEL_USER=$(vercel whoami)
    echo -e "${GREEN}✓ 已登录为: ${VERCEL_USER}${NC}"
fi
echo ""

# 步骤 3：构建项目
echo -e "${BLUE}[步骤 3/5]${NC} 构建项目..."
pnpm build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 构建成功${NC}"
else
    echo -e "${RED}✗ 构建失败${NC}"
    exit 1
fi
echo ""

# 步骤 4：部署到 Vercel
echo -e "${BLUE}[步骤 4/5]${NC} 部署到 Vercel..."
echo -e "${YELLOW}提示：首次部署会要求选择项目和配置${NC}"
echo ""

# 检查是否首次部署
if [ ! -f .vercel/project.json ]; then
    echo -e "${YELLOW}首次部署，将创建新项目${NC}"
    vercel --prod
else
    echo -e "${GREEN}检测到已有项目配置，更新部署${NC}"
    vercel --prod
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 部署成功${NC}"
else
    echo -e "${RED}✗ 部署失败${NC}"
    exit 1
fi
echo ""

# 步骤 5：获取部署地址
echo -e "${BLUE}[步骤 5/5]${NC} 获取部署地址..."
if [ -f .vercel/project.json ]; then
    PROJECT_ID=$(grep -o '"projectId":"[^"]*' .vercel/project.json | cut -d'"' -f4)
    if [ ! -z "$PROJECT_ID" ]; then
        echo -e "${GREEN}✓ 项目 ID: ${PROJECT_ID}${NC}"
    fi
fi
echo ""

echo "========================================="
echo -e "${GREEN}✅ 部署完成！${NC}"
echo "========================================="
echo ""
echo "📋 下一步操作："
echo ""
echo "1. 访问 Vercel 控制台查看部署地址："
echo "   ${BLUE}https://vercel.com/dashboard${NC}"
echo ""
echo "2. 在飞书多维表格中添加插件："
echo "   a. 打开任意飞书多维表格"
echo "   b. 点击「插件」→「自定义插件」"
echo "   c. 点击「+新增插件」"
echo "   d. 输入部署地址（从 Vercel 控制台复制）"
echo "   e. 点击「确定」"
echo ""
echo "3. 开始使用插件！"
echo ""
echo "📚 相关文档："
echo "   - 使用指南: PLUGIN_USER_GUIDE.md"
echo "   - 部署指南: FEISHU_CUSTOM_PLUGIN_GUIDE.md"
echo ""

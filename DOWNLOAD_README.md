# 飞书多维表格边栏插件 - 下载说明

## 📦 插件包信息

**文件名**: `feishu-bitable-plugin-v2.0.0.zip`

**文件大小**: 636 KB

**文件位置**: `/workspace/projects/feishu-bitable-plugin-v2.0.0.zip`

**版本**: v2.0.0

## ⚠️ 重要提醒

### 缺少 icon.png 文件

当前插件包**缺少 icon.png 文件**，这是飞书插件审核的必需文件！

**在上传到飞书开放平台之前，必须完成以下操作：**

### 添加图标文件

1. **准备图标**
   - 格式：PNG
   - 尺寸：256×256 像素
   - 大小：不超过 100KB
   - 文件名：icon.png

2. **重新创建插件包**

   ```bash
   # 方法1：手动添加并重新打包
   cp your-icon.png feishu-plugin/icon.png
   node scripts/create-zip.js

   # 方法2：解压、添加、重新打包
   unzip feishu-bitable-plugin-v2.0.0.zip
   cp your-icon.png icon.png
   zip -r feishu-bitable-plugin-v2.0.0.zip *
   ```

## 📋 插件包内容

### 必需文件
- ✅ `manifest.json` - 插件配置文件
- ✅ `index.html` - 入口文件
- ❌ `icon.png` - **缺少！需要添加**

### 静态资源
- `_next/` - Next.js 构建输出
- `print/` - 打印功能页面
- 其他静态文件

## 🚀 上传到飞书

### 步骤 1：确保包含 icon.png

```bash
# 检查是否有 icon.png
ls feishu-plugin/icon.png

# 如果没有，添加它
cp your-icon.png feishu-plugin/icon.png

# 重新打包
node scripts/create-zip.js
```

### 步骤 2：登录飞书开放平台

访问：https://open.feishu.cn

### 步骤 3：创建/更新插件

1. 进入「应用管理」
2. 创建新应用或选择已有应用
3. 进入「插件管理」
4. 点击「创建插件」或「更新插件」

### 步骤 4：上传插件包

1. 选择「多维表格 - 边栏插件」
2. 点击「上传插件」
3. 选择 `feishu-bitable-plugin-v2.0.0.zip` 文件
4. 等待上传完成

### 步骤 5：配置插件信息

填写以下信息：
- **插件名称**: 飞书多维表格排版打印插件
- **插件描述**: 支持多维度排版、批量打印、二维码/条形码生成、PDF导出等功能
- **插件图标**: 系统会自动读取 icon.png

### 步骤 6：配置权限

在「权限管理」中申请：
- `bitable:app:read` - 读取表格数据
- `bitable:app:write` - 写入表格数据

### 步骤 7：提交审核

1. 检查所有配置
2. 点击「提交审核」
3. 等待审核通过（通常1-3个工作日）

### 步骤 8：发布上线

审核通过后，点击「发布」即可上线。

## 🔍 验证清单

上传前请确认：

- [ ] 已添加 icon.png 文件（256×256 PNG）
- [ ] manifest.json 配置正确
- [ ] 插件大小 < 10MB（当前 636KB ✅）
- [ ] 已申请必要的权限
- [ ] 插件描述清晰完整

## 📊 插件功能

### 核心功能
- ✅ 多维度排版生成文件
- ✅ 单数据源批量生成多文件
- ✅ 模板化文件生成
- ✅ 二维码生成能力
- ✅ 条形码生成能力
- ✅ PDF 导出能力
- ✅ 图片渲染支持

### 视图功能
- ✅ 表格视图
- ✅ 看板视图
- ✅ 卡片视图
- ✅ 时间轴视图

## 🐛 常见问题

### Q1: 上传失败怎么办？

**A**: 检查以下几点：
1. 确保包含 icon.png 文件
2. 检查文件大小是否超过 10MB
3. 确认 manifest.json 格式正确
4. 尝试重新打包

### Q2: 审核不通过怎么办？

**A**: 常见原因：
1. 缺少 icon.png 文件
2. 图标尺寸不符合要求
3. 权限申请不合理
4. 功能描述不清楚

根据审核反馈修改后重新提交。

### Q3: 如何测试插件？

**A**:
1. 审核通过后，在飞书表格中打开插件
2. 测试各项功能是否正常
3. 检查控制台是否有错误
4. 如有问题，修复后重新提交审核

## 📞 技术支持

- 飞书开放平台：https://open.feishu.cn
- 开发文档：https://open.feishu.cn/document/ukTMukTMukTM/ukTMukTMukTM

## 📚 相关文档

- [快速开始指南](docs/QUICK_START_FEISHU.md)
- [完整部署指南](docs/FEISHU_DEPLOYMENT.md)
- [开发指南](docs/FEISHU_PLUGIN.md)

---

**最后更新**: 2025-01-12
**插件版本**: v2.0.0
**状态**: ⚠️ 需要添加 icon.png

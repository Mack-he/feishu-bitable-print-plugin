# 飞书多维表格自定义排版插件

一个功能丰富的飞书多维表格自定义排版插件，支持多种视图布局和灵活的数据展示方式。

## 🚀 一键部署

```bash
# 部署到 Vercel（获得 HTTPS 地址）
pnpm deploy:vercel
```

部署完成后，在飞书多维表格中添加地址即可使用！

详细说明：[快速部署指南](DEPLOY_QUICK.md)

---

## ✨ 功能特性

### 📊 多种视图模式
- **表格视图（Grid View）**：经典的行列表格展示，支持排序和筛选
- **看板视图（Kanban View）：** 按状态分组的看板展示，直观的任务管理
- **卡片视图（Gallery View）**：卡片式网格展示，支持分组功能
- **时间轴视图（Timeline View）**：按时间线展示任务，清晰的时间规划

### 🖨️ 排版打印功能
- **多维度排版生成**：支持从多个维度对内容进行排版组合，生成目标文件
- **单数据源批量生成**：基于一份基础数据源，自动生成多份独立文件
- **模板化文件生成**：支持导入 Word/Excel 作为模板，快速批量生成文档
- **二维码生成**：内置二维码生成功能，支持批量生成任务二维码
- **条形码生成**：内置条形码生成功能，支持多种格式（CODE128、CODE39、EAN13等）
- **PDF 导出**：支持将排版好的内容导出为 PDF 格式
- **图片渲染支持**：支持图文混排，生成包含图片的丰富格式文档
- **打印预览**：实时预览打印效果，支持直接打印和导出
- **批量打印**：选择多条记录，一次性批量打印
- **AI 生成模板**：用自然语言描述、选布局或传参考图，由大模型生成可打印模板（详见 [AI 生成模板](#-ai-生成模板)）

### 🎨 视觉设计
- 现代化的 UI 设计，基于 shadcn/ui 组件库
- 支持深色模式
- 流畅的动画和过渡效果
- 响应式布局，适配不同屏幕尺寸

### 🔧 功能组件
- **任务卡片**：统一的任务展示组件，包含标题、状态、优先级、进度、负责人、标签等信息
- **实时搜索**：支持按任务名称和描述搜索
- **视图切换**：快速切换不同的视图模式
- **数据统计**：显示记录数量、最后更新时间等信息

## 🚀 技术栈

- **框架**：Next.js 16 (App Router)
- **UI 组件**：shadcn/ui (基于 Radix UI)
- **样式**：Tailwind CSS 4
- **语言**：TypeScript 5
- **图标**：lucide-react
- **PDF 生成**：jsPDF
- **HTML 转 PDF**：html2canvas
- **二维码生成**：qrcode
- **条形码生成**：jsbarcode

## 📁 项目结构

```
src/
├── app/
│   ├── page.tsx          # 主页面
│   ├── print/            # 打印功能页面
│   │   └── page.tsx      # 打印管理页面
│   ├── layout.tsx        # 布局文件
│   └── globals.css       # 全局样式
├── components/
│   ├── ui/               # shadcn/ui 组件库
│   ├── views/            # 自定义视图组件
│   │   ├── TaskCard.tsx      # 任务卡片组件
│   │   ├── GridView.tsx      # 表格视图
│   │   ├── KanbanView.tsx    # 看板视图
│   │   ├── GalleryView.tsx   # 卡片视图
│   │   └── TimelineView.tsx  # 时间轴视图
│   └── print/            # 打印相关组件
│       ├── PrintPreview.tsx       # 打印预览组件
│       ├── BarcodeGenerator.tsx   # 二维码/条形码生成器
│       └── BatchPrint.tsx         # 批量打印组件
├── lib/
│   └── print/            # 打印工具库
│       └── pdf-generator.ts       # PDF 生成器
├── types/
│   ├── bitable.ts        # 数据类型定义
│   └── print.ts          # 打印类型定义
└── data/
    └── mockData.ts       # 模拟数据
```

## 🎯 数据模型

### 字段类型
- `text`：文本字段
- `number`：数字字段
- `select`：单选字段
- `multiSelect`：多选字段
- `date`：日期字段
- `person`：人员字段
- `checkbox`：复选框字段
- `url`：URL 字段
- `email`：邮箱字段

### 视图配置
每个视图可以配置：
- 标题字段
- 状态字段
- 负责人字段
- 日期字段
- 分组字段
- 排序规则
- 筛选规则

## 📐 纸张规格

### 内置纸张（13 种，前端常量，不入库）

| 分组 | 规格 |
| --- | --- |
| A 系列 | A3 297×420、A4 210×297、A5 148×210、A6 105×148 |
| B 系列 | B4 250×353、B5 176×250、B6 125×176 |
| 国内开本 | 16开 185×260、大16开 210×285、32开 130×184、大32开 140×203 |
| 北美标准 | Letter 216×279、Legal 216×356 |

尺寸均为 mm、**纵向基准**（宽 ≤ 高），横向由「页面设置」的方向开关在渲染时交换宽高。

### 自定义纸张与权限

入口：编辑器工具栏纸张按钮 → 页面设置 → 纸张规格下拉 → 「新建自定义纸张…」（**名称必填**，同名会拦截，尺寸范围 10~2000mm，宽>高时自动按纵向基准保存并提示）。

| 操作 | 创建者 | 其他用户（公开的） | 其他用户（私有的） | 管理员 |
| --- | --- | --- | --- | --- |
| 列表可见 / 选用 | ✅ | ✅ | ❌ | 全部可见 |
| 改名 / 改尺寸 / 设为公开 | ✅ | ❌（403） | ❌ | 仅停用、删除 |
| 删除 | ✅ | ❌ | ❌ | ✅ |

- 新建的纸张默认**私有**，可勾选「公开给所有用户」；他人对公开纸张只读可用。
- 他人共享 / 系统纸张的尺寸框为只读（改了也无法回写预设，容易造成「保存后又被预设尺寸覆盖」的误解），需要其他尺寸请新建自己的纸张。

### 管理员后台（`/admins/papers`）

分两个 Tab：

- **自定义纸张**：全部用户的纸张，可按关键词（名称/创建者）与状态筛选，行内可**停用/启用**、**删除**。
- **内置纸张**：13 种程序内置纸张的只读清单（不占数据库、不可修改）。

「新增纸张」创建的是**系统纸张**（`user_id` 为 NULL、自动公开）：

- 对**所有用户**可见可用，在用户端下拉里单独归入「系统纸张」分组，标注「管理员维护」；用户只读，不能改删。
- 系统纸张的重名校验在应用层做（MySQL 唯一索引 `(user_id, name)` 对 NULL 不去重）。
- 停用后普通用户端不再出现，已使用它的模板仍按快照尺寸打印。
- **模板保存尺寸快照**：模板的 `pageConfig` 里会同时写入 `customWidth` / `customHeight` / `paperName` 与 `paperPresetId`。因此纸张被删除或停用后，已使用它的模板仍按保存时的尺寸正常打印，不会因权限或生命周期变化而损坏。

### 建表（新环境必做）

自定义纸张存在 `paper_presets` 表，仓库没有迁移目录，二选一：

```bash
mysql -h <host> -u <user> -p <database> < scripts/create-paper-presets.sql
# 或按 src/lib/db/schema.ts 同步结构
npx drizzle-kit push
```

## 🔐 模板授权

模板默认只能自己使用；要让别人也能用，需要显式配置可见范围或授权名单（判定逻辑集中在 `src/lib/template-access.ts`）。

### 可见范围与权限

| 可见范围 | 谁能用 | 能做什么 |
| --- | --- | --- |
| 仅自己（private，默认） | 创建者 | 查看、打印、编辑、删除 |
| 所有用户（public） | 所有登录用户 | 查看、打印、复制为我的模板；**不能改原模板** |
| 指定用户和部门（restricted） | 授权名单内的用户 / 部门成员 | 同上 |

- **企业模板**：`user_id` 为 NULL 的模板，由管理员在后台发布，同样按可见范围分发。
- **停用（status=disabled）**：管理员可在后台停用模板，停用后除创建者外都不可见。
- 需要修改被共享的模板时，用「复制为我的模板」复制一份再改。
- 部门授权**默认包含下级部门**（授权时可取消勾选），据此用部门的祖先链匹配。

### 企业模板的两条发布路径

1. **管理员直接发布**：后台「模板管理」→ 某个模板 →「发布为企业模板」（内容取当前快照），随后配置授权；内容更新后可用「从源模板重新发布」刷新。
2. **用户申请 + 管理员审批**：用户在侧边栏模板菜单点「申请发布为企业模板」并填写说明 → 后台「发布申请」Tab 审批；通过时可直接指定可见范围与授权名单，也可驳回并填写理由（理由会回显给申请人）。

### 部门数据（飞书通讯录同步）

后台「部门管理」页点「同步通讯录」即可拉取部门树与用户-部门关系：

- 查询用户所属部门按 **user_id**（`contact/v3/users/:user_id?user_id_type=user_id`），不使用 union_id；历史数据里 `feishu_user_id` 存成 union_id 的会自动反查纠正。
- 部门树走 `contact/v3/departments/0/children`（根部门必须用 `department_id_type=department_id` 传 0），存储统一用 `open_department_id`，并把祖先链写入 `departments.path` 以支持「含下级部门」匹配。
- **前置条件**：需在飞书开放平台为服务端自建应用开通通讯录权限（用户信息读取 + 部门信息读取）并发布生效，且应用可见范围覆盖目标用户；未开通时后台会给出明确提示，**用户维度授权不受影响**，仅部门维度为空。
- 用户登录时会按需刷新本人部门（失败静默，不影响登录）。

飞书侧改了部门（改名、调整层级、增减人员）后，再点一次「同步通讯录」即可，行为如下：

- **部门改名 / 换父部门 / 人数变化**：按 `feishu_department_id` 做 upsert 更新，本地 `departments.id` 不变，因此已配置的授权不会丢；界面上的部门名与「含下级部门」的覆盖范围（`path`）都会跟着更新。
- **部门被删除或移出应用可见范围**：本次部门树里没有、本地却存在的部门会被标记为 `status = inactive`，从授权选择器中消失、不再参与访问判定（授权记录保留，重新出现在树里会自动恢复 `active`）。后台会提示失效数量，确认不再需要的可在部门列表里删除，删除时一并清理该部门的授权记录。
- **用户部门归属**：按 `users.id` 升序分批刷新，默认一次 500 人（可用环境变量 `DEPARTMENT_SYNC_USER_BATCH` 调整，单次上限 5000）；剩余人数会在后台提示，点「继续同步剩余 N 人」从上次的 `userOffset` 续传，直到覆盖全部用户。
- 同步接口可带 body 参数调用：`POST /api/admin/departments/sync`，`{ "userBatchSize": 500, "userOffset": 0 }`。

### 部门定时同步

两种方式，**选一种即可**。

#### 方式一：应用内置调度（自建 / Docker 部署推荐）

在 `.env` 里配置（默认每天 03:00、15:00 各一次）：

```bash
DEPARTMENT_SYNC_SCHEDULE_ENABLED=true
# 可选，自定义时间点，逗号分隔的 HH:mm
# DEPARTMENT_SYNC_SCHEDULE=03:00,15:00
# 可选但建议配置：时间点按哪个时区判定（IANA 名）。
# Next 的 Node 进程时区可能被固定为 UTC，不配置会按 UTC 触发（即北京 11:00/23:00）
DEPARTMENT_SYNC_TIMEZONE=Asia/Shanghai
```

重启后，服务**收到第一个请求时**调度器开始工作，日志打印 `[DepartmentScheduler] 内置定时同步已启用：每天 03:00、15:00（时区 Asia/Shanghai）`，之后的行为：

- 每分钟检查一次是否到点，到点执行「部门树 + 用户部门归属」的全量同步。
- **断点续传**：同步按 `users.id` 分批，进度写在 `system_configs` 的 `DEPARTMENT_SYNC_USER_CURSOR`；单次时间预算 4 分钟，跑不完下次接着跑，不会漏人。
- **补跑**：进程停机 / 空闲跨过了时间点（或首次启用时当天已过时间点），首个请求后会补跑一次，而不是把错过的几次都补；同一天同一个时间点只跑一次。
- **结果可见**：记录在 `system_configs` 的 `DEPARTMENT_SYNC_LAST_RUN`，后台「部门管理」页会显示「定时同步：每天 …（时区 …） · 上次自动同步 时间 成功/失败：摘要」。
- 与手工同步、外部调度并发时后到的会被跳过（接口返回 409、日志记录跳过）。
- **限制**：定时器跑在 Node 进程里，只适用于常驻部署（`next start` / Docker）。**Vercel 等 Serverless 环境请用方式二**；多副本部署时每个副本都会各自到点触发（同步本身幂等，但建议只让一个副本开启该开关）。

时间点与「补跑 / 不重复跑」的判定逻辑是纯函数（按时区计算），单独有回归脚本（改这块前后都可以跑一下）：

```bash
node --experimental-strip-types scripts/test-department-schedule.mts
```

#### 方式二：外部调度器触发（Serverless 环境，或已统一用某个调度平台）

应用提供一个受密钥保护的 HTTP 入口，供任何调度器调用：

```bash
curl -sSL --max-time 300 -w '\n%{http_code}\n' \
  -H "X-Cron-Secret: $DEPARTMENT_SYNC_CRON_SECRET" \
  "http://<应用地址>/api/cron/departments/sync/"
```

也可以直接用仓库里的脚本，它们已经处理好尾斜杠跳转、状态码判断和错误输出，退出码可直接被调度器识别为任务成败：

```bash
# Linux / macOS / Git Bash
APP_BASE_URL=http://127.0.0.1:5000 DEPARTMENT_SYNC_CRON_SECRET=xxx \
  bash scripts/cron-department-sync.sh

# Windows（PowerShell）——脚本刻意保持纯 ASCII，见下
$env:APP_BASE_URL = "http://127.0.0.1:5000"; $env:DEPARTMENT_SYNC_CRON_SECRET = "xxx"
powershell -ExecutionPolicy Bypass -File .\scripts\cron-department-sync.ps1
```

> PowerShell 版刻意只用英文提示：Windows PowerShell 5.1 按系统 ANSI 代码页（中文 Windows 是 GBK）读取 `.ps1`，**非 ASCII 字符会导致语法错误**；GLUE(PowerShell) 把脚本落到临时文件执行时同样如此。接口返回的中文消息不受影响（已带 `charset=utf-8`）。

⚠️ 两个坑都会让定时任务「看起来成功、其实没同步」，务必注意：

- 应用开了 `trailingSlash: true`，`/api/...` **不带尾斜杠会先返回 308**。curl 要加 `-L`；不能跟随跳转的客户端（如 XXL-Job 内置 `httpJobHandler` 使用的 Java HttpURLConnection，对 308 的支持不可靠）必须直接写带尾斜杠的地址。
- `curl -sS` 在 HTTP 4xx/5xx 时**退出码仍然是 0**，会被 XXL-Job 记成「成功」。必须自己判状态码，或加 `-f` 让它非 200 就返回非 0。

- **密钥**：先配置环境变量 `DEPARTMENT_SYNC_CRON_SECRET`（生成示例：`openssl rand -hex 24`），**未配置时接口直接返回 503（默认关闭）**，不会裸奔。接口读取顺序是 `system_configs` 表 → 环境变量，所以也可以直接往表里插一条同名记录。调用时用 `X-Cron-Secret` 头，或 `?secret=xxx`（便于只能配 URL 的调度器）。

完整的平台接法（XXL-Job 的四种接法、crontab、systemd、K8s、Vercel）和参数、续传、防重入等细节，见 [docs/external-scheduler.md](docs/external-scheduler.md)。内置调度与外部触发共用同一个续传位置（`DEPARTMENT_SYNC_USER_CURSOR`），两种方式随时可以切换。

### 建表（新环境必做）

```bash
mysql -h <host> -u <user> -p <database> < scripts/create-template-grants.sql
# 或
npx drizzle-kit push
```

该脚本会扩 `templates`（visibility / status / source_template_id）并创建 `template_grants`、`departments`、`user_departments`、`template_publish_requests` 四张表；存量数据中 `is_public = 1` 的模板会迁移为 `visibility = 'public'`。

### 已知限制

打印在客户端完成，服务端的可见性判定作用于「模板列表」与「单条读取」：权限被回收后，浏览器中已加载过的模板数据无法远程清除，新会话即不可见。

## 🤖 AI 生成模板

首页「AI生成模板」卡片支持三种生成方式：**自然语言**（描述需求）、**智能布局**（选布局样式 + 补充描述）、**图片识别**（上传参考图，需多模态模型）。生成结果可以直接「使用此模板」保存为我的模板并进入编辑器。

### 工作方式

1. 前端把当前数据表的字段列表、表格名和用户需求一起提交到 `POST /api/ai/generate-template`；
2. 服务端用 OpenAI 兼容协议调用大模型（`/chat/completions`），提示词里固定了编辑器组件模型的结构与样式写法（`fontSize` 数字、`bold` 布尔、`align` 对齐、`[字段名]` 占位符）；
3. 返回的 JSON 会经过校验与收敛（`src/lib/ai/template-spec.ts`）：非法组件丢弃、样式字段纠正、表格补齐列、变量名比对当前字段，只保留编辑器认识的组件（text / heading / paragraph / list / table / line / qrcode / barcode）；
4. **未配置大模型或调用失败时**，自动退化为本地规则生成（`src/lib/ai/rule-generator.ts`），按关键词与字段拼出可用的登记表/合同/卡片模板，前端会给出黄色提示说明本次不是大模型生成。

### 配置大模型

两种方式，**数据库配置优先于环境变量**：

- 后台：`/admins/settings` → **AI 大模型**（接口地址 / API Key / 模型名称 / 超时时间）；
- 环境变量：`AI_API_BASE_URL`、`AI_API_KEY`、`AI_MODEL`、`AI_TIMEOUT_MS`（见 `.env.example`）。

任何兼容 OpenAI 协议的服务都可以直接用：DeepSeek（默认 `https://api.deepseek.com/v1` + `deepseek-chat`）、通义千问（`https://dashscope.aliyuncs.com/compatible-mode/v1` + `qwen-plus`）、智谱、Moonshot、自建 Ollama/vLLM 等。图片识别需要模型支持图片输入（如 `qwen-vl-max`、`glm-4v`），否则会按补充描述生成。

## 📖 使用说明

### 🚨 飞书自定义插件（推荐）

⚠️ **如果你想在飞书多维表格中使用此插件，请阅读以下文档：**

- [飞书自定义插件部署指南](FEISHU_CUSTOM_PLUGIN_GUIDE.md) ⭐ **部署必读**
- [插件使用指南](PLUGIN_USER_GUIDE.md) ⭐ **使用必读**

**快速开始**：

1. **本地开发**：
   ```bash
   pnpm dev
   ```
   服务器将在 `http://localhost:5000` 运行

2. **在飞书中添加**：
   - 打开飞书多维表格
   - 点击「插件」→「自定义插件」
   - 点击「+新增插件」
   - 输入运行地址：`http://localhost:5000`
   - 点击「确定」

3. **开始使用**：
   - 查看多维表格数据（多视图支持）
   - 点击「排版打印」进入打印配置
   - 选择记录、配置模板、预览打印
   - 导出 PDF 或直接打印

**生产部署**：
- Vercel（推荐）：`vercel --prod`
- GitHub Pages：启用 Pages 功能
- 自建服务器：上传 `out` 目录

**插件功能**：
- ✅ 多视图展示（表格、看板、卡片、时间轴）
- ✅ 排版打印（4种预设模板）
- ✅ 字段映射（自定义打印字段）
- ✅ 批量打印（选择多条记录）
- ✅ PDF 导出（一键生成 PDF）
- ✅ 二维码生成（单个/批量）
- ✅ 条形码生成（多种格式）
- ✅ 实时预览（所见即所得）

**重要提示**：
- ❌ 不要使用飞书开发者工具的 BlockTypeID 开发方式
- ✅ 必须通过飞书开放平台的插件管理功能
- ⚠️ 当前缺少 icon.png，需要添加 256×256 的图标

### 🚀 快速开始

#### 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

项目将在 http://localhost:5000 上运行

#### 生产部署

本项目提供多种部署方式，根据需求选择：

| 部署方式 | 难度 | 推荐度 | 文档 |
|---------|------|--------|------|
| **Vercel** | ⭐ 简单 | ⭐⭐⭐⭐⭐ | [详细教程](docs/DEPLOY_VERCEL.md) |
| **Docker** | ⭐⭐⭐ 中等 | ⭐⭐⭐⭐ | [详细教程](docs/DEPLOY_DOCKER.md) |
| **传统服务器** | ⭐⭐⭐⭐ 复杂 | ⭐⭐⭐ | [主部署指南](docs/DEPLOYMENT.md) |

**推荐新手使用 Vercel 部署，零配置、自动 HTTPS、全球 CDN 加速！**

#### 快速部署到 Vercel

```bash
# 安装 Vercel CLI
pnpm add -g vercel

# 登录并部署
vercel login
vercel

# 生产环境部署
vercel --prod
```

### 📦 Docker 部署（快速）

```bash
# 构建镜像
docker build -t bitable-plugin .

# 运行容器
docker run -d -p 5000:5000 --name bitable-plugin bitable-plugin

# 访问应用
http://localhost:5000
```

更多部署详情请查看 [部署指南](docs/DEPLOYMENT.md)

### 视图切换
点击顶部工具栏的视图标签即可切换不同的视图模式：
- 表格视图：适合批量查看和编辑数据
- 看板视图：适合按状态管理任务流程
- 卡片视图：适合视觉化展示任务卡片
- 时间轴视图：适合按时间规划任务

### 搜索功能
在搜索框中输入关键词，可以实时过滤任务：
- 支持按任务名称搜索
- 支持按任务描述搜索

### 打印功能

点击顶部工具栏的"排版打印"按钮，进入打印功能页面，包含以下功能：

#### 批量打印
- 选择多条记录进行批量打印
- 支持导出为 PDF
- 自动为每条记录生成打印页面

#### 二维码生成
- 单个二维码生成：输入URL或文本，生成对应的二维码
- 批量二维码生成：为所有任务自动生成二维码
- 支持下载二维码图片

#### 条形码生成
- 单个条形码生成：支持多种格式（CODE128、CODE39、EAN13等）
- 批量条形码生成：为所有任务生成条形码
- 支持下载条形码图片

#### 模板管理
- 预设多种打印模板（标准任务、简洁卡片、详细报告等）
- 支持创建自定义模板
- 支持导入模板文件

## 🎨 自定义样式

### 颜色方案
- 待开始：灰色
- 进行中：蓝色
- 已完成：绿色
- 已延期：红色

### 优先级颜色
- 低：浅灰色
- 中：浅蓝色
- 高：橙色
- 紧急：红色

## 🔮 未来规划

### 已实现 ✅
- [x] 多种视图模式（表格、看板、卡片、时间轴）
- [x] 排版打印功能
- [x] 批量打印
- [x] 二维码生成
- [x] 条形码生成
- [x] PDF 导出
- [x] 打印预览
- [x] 模板管理

### 计划中 📋
- [ ] 支持更多字段类型
- [ ] 添加拖拽排序功能
- [ ] 实现数据导入导出
- [ ] 添加字段编辑功能
- [ ] 支持视图保存和恢复
- [ ] 集成飞书开放平台 API
- [ ] 添加图表统计功能
- [ ] 支持自定义主题颜色
- [ ] 支持打印模板可视化编辑器
- [ ] 添加批量导出为 Word/Excel

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 Issue
- 发起 Discussion

---

**插件版本**：v2.0.0
**最后更新**：2025-01-12
**更新内容**：新增排版打印功能，支持批量打印、二维码/条形码生成、PDF导出等

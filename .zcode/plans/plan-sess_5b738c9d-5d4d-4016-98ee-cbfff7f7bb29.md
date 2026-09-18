# 纸张能力升级方案：常用纸张扩充 + 自定义纸张（含数据权限）

## 一、现状（已核实的事实）

- 纸张定义在 `src/types/editor.ts:352-364`：`PageConfig.size` 已预留 `'Custom'`，且 `customWidth/customHeight` 两个字段**已声明但全仓库零使用**（死字段）。
- `PAGE_SIZES`（`editor.ts:423-428`）只有 A4/A3/Letter/Legal 四个。
- `PageSettingsDialog.tsx`：下拉硬编码 4 项（:82-85），宽高输入框 `disabled`（:118、:128），Custom 分支完全未接线。
- **4 处直接索引 `PAGE_SIZES[pageConfig.size]`**：`CanvasArea.tsx:104`、`PrintPreviewDialog.tsx:92`、`TemplateCanvasPreview.tsx:357`、`EditorPage.tsx:1603`。传入自定义 key 会得到 `undefined` → NaN/崩溃，这是必须一并解决的技术债。`mmToPx = 3.78` 在这 4 处各写了一份。
- PDF 导出用 `jsPDF({ format: pageConfig.size })`（`PrintPreviewDialog.tsx:330`），自定义尺寸会失效。
- **pageConfig 存在 `templates.data` 这个 MySQL `json` 列里**（`src/lib/db/schema.ts:43`），扩展字段**不需要迁移模板表**。
- 数据层范式：`src/lib/db/schema.ts` 是唯一在用 schema；仓库**没有迁移目录**，建表走 `drizzle-kit push` 或手写 SQL（`scripts/init-admin.ts` 就是打印 SQL 人工执行）；用户接口鉴权 = `verifyToken`(`@/lib/auth`) + `where(eq(table.userId, decoded.userId))`；管理员用 `verifyAdminToken`；后台导航在 `src/app/admins/layout.tsx:17-22`。

## 二、交互设计

1. **内置常用纸张 13 个**（前端常量，不入库）：A3/A4/A5/A6、Letter/Legal、B4/B5/B6、16开 185×260、大16开 210×285、32开 130×184、大32开 140×203。
2. 纸张下拉**分组展示**：`常用纸张` / `我的自定义` / `共享给我`，末项固定 `+ 新建自定义纸张…`。
3. **新建自定义纸张**：弹内联表单，**名称必填**（为空时「保存」禁用并提示）、宽/高 mm 必填（10–2000，最多 1 位小数）、同名报「已存在同名纸张」；保存成功后立即选中为当前纸张。尺寸以**纵向基准**存储（若填 宽>高，自动交换并提示「已按纵向基准保存，横向请切换方向」），与内置纸张保持同一不变量。
4. 选中自定义纸张时，**宽高输入框变为可编辑**；点「确定」时若尺寸有改动，显示「同时更新该纸张预设」复选框（默认勾选）——勾选则回写预设，取消则只影响当前模板。
5. 对话框内提供「管理我的纸张」入口，打开 `PaperPresetManagerDialog`：列表 + 改名 + 改尺寸 + 公开开关 + 删除。
6. 权限：新建纸张默认**私有**，可勾选「公开给所有用户」；他人对公开纸张**只读可用**（下拉标注「共享」），不能改删；管理员后台可见全部、可停用/删除。

## 三、数据模型

`schema.ts` 新增 `paperPresets`（沿用现有约定：snake_case、int 自增主键、datetime 无默认值由应用层写）：

```sql
CREATE TABLE IF NOT EXISTS paper_presets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,                          -- 创建者；NULL 预留系统级
  name VARCHAR(50) NOT NULL,
  width_mm DECIMAL(6,1) NOT NULL,            -- 纵向基准
  height_mm DECIMAL(6,1) NOT NULL,
  is_public TINYINT(1) DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active/disabled（管理员停用）
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY user_paper_name_unique (user_id, name),
  KEY idx_public_status (is_public, status),
  CONSTRAINT fk_paper_presets_user FOREIGN KEY (user_id) REFERENCES users (id)
);
```

`PageConfig` 向后兼容扩展（旧模板零迁移）：

```ts
size: 'A3'|'A4'|'A5'|'A6'|'B4'|'B5'|'B6'|'Letter'|'Legal'|'16K'|'BIG16K'|'32K'|'BIG32K'|'Custom';
customWidth?: number;    // 启用：纵向基准宽度 mm
customHeight?: number;
paperPresetId?: number;  // 关联的预设 id（可空=预设已删/纯自定义）
paperName?: string;      // 展示名快照
margins / orientation / continuous 不变
```

**关键设计：模板保存尺寸快照。** 选自定义纸张时，`pageConfig` 同时写入 `customWidth/customHeight/paperName` 和 `paperPresetId`。预设被删除或停用后，已用它的模板仍按保存时的尺寸正常打印，不会因为权限/生命周期变化而损坏。

## 四、改造清单（分 5 阶段）

**阶段 1｜解析层（让自定义尺寸真正生效）**
1. 新增 `src/lib/paper.ts`：`BUILT_IN_PAPERS`（含分组成员/显示名）、由它派生的 `PAGE_SIZES`（保持旧导出不破坏其它引用）、`MM_TO_PX`、`resolvePaperMm()`、`resolvePaperPx()`、`paperLabel()`、`paperToJsPdfFormat()`。解析优先级：`size==='Custom'` → `paperPresetId` 命中预设 → `customWidth/Height` → 兜底 A4。
2. `types/editor.ts`：扩展 `PageConfig` 联合类型与新增字段；`PAGE_SIZES` 改为派生。
3. 替换上述 4 处尺寸计算为 `resolvePaperPx()`（同时消除 4 份重复的 3.78）。
4. `PrintPreviewDialog.handleExportPDF`：`format` 改用 `[w, h]`（mm，保留 orientation，jsPDF 会自动按方向交换）。
5. 顺手修 `src/app/admins/templates/page.tsx:372` 读的 `pageConfig?.width`（不存在的字段）。

**阶段 2｜数据层**
6. `src/lib/db/schema.ts` 追加 `paperPresets`。
7. 新增建表 SQL 文件（手写 `CREATE TABLE IF NOT EXISTS`，与仓库既有做法一致）；`drizzle-kit push` 亦可。
8. 新增 API（响应统一 `{ success, data | error }`，错误码 401/403/400/404/500，先查记录再判 owner）：
   - `GET /api/paper-presets`：我的 + 公开可用（带 `isOwner`/`ownerName`）
   - `POST /api/paper-presets`：名称必填/长度/同一用户下唯一/尺寸范围校验
   - `PUT /api/paper-presets/[id]`：仅 owner，可改 name、尺寸、isPublic
   - `DELETE /api/paper-presets/[id]`：仅 owner
9. 新增 `src/store/paperPresetStore.ts`（仿 `templateStore`：zustand + fetch + snake_case/camelCase normalize + 登出清空），在 `src/app/page.tsx` 初始化 effect 中与 `fetchTemplates` 并列调用。

**阶段 3｜用户界面**
10. 改造 `PageSettingsDialog`：分组下拉 + 新建自定义表单（含必填与重名校验）+ 尺寸可编辑 + 「同时更新该纸张预设」+ 管理入口；保存写入含快照的 `PageConfig`。
11. 新增 `PaperPresetManagerDialog`（列表/改名/改尺寸/公开/删除，删除二次确认并提示「已使用该纸张的模板不受影响」）。
12. 工具栏与状态栏纸张显示统一走 `paperLabel()`（`EditorPage.tsx:1248`、`:1603`），自定义显示为 `自定义 (210×148)`。

**阶段 4｜后台管理**
13. `/api/admin/paper-presets`：GET（分页 + 按用户/关键词/status 筛选）、PATCH（启用/停用）、DELETE；鉴权 `verifyAdminToken`，分页格式照 `admin/licenses/route.ts:56-133`。
14. 新增 `src/app/admins/papers/page.tsx` + `src/components/admin/PaperPresetManager.tsx`，并在 `admins/layout.tsx:17-22` 注册导航「纸张管理」。

**阶段 5｜验证与文档**
15. 按下节方式验证；补 README/docs 的纸张说明与 schema 注释。

**权限矩阵（服务端实现要点）**

| 操作 | 创建者 | 他人（公开） | 他人（私有） | 管理员 |
|---|---|---|---|---|
| 列表可见 / 选用 | ✓ | ✓ | ✗ | 全部 |
| 改名 / 改尺寸 / 公开 | ✓ | ✗(403) | ✗ | 仅停用、删除 |
| 删除 | ✓ | ✗ | ✗ | ✓ |

读列表：`or(eq(userId, me), and(eq(isPublic, true), eq(status, 'active')))`；写操作：先查记录 → 404，再判 `userId` → 403。

## 五、验证方式

1. **解析层脚本断言**：13 个内置尺寸正确；`resolvePaperMm` 在「内置 / 自定义+预设命中 / 预设已删回落到快照 / 字段缺失兜底 A4」四种分支下结果正确；`resolvePaperPx` 与旧公式逐值一致（保证存量模板画面不变）。
2. **API 端到端**：本地起 dev server，用 `.env` 的 `JWT_SECRET` 生成两个测试用户 token + 一个 admin token，curl 验证：A 建纸张后 B 列表不可见 → A 设公开后 B 可见但 PUT/DELETE 返回 403 → 重名 400/409、尺寸越界 400 → admin 能列出全部并停用。
3. **导出尺寸**：用 jsPDF 在浏览器里对 `[210,148]` + 纵向/横向各生成一次 PDF，读取页面尺寸断言与设定一致。
4. **UI**：编辑器和后台都需要登录，无法端到端点击；沿用本会话已验证的做法——用项目真实样式表复刻下拉分组/新建表单，在浏览器里验证渲染、必填禁用态与尺寸校验提示。
5. **回归**：`tsc` 全量；既有 A4 模板的画布/预览/PDF 尺寸与改动前一致。

## 六、不做的事（明确边界）

- 不动 `src/components/print/*`、`types/print.ts`、`types/print-config.ts` 里的旧纸张枚举（均为无引用的死代码），仅在 `src/lib/paper.ts` 里集中新定义。
- 不做「该纸张被 N 个模板引用」的扫描计数（模板 data 是 JSON 列，扫描成本高），改用模板内尺寸快照保证安全。
- 不改预置模板的 A4 默认纸张。
- `TemplatePreview`（独立预览页）里改纸张目前不回写模板（既有行为），本期保持不变，可作为后续独立小项。

## 七、涉及文件概览

新增：`src/lib/paper.ts`、`src/store/paperPresetStore.ts`、`src/components/editor/dialogs/PaperPresetManagerDialog.tsx`、`src/components/admin/PaperPresetManager.tsx`、`src/app/admins/papers/page.tsx`、`src/app/api/paper-presets/{route.ts,[id]/route.ts}`、`src/app/api/admin/paper-presets/route.ts`、建表 SQL 脚本。
修改：`src/types/editor.ts`、`src/lib/db/schema.ts`、`PageSettingsDialog.tsx`、`CanvasArea.tsx`、`PrintPreviewDialog.tsx`、`TemplateCanvasPreview.tsx`、`EditorPage.tsx`、`src/app/page.tsx`、`admins/layout.tsx`、`admins/templates/page.tsx`。
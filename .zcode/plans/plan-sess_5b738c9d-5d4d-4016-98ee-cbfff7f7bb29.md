# 模板授权方案：只有被授权的用户/部门才能使用模板

## 一、现状（已核实）

- **模板目前没有任何共享机制**：`GET /api/templates`（`src/app/api/templates/route.ts:30-34`）只返回 `userId = 自己` 的模板；`isPublic` 仅在没人调用的 `[id]/route.ts:51` 生效；`template_shares` 表建了但零引用。所以「授权」要先补上「把模板发给别人用」的能力。
- **前端拿不到部门**：插件 JS-SDK 1.0.2 的 bridge 只有 `getUserId/getBaseUserId/getTenantKey`（无姓名/部门，全包 0 处 department）；服务端有 `FEISHU_APP_ID/SECRET`（`getSystemConfig` 优先读库）与 tenant_access_token 能力（`src/lib/feishu-api-client.ts:88-123`），但**当前未申请任何通讯录权限**，`users` 表也无部门字段。
- **既有可复用范式**：纸张预设的「自己的 + 他人公开且未停用」过滤 + `status='disabled'` 停用（`api/paper-presets/route.ts:20-33`）；`user_table_authorizations` 是已有的「资源-授权对象」表结构参考；管理员接口鉴权统一走 `extractTokenFromHeader + verifyAdminToken`。
- **已知缺陷（顺手修）**：后台 PATCH 只接受 `isPublic`，导致后台改模板名称/描述实际返回 400 不生效（`api/admin/templates/route.ts:157-168`）。

## 二、可见性与权限规则

模板新增两个维度：`visibility`（private / public / restricted）+ `status`（active / disabled）；`userId = NULL` 表示**企业模板**（管理员发布）。

判定统一收敛到一个函数 `canUseTemplate()`（新增 `src/lib/template-access.ts`），规则：

| 场景 | 可见 | 可打印/导出 | 可编辑原模板 | 可复制为我的模板 |
| --- | --- | --- | --- | --- |
| 创建者本人 | ✅ | ✅ | ✅ | — |
| `visibility = public` 且 active | 所有登录用户 | ✅ | ❌ | ✅ |
| `visibility = restricted` 且命中授权 | 被授权用户 | ✅ | ❌ | ✅ |
| `visibility = restricted` 未命中 | ❌（列表不出现） | ❌ | ❌ | ❌ |
| `status = disabled` | 仅创建者/管理员 | ❌（非本人） | 创建者 | ❌ |

- 授权对象两类：**用户**（`users.id`，与模板归属同一约定）与**部门**；部门授权**默认包含下级部门**，授权时可勾选取消。
- 授权**长期有效**（按你的选择），靠移除授权或停用模板回收；不做到期时间。
- 服务端落点：① `GET /api/templates` 列表过滤（「我的 + 企业可见 + 共享给我的」）；② `GET /api/templates/[id]` 单条校验；③ 复制接口校验。打印在客户端执行，所以列表 + 单条就是实际边界（浏览器已缓存的旧数据无法回收，会在文档里写明）。

## 三、数据模型（`src/lib/db/schema.ts` + 建表 SQL）

1. **`templates` 扩列**：`visibility varchar(20) default 'private'`、`status varchar(20) default 'active'`；`userId` 允许 NULL（企业模板）；`sourceTemplateId int NULL`（企业模板记录内容来源）。存量数据把 `isPublic = 1` 的迁移为 `visibility = 'public'`，`isPublic` 保留但不再作为判定依据。
2. **`template_grants`**（授权名单）：`id, templateId(FK), subjectType('user'|'department'), subjectId int, includeSubDepartments boolean default true, createdByType('user'|'admin'), createdById, createdAt`，唯一索引 `(template_id, subject_type, subject_id)`。
3. **`departments`**：`id, feishuDepartmentId varchar unique, name, parentFeishuDepartmentId, path varchar（形如 ",1,4,9," 的祖先链，便于子树查询）, memberCount, status, lastSyncedAt, timestamps`。
4. **`user_departments`**：`id, userId(FK users.id), departmentId(FK departments.id), syncedAt`，唯一索引 `(user_id, department_id)`。
5. **`template_publish_requests`**（发布申请流）：`id, templateId(FK), applicantUserId(FK), note, status('pending'|'approved'|'rejected'), reviewedByAdminId, reviewedAt, rejectReason, enterpriseTemplateId, timestamps`。

建表 SQL 放 `scripts/create-template-grants.sql`（照 `create-paper-presets.sql` 的幂等写法），同时支持 `npx drizzle-kit push`。

## 四、改造清单（6 个阶段）

**P1 判定层与模板接口**
1. 新增 `src/lib/template-access.ts`：`canUseTemplate(template, { userId, departmentIds, departmentAncestorIds }, grants)` → `{ canView, canPrint, canEdit, canCopy }`；`expandDepartmentIds()` 用于含子部门匹配。
2. `GET /api/templates`（`route.ts`）改为「我的 + 企业模板（active 且可见）+ 他人共享给我的」，返回 `source: 'mine'|'enterprise'|'shared'`、`canEdit/canPrint`、`publishRequestStatus`。
3. `GET /api/templates/[id]` 用 `canUseTemplate` 替换现有 owner-or-isPublic 判断；`PUT/DELETE` 保持 owner-only（企业模板仅管理员经 admin 接口）；修掉创建后「按 userId 取最新一条」的并发隐患（改用 `$returningId()`）。
4. 新增 `POST /api/templates/[id]/copy`：有可见权即可复制为自己的模板（复制 data/pageConfig，名字加「- 副本」）。

**P2 授权与共享接口**
5. `GET/PUT /api/templates/[id]/grants`：查看/覆盖设置授权名单（仅 owner；企业模板仅在管理端配置）。
6. `GET /api/share-directory`：授权选择器数据源——用户（从 `users` 搜索，仅返回 id/name/avatar）与部门树（id/name/path），仅登录用户可调。
7. `POST /api/templates/[id]/publish-request`（用户申请发布为企版）+ 列表里返回自己的申请状态。

**P3 部门同步（飞书通讯录，按 user_id）**
8. 新增 `src/lib/feishu-contact.ts`：用 `getSystemConfig('FEISHU_APP_ID'/'FEISHU_APP_SECRET')` 取 tenant_access_token（带缓存）；实现
   - `fetchUserDepartments(userId)` → `GET /open-apis/contact/v3/users/:user_id?user_id_type=user_id` 取 `department_ids`（**按你要求用 user_id，不用 union_id**）
   - `fetchDepartmentTree()` → 递归 `contact/v3/departments/children`（`department_id_type=open_department_id`）
   - `syncDepartments()` → upsert `departments`（含 path）+ 刷新 `user_departments`
9. **ID 补齐**：`users.feishuUserId` 目前存的是 `user_id || union_id || open_id` 三选一，不可靠。登录回调改为：能拿到 user_id 就存 user_id；拿不到时用 union_id 反查补齐（`contact/v3/users/:union_id?user_id_type=union_id` 响应含 user_id，同样需要通讯录权限）。
10. 同步触发：管理员在后台点「同步通讯录」（全量）；用户登录时按需刷新本人在 `user_departments` 的记录（24h TTL，异步不阻塞登录）。
11. **降级**：通讯录权限未开通时，同步接口返回明确的权限错误并在后台页面提示；**用户维度授权与模板授权不受影响**（部门维度则暂时为空）。

**P4 用户侧界面**
12. `src/components/editor/TemplateSidebar.tsx`：模板列表分「我的模板 / 企业模板 / 共享给我」三组 + 来源徽标；菜单按权限显示——owner 多「共享设置」「申请发布为企版」，非 owner 只有「复制为我的模板」。
13. 新增 `src/components/editor/dialogs/ShareSettingsDialog.tsx`：可见范围三选一（私有 / 所有用户 / 指定用户和部门）+ 用户与部门选择器（复用 `SubjectPicker`，部门支持「含下级部门」勾选）。
14. `src/components/editor/TemplatePreview.tsx`：模板列表加来源徽标，非 owner 隐藏「编辑模板」并显示「复制为我的模板」；打印前用 `canPrint` 兜底禁用并提示。
15. `src/store/templateStore.ts`：`Template` 增加 `source/canEdit/canPrint/publishRequestStatus`；新增 `copyTemplate`、`updateGrants`、`requestPublish`。

**P5 管理侧界面**
16. `src/app/admins/templates/page.tsx` + `api/admin/templates/*`：
    - 列表补 `可见性/状态/授权数量/来源` 列；PATCH 支持 `visibility/status/name/description`（**修掉现在改名不生效的缺陷**）
    - 「发布为企业模板」：选中某模板 → 生成 `userId=NULL` 的企版（记录 `sourceTemplateId`）+ 立即配置授权名单；内容更新时「从源模板重新发布」
    - 「授权设置」弹窗（复用 `SubjectPicker`），可停用/删除
17. 「发布申请」Tab：待审列表（申请人/模板/说明）→ 通过（顺带配置企版名称与授权）或驳回（填理由）；导航上用徽标显示待审数量。
18. 新增「部门管理」页（`src/app/admins/departments/page.tsx` + `components/admin/DepartmentManager.tsx`）：部门树（名称/父部门/人数/同步时间）+「同步通讯录」按钮 + 权限未开通时的引导提示；`admins/layout.tsx` 注册导航。
19. 管理端接口：`api/admin/templates/publish`、`api/admin/templates/[id]/grants`、`api/admin/template-publish-requests（+[id]）`、`api/admin/departments（+sync）`。

**P6 验证与文档**
20. 按第六节执行验证；README 增加「模板授权」章节（含权限矩阵、通讯录权限开通指引、降级说明）。

## 五、权限矩阵（服务端实现要点）

- 列表：`or(owner, and(userId IS NULL, visibility='public', status='active'), and(visibility IN ('public','restricted'), status='active', 命中授权))`；命中授权 = `EXISTS(template_grants g WHERE g.template_id=t.id AND ((g.subject_type='user' AND g.subject_id=me) OR (g.subject_type='department' AND g.subject_id IN (我的部门 + 祖先部门（当 includeSubDepartments)))))`。
- 写操作：`PUT/DELETE /api/templates/[id]` 保持 owner-only（403）；授权名单仅 owner 可改；企业模板的授权/停用仅管理员。
- 管理员接口统一 `extractTokenFromHeader + verifyAdminToken`；用户接口继续用现有 `verifyToken`（`@/lib/auth`，与 templates/paper-presets 一致）。

## 六、前置条件与风险（需要你配合）

1. **必须在飞书开放平台为服务端那个自建应用申请通讯录权限**（用户信息读取 + 部门信息读取，如 `contact:user.base:readonly`、`contact:department.base:readonly`，精确名称以开放平台为准），并经租户管理员审批；应用可见范围需覆盖目标用户。**没有这个权限，部门同步一定失败**——届时部门维度不可用，但用户维度授权与整套模板授权仍可正常工作。
2. 请确认后台「系统设置」里的 `FEISHU_APP_ID/FEISHU_APP_SECRET` 与 OAuth 登录用的是同一个自建应用，否则部门数据与登录用户对不上。
3. 打印在客户端完成：权限回收后，浏览器里已加载过的模板数据无法远程清除（文档会写明），新会话即不可见。
4. 这台 MySQL 之前出现过连接数打满（151/151），联调时注意连接池占用。

## 七、验证方式

1. **判定矩阵断言**（脚本）：owner / public / restricted 命中用户 / 命中部门 / 命中子部门（含与不含）/ 停用 / 未命中 共 8 类组合的 `canView/canPrint/canEdit/canCopy` 逐项断言。
2. **API 端到端**（双用户 + 部门数据）：A 设模板为 restricted 并授权给 B 与部门 D（B 在 D 的子部门）→ B 列表可见且 `canEdit=false`；C 不可见；B 直接 PUT 原模板 403；B 复制成功；移除授权后 B 不可见；停用后非 owner 不可见；发布申请 → 管理员通过 → 企版生成且授权生效；驳回路径含理由回显。
3. **部门同步**：若通讯录权限已开通则真实联调（同步部门树 + 用户部门关系）；未开通则用手工插入的部门/成员数据验证授权链路，并确认后台给出明确的权限提示。
4. **界面走查**：沿用本会话已验证的做法（注入本机签发 token 打开真实界面），走「共享设置 → 授权用户/部门 → 对方端可见并打印 → 复制为我的模板 → 申请发布 → 管理员审批」全流程，并核对数据库落库内容。
5. **回归**：`tsc` 全量；既有模板列表/编辑/打印对创建者行为不变；纸张与预置模板功能不受影响。

## 八、不做的事

- 不改动 `template_shares`（shareToken 外链分享）——与本期「授权名单」是两套东西，留作后续。
- 不做授权到期时间（按你的选择）。
- 不做企业模板的内容在线编辑（编辑器依赖飞书环境）；内容更新走「重新发布」。
- 不动 `src/storage/database/shared/schema.ts` 等死代码，也不改授权码（license）体系的现有逻辑。
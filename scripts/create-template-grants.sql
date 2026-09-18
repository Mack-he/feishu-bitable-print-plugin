-- 模板授权相关表结构
-- 仓库没有迁移目录（沿用 init-admin.ts / create-paper-presets.sql 的手写 SQL 约定）。
-- 新环境可直接执行本文件；也可以执行 npx drizzle-kit push 按 src/lib/db/schema.ts 同步。
--
-- 权限模型：
--   templates.visibility: private 仅创建者 / public 所有登录用户 / restricted 仅授权名单
--   templates.status:     active / disabled（管理员停用，停用后非创建者不可见）
--   templates.user_id:    为 NULL 表示「企业模板」（管理员发布）
--   template_grants:      授权对象为 user（users.id）或 department（departments.id，默认含下级部门）
--   departments / user_departments：来自飞书通讯录同步（按 user_id 查询）

-- 1) templates 扩列（只需执行一次；重复执行会报 Duplicate column，可忽略）
ALTER TABLE `templates`
  ADD COLUMN `visibility` VARCHAR(20) NOT NULL DEFAULT 'private' COMMENT 'private/public/restricted',
  ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT 'active/disabled',
  ADD COLUMN `source_template_id` INT NULL COMMENT '企业模板的内容来源模板 id',
  ADD INDEX `idx_template_visibility_status` (`visibility`, `status`);

-- 2) 存量数据迁移：原来的 is_public = 1 视为「所有登录用户可用」
UPDATE `templates` SET `visibility` = 'public' WHERE `is_public` = 1 AND `visibility` = 'private';

-- 3) 模板授权名单
CREATE TABLE IF NOT EXISTS `template_grants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `template_id` INT NOT NULL,
  `subject_type` VARCHAR(20) NOT NULL COMMENT 'user / department',
  `subject_id` INT NOT NULL COMMENT 'subject_type=user 时为 users.id；department 时为 departments.id',
  `include_sub_departments` TINYINT(1) DEFAULT 1 COMMENT '部门授权是否含下级部门',
  `created_by_type` VARCHAR(20) NULL COMMENT 'user / admin',
  `created_by_id` INT NULL,
  `created_at` DATETIME NOT NULL,
  UNIQUE KEY `template_subject_unique` (`template_id`, `subject_type`, `subject_id`),
  CONSTRAINT `fk_template_grants_template` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- 4) 部门（飞书通讯录同步）
CREATE TABLE IF NOT EXISTS `departments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `feishu_department_id` VARCHAR(128) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `parent_feishu_department_id` VARCHAR(128) NULL,
  `path` VARCHAR(1000) NULL COMMENT '祖先链，形如 ,1,4,9,（含自身）',
  `member_count` INT DEFAULT 0,
  `status` VARCHAR(20) NOT NULL DEFAULT 'active',
  `last_synced_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  UNIQUE KEY `feishu_department_unique` (`feishu_department_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- 5) 用户-部门关系
CREATE TABLE IF NOT EXISTS `user_departments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `department_id` INT NOT NULL,
  `synced_at` DATETIME NOT NULL,
  UNIQUE KEY `user_department_unique` (`user_id`, `department_id`),
  CONSTRAINT `fk_user_departments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_user_departments_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- 6) 企业模板发布申请
CREATE TABLE IF NOT EXISTS `template_publish_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `template_id` INT NOT NULL,
  `applicant_user_id` INT NOT NULL,
  `note` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending/approved/rejected',
  `reviewed_by_admin_id` INT NULL,
  `reviewed_at` DATETIME NULL,
  `reject_reason` TEXT NULL,
  `enterprise_template_id` INT NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  CONSTRAINT `fk_publish_requests_template` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`),
  CONSTRAINT `fk_publish_requests_user` FOREIGN KEY (`applicant_user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
-- 自定义纸张预设表
-- 仓库没有迁移目录（沿用 init-admin.ts 的手写 SQL 约定），新环境请手动执行本文件。
-- 也可以直接执行：npx drizzle-kit push（会按 src/lib/db/schema.ts 同步结构）
--
-- 权限模型：
--   默认仅创建者可见可用；is_public = 1 时其他用户可见可用（只读，不能改删）
--   status = 'disabled' 由管理员在后台停用，停用后不再下发到用户端列表
--   已引用该纸张的模板不受影响：模板 pageConfig 内保存了尺寸快照

CREATE TABLE IF NOT EXISTS `paper_presets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `name` VARCHAR(50) NOT NULL,
  `width_mm` DECIMAL(6,1) NOT NULL COMMENT 'mm，纵向基准（width <= height）',
  `height_mm` DECIMAL(6,1) NOT NULL COMMENT 'mm，纵向基准',
  `is_public` TINYINT(1) DEFAULT 0,
  `status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT 'active / disabled',
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  UNIQUE KEY `user_paper_name_unique` (`user_id`, `name`),
  KEY `idx_paper_public_status` (`is_public`, `status`),
  CONSTRAINT `fk_paper_presets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
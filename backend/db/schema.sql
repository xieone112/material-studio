-- Material Studio 数据库结构
-- MySQL 8.0+
CREATE DATABASE IF NOT EXISTS material_studio DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE material_studio;

CREATE TABLE IF NOT EXISTS template (
    id                   VARCHAR(64)  NOT NULL PRIMARY KEY,
    title                VARCHAR(128) NOT NULL,
    description          VARCHAR(500) NOT NULL DEFAULT '',
    channel              VARCHAR(32)  NOT NULL DEFAULT 'video',
    category             VARCHAR(64)  NOT NULL,
    cover_url            VARCHAR(300) NOT NULL,
    result_url           VARCHAR(300) NOT NULL,
    required_image_count INT          NOT NULL DEFAULT 1,
    accepted_mime_types  VARCHAR(200) NOT NULL DEFAULT 'image/jpeg,image/png,image/webp',
    max_file_size_bytes  BIGINT       NOT NULL DEFAULT 5242880,
    sort_order           INT          NOT NULL DEFAULT 0,
    enabled              TINYINT      NOT NULL DEFAULT 1
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS asset (
    id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    asset_no      VARCHAR(64)  NOT NULL,
    user_id       VARCHAR(64)  NOT NULL,
    template_id   VARCHAR(64)  NULL,
    original_name VARCHAR(255) NOT NULL DEFAULT '',
    stored_path   VARCHAR(500) NOT NULL,
    url           VARCHAR(300) NOT NULL,
    mime_type     VARCHAR(100) NOT NULL,
    size_bytes    BIGINT       NOT NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_asset_no (asset_no),
    KEY idx_asset_user (user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS task (
    id             BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    task_no        VARCHAR(64)  NOT NULL,
    user_id        VARCHAR(64)  NOT NULL,
    template_id    VARCHAR(64)  NOT NULL,
    status         VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    current_stage  VARCHAR(32)  NULL,
    failure_stage  VARCHAR(32)  NULL,
    failure_reason VARCHAR(500) NULL,
    result_url     VARCHAR(300) NULL,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_task_no (task_no),
    KEY idx_task_user_created (user_id, created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS task_asset (
    id         BIGINT  NOT NULL AUTO_INCREMENT PRIMARY KEY,
    task_id    BIGINT  NOT NULL,
    asset_id   BIGINT  NOT NULL,
    sort_order INT     NOT NULL DEFAULT 0,
    KEY idx_task_asset_task (task_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 用户资料：user_id 由前端生成（UUID），首次访问时自动注册
CREATE TABLE IF NOT EXISTS app_user (
    user_id    VARCHAR(64)  NOT NULL PRIMARY KEY,
    nickname   VARCHAR(64)  NOT NULL,
    email      VARCHAR(128) NOT NULL DEFAULT '',
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

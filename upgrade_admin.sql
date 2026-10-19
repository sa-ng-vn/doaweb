USE techstore_db;

SET @has_role = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='role');
SET @sql_role = IF(@has_role=0, "ALTER TABLE users ADD COLUMN role ENUM('user','admin') NOT NULL DEFAULT 'user'", 'SELECT 'users.role da ton tai'');
PREPARE stmt_role FROM @sql_role; EXECUTE stmt_role; DEALLOCATE PREPARE stmt_role;

SET @has_image = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='image_url');
SET @sql_image = IF(@has_image=0, 'ALTER TABLE products ADD COLUMN image_url VARCHAR(500) NULL', 'SELECT 'products.image_url da ton tai'');
PREPARE stmt_image FROM @sql_image; EXECUTE stmt_image; DEALLOCATE PREPARE stmt_image;

SELECT 'Cap nhat schema TechStore hoan tat' AS ket_qua;

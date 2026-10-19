USE techstore_db;

-- Them vai tro seller, giu nguyen user/admin va du lieu hien tai.
ALTER TABLE users MODIFY COLUMN role ENUM('user','admin','seller') NOT NULL DEFAULT 'user';

SELECT id, name, email, role FROM users ORDER BY id;

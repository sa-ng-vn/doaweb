USE techstore_db;

-- Them vai tro seller, giu nguyen user/admin va du lieu hien tai.
ALTER TABLE users MODIFY COLUMN role ENUM('user','admin','seller') NOT NULL DEFAULT 'user';

SELECT id, name, email, role FROM users ORDER BY id;


USE techstore_db;

UPDATE users
SET role = 'seller'
WHERE email = 'seller@example.com';


UPDATE users
SET role = 'admin'
WHERE email = 'admin@example.com';
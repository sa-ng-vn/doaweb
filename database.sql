CREATE DATABASE IF NOT EXISTS techstore_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE techstore_db;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  category VARCHAR(80) NOT NULL,
  price DECIMAL(12,0) NOT NULL,
  old_price DECIMAL(12,0) NOT NULL DEFAULT 0,
  emoji VARCHAR(16) NOT NULL DEFAULT '📦',
  image_url VARCHAR(500) NULL,
  tag VARCHAR(50) NOT NULL DEFAULT 'Nổi bật',
  description TEXT NOT NULL,
  specs JSON NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_code VARCHAR(30) NOT NULL UNIQUE,
  user_id INT UNSIGNED NULL,
  customer_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  address VARCHAR(500) NOT NULL,
  note TEXT NULL,
  total DECIMAL(12,0) NOT NULL,
  status ENUM('pending','confirmed','shipping','completed','cancelled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NULL,
  product_name VARCHAR(180) NOT NULL,
  unit_price DECIMAL(12,0) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  line_total DECIMAL(12,0) NOT NULL,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

INSERT INTO products (name,category,price,old_price,emoji,tag,description,specs) VALUES
('iPhone 16 128GB','Điện thoại',18990000,21990000,'📱','Bán chạy','Điện thoại hiệu năng mạnh mẽ, camera chất lượng cao và trải nghiệm mượt mà.',JSON_ARRAY('Màn hình Super Retina','Bộ nhớ 128GB','Camera kép chất lượng cao')),
('Samsung Galaxy S25 256GB','Điện thoại',20990000,22990000,'📲','Giảm giá','Thiết kế hiện đại, màn hình sống động và nhiều tính năng thông minh.',JSON_ARRAY('Màn hình Dynamic AMOLED','Bộ nhớ 256GB','Hỗ trợ 5G')),
('Xiaomi Redmi Note 14','Điện thoại',4990000,5590000,'📱','Giá tốt','Lựa chọn cân bằng giữa hiệu năng, pin và chi phí.',JSON_ARRAY('Màn hình AMOLED','Pin dung lượng lớn','Sạc nhanh')),
('MacBook Air 13 M4','Laptop',25990000,27990000,'💻','Nổi bật','Laptop mỏng nhẹ, hoạt động êm ái, phù hợp học tập và công việc.',JSON_ARRAY('Chip Apple M4','Màn hình 13 inch','Thiết kế mỏng nhẹ')),
('ASUS Vivobook 15','Laptop',14990000,16990000,'🖥️','Ưu đãi','Laptop đa dụng cho học tập, văn phòng và giải trí hàng ngày.',JSON_ARRAY('Màn hình 15.6 inch','SSD tốc độ cao','Bàn phím đầy đủ')),
('Lenovo LOQ Gaming','Laptop',21990000,23990000,'🎮','Gaming','Laptop hướng đến người chơi game và người dùng cần hiệu năng đồ họa.',JSON_ARRAY('GPU rời tùy phiên bản','Màn hình tần số quét cao','Hệ thống tản nhiệt')),
('iPad Air 11 inch','Máy tính bảng',15990000,17490000,'▣','Bán chạy','Máy tính bảng tiện lợi cho học tập, sáng tạo và giải trí.',JSON_ARRAY('Màn hình 11 inch','Hỗ trợ bút cảm ứng tương thích','Thiết kế gọn nhẹ')),
('Samsung Galaxy Tab S10','Máy tính bảng',17990000,19990000,'▤','Mới','Màn hình rộng, phù hợp đọc tài liệu, xem phim và làm việc.',JSON_ARRAY('Màn hình lớn','Hỗ trợ đa nhiệm','Pin dùng lâu')),
('Tai nghe Bluetooth Pro','Phụ kiện',1290000,1690000,'🎧','Giá tốt','Tai nghe không dây tiện lợi cho công việc và giải trí.',JSON_ARRAY('Kết nối Bluetooth','Hộp sạc nhỏ gọn','Thiết kế tiện dụng')),
('Chuột không dây Silent','Phụ kiện',390000,490000,'🖱️','Phổ biến','Chuột không dây nhỏ gọn, phù hợp học tập và làm việc.',JSON_ARRAY('Kết nối không dây','Nút bấm êm','Thiết kế công thái học')),
('Bàn phím cơ RGB','Phụ kiện',890000,1190000,'⌨️','Gaming','Bàn phím cơ có đèn nền, phù hợp chơi game và gõ văn bản.',JSON_ARRAY('Đèn nền RGB','Kết nối USB','Thiết kế chắc chắn')),
('Sạc nhanh USB-C 65W','Phụ kiện',550000,690000,'🔌','Thiết yếu','Bộ sạc nhỏ gọn cho các thiết bị tương thích USB-C.',JSON_ARRAY('Công suất tối đa 65W','Cổng USB-C','Bảo vệ quá dòng'))
ON DUPLICATE KEY UPDATE name=VALUES(name);
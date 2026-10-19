# TechStore SQL (HTML/CSS/JavaScript + Node.js + MySQL)

Frontend vẫn dùng HTML, CSS, JavaScript thuần. Node.js + Express làm API backend, MySQL lưu dữ liệu. Không dùng PHP.

## Thư mục

```text
TechStore_SQL/
├── server.js
├── package.json
├── .env.example
├── database.sql
├── README.md
└── public/
    ├── index.html
    ├── product.html
    ├── cart.html
    ├── checkout.html
    ├── login.html
    ├── register.html
    ├── assets/style.css
    └── js/app.js
```

## Cần cài

1. Node.js LTS: https://nodejs.org/
2. MySQL 8 đang chạy trên máy.
3. VS Code (không bắt buộc nhưng tiện).

## Bước 1 — Tạo database

1. Mở MySQL Workbench và kết nối Local instance.
2. Mở `database.sql` trong Workbench.
3. Nhấn biểu tượng tia sét để chạy toàn bộ script.
4. Script tạo database `techstore_db`, bảng `users`, `products`, `orders`, `order_items` và dữ liệu sản phẩm mẫu.

Script dùng database mới `techstore_db`, không xóa database `dienmay_store` hiện tại.

## Bước 2 — Cấu hình kết nối

1. Mở thư mục `TechStore_SQL` bằng VS Code.
2. Tạo một bản sao của `.env.example` và đổi tên bản sao thành `.env`.
3. Mở `.env`, điền mật khẩu MySQL ở `DB_PASSWORD=...`. Nếu MySQL root không có mật khẩu, để trống sau dấu `=`.
4. Giữ `DB_NAME=techstore_db`, trừ khi bạn đã tự đổi database.
5. Đổi `SESSION_SECRET` thành một chuỗi dài ngẫu nhiên.

## Bước 3 — Cài thư viện và chạy

Mở Terminal trong VS Code tại thư mục dự án, chạy:

```powershell
node -v
npm -v
npm install
npm start
```

Khi terminal hiện `TechStore đang chạy: http://localhost:3000`, mở trình duyệt tới:

http://localhost:3000

Không mở `index.html` bằng cách nhấp đúp khi muốn dùng API; phải chạy server Node.js trước.

## Bước 4 — Kiểm tra kết nối

Mở `http://localhost:3000/api/health`. Nếu thấy `{"ok":true,"database":"connected"}` thì backend đã kết nối MySQL.

## Chức năng có kết nối MySQL

- Danh sách và chi tiết sản phẩm đọc từ bảng `products`.
- Đăng ký lưu vào bảng `users`; mật khẩu được băm bằng bcrypt.
- Đăng nhập dùng session phía máy chủ.
- Đơn đặt hàng và từng mặt hàng được lưu vào `orders` và `order_items` trong một transaction.
- Giỏ hàng ở bản demo vẫn nằm trong localStorage của trình duyệt; khi đặt hàng, server tự lấy giá thật từ MySQL để tính tổng, không tin giá gửi từ trình duyệt.

## Nếu gặp lỗi

- `Access denied for user`: kiểm tra `DB_USER` và `DB_PASSWORD` trong `.env`.
- `Unknown database 'techstore_db'`: chạy lại `database.sql`.
- `ECONNREFUSED 127.0.0.1:3306`: khởi động dịch vụ MySQL80 trong Windows Services.
- `node` hoặc `npm` không được nhận diện: cài Node.js LTS rồi đóng/mở lại VS Code.
- Trang không tải sản phẩm: giữ cửa sổ Terminal mở, đọc thông báo lỗi trong đó và kiểm tra `/api/health`.

## Ghi chú bảo mật

Đây là bộ khung học tập/chạy local, chưa sẵn sàng đưa lên internet: session store mặc định nằm trong RAM; cấu hình cookie cần HTTPS khi triển khai; cần bổ sung CSRF/rate limiting, quy trình khôi phục mật khẩu, chính sách riêng tư và các biện pháp vận hành phù hợp. Không lưu thông tin thẻ thanh toán.


## Quản trị viên (Admin)

### Nếu bạn đã cài phiên bản TechStore_SQL trước đó
1. Mở MySQL Workbench và chọn database `techstore_db`.
2. Mở file `upgrade_admin.sql` trong thư mục dự án, chạy toàn bộ script. File này thêm `users.role` và `products.image_url` nếu còn thiếu mà không xóa dữ liệu hiện có.
3. Trong thư mục dự án chạy `npm install` để cài thêm thư viện upload ảnh.

### Cấp quyền admin
1. Đăng ký tài khoản bình thường tại `http://localhost:3000/register.html`.
2. Trong Workbench chạy, thay email bên dưới bằng email bạn đã đăng ký:

```sql
USE techstore_db;
UPDATE users SET role='admin' WHERE email='email-cua-ban@example.com';
```

3. Đăng xuất rồi đăng nhập lại. Admin sẽ được chuyển đến `http://localhost:3000/admin.html`.

Trang quản trị cho phép thêm/sửa/ẩn sản phẩm, chọn Điện thoại/Laptop/Máy tính bảng/Phụ kiện, nhập giá/mô tả/thông số và tải ảnh (JPG/PNG/WEBP/GIF, tối đa 5MB). Ảnh tải lên nằm trong `public/uploads/`. API kiểm tra role ở phía máy chủ.

### Chạy
```powershell
npm install
npm start
```
Mở `http://localhost:3000`. Không mở HTML bằng cách nhấp đúp; cần chạy Node.js server.


## Kênh Seller (đơn hàng và hóa đơn)

- Trang Seller: `http://localhost:3000/seller.html`.
- Seller xem danh sách đơn hàng, tìm theo mã đơn/tên/số điện thoại, lọc trạng thái, xem hóa đơn chi tiết và in hóa đơn.
- Seller có thể cập nhật trạng thái: chờ xác nhận, đã xác nhận, đang giao, hoàn thành hoặc đã hủy.
- Chạy `upgrade_seller.sql` trong MySQL Workbench để bổ sung role `seller`; script không xóa dữ liệu.
- Cấp quyền Seller cho tài khoản đã đăng ký bằng SQL (thay email):

```sql
USE techstore_db;
UPDATE users SET role='seller' WHERE email='seller@example.com';
```

Đăng xuất rồi đăng nhập lại. Seller được chuyển thẳng tới `seller.html`. Admin cũng có quyền truy cập kênh Seller. Người dùng thường không được phép truy cập API Seller.

Lưu ý: Đây là kênh quản lý đơn hàng cơ bản. Chưa tích hợp cổng thanh toán, vận chuyển, xuất hóa đơn điện tử có giá trị pháp lý hoặc phân chia đơn theo từng seller.

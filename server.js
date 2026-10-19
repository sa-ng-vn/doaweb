require("dotenv").config();
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const uploadDir = path.join(__dirname, "public", "uploads");
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
  }
});
const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)) cb(null, true);
    else cb(new Error("Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF."));
  }
});
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "techstore_db",
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
  charset: "utf8mb4"
});

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  name: "techstore.sid",
  secret: process.env.SESSION_SECRET || "development-only-change-this-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: false, maxAge: 1000 * 60 * 60 * 8 }
}));
app.use(express.static(path.join(__dirname, "public")));

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
function cleanUser(user) { return { id: user.id, name: user.name, email: user.email, role: user.role || "user" }; }
function requireAdmin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Vui lòng đăng nhập." });
  if (req.session.user.role !== "admin") return res.status(403).json({ error: "Bạn không có quyền quản trị." });
  next();
}

function requireSeller(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Vui lòng đăng nhập." });
  if (!["seller", "admin"].includes(req.session.user.role)) return res.status(403).json({ error: "Chỉ Seller hoặc Admin mới được truy cập." });
  next();
}
function requireUser(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Vui lòng đăng nhập trước." });
  next();
}
function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

app.get("/api/health", asyncRoute(async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true, database: "connected" });
}));

app.get("/api/products", asyncRoute(async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 100);
  const category = String(req.query.category || "").trim().slice(0, 80);
  const sort = String(req.query.sort || "featured");
  let sql = "SELECT id,name,category,price,old_price AS oldPrice,emoji,image_url AS imageUrl,tag,description,specs FROM products WHERE active=1";
  const params = [];
  if (q) { sql += " AND (name LIKE ? OR category LIKE ? OR description LIKE ?)"; params.push(`%${q}%`,`%${q}%`,`%${q}%`); }
  if (category && category !== "Tất cả") { sql += " AND category=?"; params.push(category); }
  if (sort === "low") sql += " ORDER BY price ASC";
  else if (sort === "high") sql += " ORDER BY price DESC";
  else sql += " ORDER BY id ASC";
  const [rows] = await pool.query(sql, params);
  res.json(rows.map(p => ({ ...p, price: Number(p.price), oldPrice: Number(p.oldPrice), specs: Array.isArray(p.specs) ? p.specs : safeJson(p.specs) })));
}));
function safeJson(v) { try { return JSON.parse(v || "[]"); } catch { return []; } }

app.get("/api/products/:id", asyncRoute(async (req, res) => {
  const [rows] = await pool.execute("SELECT id,name,category,price,old_price AS oldPrice,emoji,image_url AS imageUrl,tag,description,specs FROM products WHERE id=? AND active=1", [Number(req.params.id)]);
  if (!rows.length) return res.status(404).json({ error: "Không tìm thấy sản phẩm." });
  const p = rows[0]; p.price = Number(p.price); p.oldPrice = Number(p.oldPrice); p.specs = Array.isArray(p.specs) ? p.specs : safeJson(p.specs);
  res.json(p);
}));


// Admin API: tất cả thao tác quản trị được kiểm tra quyền ở phía máy chủ.
app.get("/api/admin/products", requireAdmin, asyncRoute(async (_req, res) => {
  const [rows] = await pool.query("SELECT id,name,category,price,old_price AS oldPrice,emoji,image_url AS imageUrl,tag,description,specs,active FROM products ORDER BY id DESC");
  res.json(rows.map(p => ({ ...p, price: Number(p.price), oldPrice: Number(p.oldPrice), specs: Array.isArray(p.specs) ? p.specs : safeJson(p.specs) })));
}));
app.post("/api/admin/products", requireAdmin, uploadImage.single("image"), asyncRoute(async (req, res) => {
  const p = parseProduct(req.body);
  if (p.error) return res.status(400).json({ error: p.error });
  const imageUrl = req.file ? "/uploads/" + req.file.filename : (p.imageUrl || null);
  const [result] = await pool.execute(
    "INSERT INTO products(name,category,price,old_price,emoji,image_url,tag,description,specs,active) VALUES(?,?,?,?,?,?,?,?,?,?)",
    [p.name,p.category,p.price,p.oldPrice,p.emoji,imageUrl,p.tag,p.description,JSON.stringify(p.specs),p.active]
  );
  res.status(201).json({ ok: true, id: result.insertId });
}));
app.put("/api/admin/products/:id", requireAdmin, uploadImage.single("image"), asyncRoute(async (req, res) => {
  const p = parseProduct(req.body);
  if (p.error) return res.status(400).json({ error: p.error });
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "ID sản phẩm không hợp lệ." });
  const [found] = await pool.execute("SELECT id,image_url FROM products WHERE id=?", [id]);
  if (!found.length) return res.status(404).json({ error: "Không tìm thấy sản phẩm." });
  const imageUrl = req.file ? "/uploads/" + req.file.filename : (p.imageUrl || found[0].image_url || null);
  await pool.execute(
    "UPDATE products SET name=?,category=?,price=?,old_price=?,emoji=?,image_url=?,tag=?,description=?,specs=?,active=? WHERE id=?",
    [p.name,p.category,p.price,p.oldPrice,p.emoji,imageUrl,p.tag,p.description,JSON.stringify(p.specs),p.active,id]
  );
  res.json({ ok: true });
}));
app.delete("/api/admin/products/:id", requireAdmin, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "ID sản phẩm không hợp lệ." });
  const [result] = await pool.execute("DELETE FROM products WHERE id=?", [id]);
  if (!result.affectedRows) return res.status(404).json({ error: "Không tìm thấy sản phẩm." });
  res.json({ ok: true });
}));
function parseProduct(body) {
  const name = String(body.name || "").trim();
  const category = String(body.category || "").trim();
  const description = String(body.description || "").trim();
  const price = Number(body.price), oldPrice = Number(body.oldPrice || 0);
  const emoji = String(body.emoji || "📦").trim().slice(0,16);
  const tag = String(body.tag || "Nổi bật").trim().slice(0,50);
  const imageUrl = String(body.imageUrl || "").trim().slice(0,500);
  const active = body.active === "false" || body.active === "0" ? 0 : 1;
  if (name.length < 2 || name.length > 180) return { error: "Tên sản phẩm phải có từ 2 đến 180 ký tự." };
  if (!["Điện thoại","Laptop","Máy tính bảng","Phụ kiện"].includes(category)) return { error: "Hãy chọn loại sản phẩm hợp lệ." };
  if (!Number.isFinite(price) || price < 0 || price > 999999999999) return { error: "Giá bán không hợp lệ." };
  if (!Number.isFinite(oldPrice) || oldPrice < 0 || oldPrice > 999999999999) return { error: "Giá cũ không hợp lệ." };
  if (description.length < 5 || description.length > 5000) return { error: "Mô tả cần từ 5 đến 5000 ký tự." };
  let specs = [];
  try { specs = body.specs ? JSON.parse(body.specs) : []; } catch { return { error: "Thông số phải là JSON hợp lệ." }; }
  if (!Array.isArray(specs) || specs.some(s => typeof s !== "string")) return { error: "Thông số phải là danh sách văn bản." };
  return { name,category,description,price,oldPrice,emoji,tag,imageUrl,active,specs:specs.slice(0,20).map(s=>s.slice(0,200)) };
}

app.get("/api/auth/me", (req, res) => res.json({ user: req.session.user || null }));
app.post("/api/auth/register", asyncRoute(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (name.length < 2 || name.length > 120) return res.status(400).json({ error: "Họ tên phải có từ 2 đến 120 ký tự." });
  if (!validEmail(email) || email.length > 190) return res.status(400).json({ error: "Email không hợp lệ." });
  if (password.length < 8 || password.length > 72) return res.status(400).json({ error: "Mật khẩu phải từ 8 đến 72 ký tự." });
  const [existing] = await pool.execute("SELECT id FROM users WHERE email=?", [email]);
  if (existing.length) return res.status(409).json({ error: "Email này đã được đăng ký." });
  const hash = await bcrypt.hash(password, 12);
  const [result] = await pool.execute("INSERT INTO users(name,email,password_hash) VALUES(?,?,?)", [name,email,hash]);
  req.session.user = { id: result.insertId, name, email, role: "user" };
  res.status(201).json({ user: req.session.user });
}));
app.post("/api/auth/login", asyncRoute(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const [rows] = await pool.execute("SELECT id,name,email,password_hash,role FROM users WHERE email=?", [email]);
  if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) return res.status(401).json({ error: "Email hoặc mật khẩu không đúng." });
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: "Không thể tạo phiên đăng nhập." });
    req.session.user = cleanUser(rows[0]);
    req.session.save(saveErr => {
      if (saveErr) return res.status(500).json({ error: "Không thể lưu phiên đăng nhập." });
      res.json({ user: req.session.user });
    });
  });
}));
app.post("/api/auth/logout", (req, res) => req.session.destroy(() => {
  res.clearCookie("techstore.sid", { httpOnly: true, sameSite: "lax" });
  res.json({ ok: true });
}));

app.post("/api/orders", asyncRoute(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const phone = String(req.body.phone || "").trim();
  const address = String(req.body.address || "").trim();
  const note = String(req.body.note || "").trim().slice(0, 2000);
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (name.length < 2 || name.length > 120) return res.status(400).json({ error: "Vui lòng nhập họ tên hợp lệ." });
  if (!/^[0-9+() .-]{9,16}$/.test(phone)) return res.status(400).json({ error: "Số điện thoại không hợp lệ." });
  if (address.length < 5 || address.length > 500) return res.status(400).json({ error: "Vui lòng nhập địa chỉ nhận hàng." });
  if (!items.length || items.length > 50) return res.status(400).json({ error: "Giỏ hàng trống hoặc có quá nhiều sản phẩm." });

  const normalized = new Map();
  for (const item of items) {
    const id = Number(item.id), qty = Number(item.qty);
    if (!Number.isInteger(id) || id < 1 || !Number.isInteger(qty) || qty < 1 || qty > 99) return res.status(400).json({ error: "Số lượng sản phẩm không hợp lệ." });
    normalized.set(id, Math.min(99, (normalized.get(id) || 0) + qty));
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const ids = [...normalized.keys()];
    const placeholders = ids.map(() => "?").join(",");
    const [products] = await conn.query(`SELECT id,name,price FROM products WHERE active=1 AND id IN (${placeholders})`, ids);
    if (products.length !== ids.length) throw Object.assign(new Error("Một hoặc nhiều sản phẩm không còn tồn tại."), { status: 400 });
    const byId = new Map(products.map(p => [p.id, p]));
    const lines = ids.map(id => ({ p: byId.get(id), qty: normalized.get(id) }));
    const total = lines.reduce((sum, line) => sum + Number(line.p.price) * line.qty, 0);
    const orderCode = "TS" + Date.now().toString().slice(-8) + crypto.randomBytes(2).toString("hex").toUpperCase();
    const [orderResult] = await conn.execute(
      "INSERT INTO orders(order_code,user_id,customer_name,phone,address,note,total) VALUES(?,?,?,?,?,?,?)",
      [orderCode, req.session.user?.id || null, name, phone, address, note || null, total]
    );
    for (const line of lines) {
      const unit = Number(line.p.price);
      await conn.execute(
        "INSERT INTO order_items(order_id,product_id,product_name,unit_price,quantity,line_total) VALUES(?,?,?,?,?,?)",
        [orderResult.insertId, line.p.id, line.p.name, unit, line.qty, unit * line.qty]
      );
    }
    await conn.commit();
    res.status(201).json({ ok: true, orderCode, total });
  } catch (err) {
    await conn.rollback();
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  } finally { conn.release(); }
}));


// Seller API: xem hóa đơn/đơn hàng và cập nhật trạng thái. Admin cũng được phép truy cập.
app.get("/api/seller/orders", requireSeller, asyncRoute(async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 100);
  const status = String(req.query.status || "").trim();
  const allowedStatuses = ["pending", "confirmed", "shipping", "completed", "cancelled"];
  let sql = `SELECT o.id, o.order_code AS orderCode, o.customer_name AS customerName,
      o.phone, o.address, o.note, o.total, o.status, o.created_at AS createdAt,
      COALESCE(SUM(oi.quantity), 0) AS itemCount
    FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id WHERE 1=1`;
  const params = [];
  if (q) {
    sql += " AND (o.order_code LIKE ? OR o.customer_name LIKE ? OR o.phone LIKE ?)";
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (status && allowedStatuses.includes(status)) { sql += " AND o.status=?"; params.push(status); }
  sql += " GROUP BY o.id ORDER BY o.created_at DESC LIMIT 500";
  const [rows] = await pool.query(sql, params);
  res.json(rows.map(o => ({ ...o, total: Number(o.total), itemCount: Number(o.itemCount) })));
}));
app.get("/api/seller/orders/:id", requireSeller, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Mã đơn hàng không hợp lệ." });
  const [orders] = await pool.execute(`SELECT id, order_code AS orderCode, customer_name AS customerName,
    phone, address, note, total, status, created_at AS createdAt FROM orders WHERE id=?`, [id]);
  if (!orders.length) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
  const [items] = await pool.execute(`SELECT product_name AS productName, unit_price AS unitPrice,
    quantity, line_total AS lineTotal FROM order_items WHERE order_id=? ORDER BY id`, [id]);
  res.json({ ...orders[0], total: Number(orders[0].total), items: items.map(i => ({
    ...i, unitPrice: Number(i.unitPrice), quantity: Number(i.quantity), lineTotal: Number(i.lineTotal)
  })) });
}));
app.patch("/api/seller/orders/:id/status", requireSeller, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body.status || "");
  const allowedStatuses = ["pending", "confirmed", "shipping", "completed", "cancelled"];
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "Mã đơn hàng không hợp lệ." });
  if (!allowedStatuses.includes(status)) return res.status(400).json({ error: "Trạng thái đơn hàng không hợp lệ." });
  const [found] = await pool.execute("SELECT id FROM orders WHERE id=?", [id]);
  if (!found.length) return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
  await pool.execute("UPDATE orders SET status=? WHERE id=?", [status, id]);
  res.json({ ok: true, status });
}));

app.use("/api", (_req, res) => res.status(404).json({ error: "API không tồn tại." }));
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "Ảnh tối đa 5MB." : "Không thể tải ảnh lên." });
  if (err && /Chỉ chấp nhận ảnh/.test(err.message || "")) return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "Có lỗi máy chủ. Kiểm tra cấu hình MySQL và cửa sổ terminal." });
});

(async () => {
  try {
    await pool.query("SELECT 1");
    app.listen(PORT, () => console.log(`TechStore đang chạy: http://localhost:${PORT}`));
  } catch (err) {
    console.error("Không kết nối được MySQL. Kiểm tra file .env, mật khẩu, dịch vụ MySQL và database.sql.");
    console.error(err.message);
    process.exit(1);
  }
})();
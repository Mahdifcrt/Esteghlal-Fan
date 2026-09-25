const express = require("express"); const session = require("express-session"); const path = require("path"); const fs = require("fs"); const multer = require("multer");
const app = express();
const PORT = process.env.PORT  3000; const ADMIN_USER = process.env.ADMIN_USER  "admin"; const ADMIN_PASS = process.env.ADMIN_PASS || "123456";
const dataDir = path.join(__dirname, "data"); const uploadDir = path.join(__dirname, "public", "uploads");
fs.mkdirSync(dataDir, { recursive: true }); fs.mkdirSync(uploadDir, { recursive: true });
const dbFile = path.join(dataDir, "news.json");
if (!fs.existsSync(dbFile)) { fs.writeFileSync( dbFile, JSON.stringify( [ { id: 1, title: "استقلال برای دیدار بعدی آماده می‌شود", category: "تیم", body: "این یک خبر نمونه است.", image: "", breaking: true, date: new Date().toISOString() } ], null, 2 ) ); }
function readNews() { return JSON.parse(fs.readFileSync(dbFile, "utf8")); }
function writeNews(items) { fs.writeFileSync( dbFile, JSON.stringify(items, null, 2) ); }
app.use(express.json({ limit: "2mb" })); app.use(express.urlencoded({ extended: true }));
app.use( session({ secret: process.env.SESSION_SECRET || "esteghlal-fan-secret", resave: false, saveUninitialized: false, cookie: { httpOnly: true } }) );
app.use(express.static(path.join(__dirname, "public")));
const storage = multer.diskStorage({ destination: (_, __, cb) => { cb(null, uploadDir); },
filename: (_, file, cb) => { const ext = path.extname(file.originalname).toLowerCase();
cb(
  null,
  Date.now() +
    "-" +
    Math.random().toString(36).slice(2) +
    ext
);
} });
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
function auth(req, res, next) { if (req.session.admin) { return next(); }
res.status(401).json({ error: "نیاز به ورود مدیر دارید" }); }
app.get("/api/news", (req, res) => { const items = readNews().sort( (a, b) => new Date(b.date) - new Date(a.date) );
res.json(items); });
app.post("/api/login", (req, res) => { if ( req.body.username === ADMIN_USER && req.body.password === ADMIN_PASS ) { req.session.admin = true;
return res.json({
  ok: true
});
}
res.status(401).json({ error: "نام کاربری یا رمز عبور نادرست است" }); });
app.post("/api/logout", auth, (req, res) => { req.session.destroy(() => { res.json({ ok: true }); }); });
app.get("/api/me", (req, res) => { res.json({ loggedIn: !!req.session.admin }); });
app.post( "/api/upload", auth, upload.single("image"), (req, res) => { if (!req.file) { return res.status(400).json({ error: "فایلی انتخاب نشده است" }); }
res.json({
  url: "/uploads/" + req.file.filename
});
} );
app.post("/api/news", auth, (req, res) => { const { title, category, body, image, breaking } = req.body;
if (!title || !body) { return res.status(400).json({ error: "عنوان و متن خبر الزامی است" }); }
const items = readNews();
const item = { id: Date.now(), title, category: category  "عمومی", body, image: image  "", breaking: !!breaking, date: new Date().toISOString() };
items.push(item); writeNews(items);
res.json(item); });
app.put("/api/news/:id", auth, (req, res) => { const items = readNews();
const i = items.findIndex( x => x.id == req.params.id );
if (i < 0) { return res.status(404).json({ error: "خبر پیدا نشد" }); }
items[i] = { ...items[i], ...req.body, id: items[i].id, date: items[i].date };
writeNews(items);
res.json(items[i]); });
app.delete("/api/news/:id", auth, (req, res) => { const items = readNews();
const i = items.findIndex( x => x.id == req.params.id );
if (i < 0) { return res.status(404).json({ error: "خبر پیدا نشد" }); }
const [deleted] = items.splice(i, 1);
writeNews(items);
res.json(deleted); });
app.get("/admin", (_, res) => { res.sendFile( path.join(__dirname, "public", "admin.html") ); });
app.listen(PORT, "0.0.0.0", () => { console.log( Esteghlal Fan running on port ${PORT} ); });

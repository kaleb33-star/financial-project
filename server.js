require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");
const { getState, setState } = require("./db");

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const USER_PASSWORD = process.env.USER_PASSWORD || "user123";
const SESSION_SECRET =
  process.env.SESSION_SECRET || "change-this-secret-before-real-use";

if (!process.env.SESSION_SECRET || !process.env.ADMIN_PASSWORD) {
  console.warn(
    "\n⚠️  Using default SESSION_SECRET/ADMIN_PASSWORD/USER_PASSWORD. " +
      "Set real values in a .env file before putting this online.\n" +
      "   See .env.example.\n",
  );
}

app.use(express.json({ limit: "5mb" }));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      // "auto" checks the real connection (via the trust proxy setting
      // above) instead of blindly forcing Secure, which is what breaks
      // logins behind a reverse proxy like most hosting platforms use.
      secure: process.env.COOKIE_SECURE === "true" ? "auto" : false,
      maxAge: 1000 * 60 * 60 * 24 * 14, // 2 weeks
    },
  }),
);

function requireLogin(req, res, next) {
  if (req.session && req.session.role) return next();
  return res.status(401).json({ ok: false, message: "አልገባችሁም (not logged in)" });
}

// ---- Auth ----
app.post("/api/login", (req, res) => {
  const { role, password } = req.body || {};
  if (role === "admin" && password === ADMIN_PASSWORD) {
    req.session.role = "admin";
    return res.json({ ok: true, role: "admin" });
  }
  if (role === "staff" && password === USER_PASSWORD) {
    req.session.role = "staff";
    return res.json({ ok: true, role: "staff" });
  }
  return res.status(401).json({ ok: false, message: "የተሳሳተ የይለፍ ቃል።" });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/session", (req, res) => {
  res.json({ role: (req.session && req.session.role) || null });
});

// ---- Data ----
app.get("/api/state", requireLogin, (req, res) => {
  res.json(getState());
});

app.post("/api/state", requireLogin, (req, res) => {
  const body = req.body || {};
  if (
    !Array.isArray(body.expenses) ||
    !Array.isArray(body.incomes) ||
    !Array.isArray(body.conIncomes) ||
    !Array.isArray(body.conExpenses) ||
    !Array.isArray(body.promisedMoney) ||
    !Array.isArray(body.promisePayments) ||
    !Array.isArray(body.middlePersons)
  ) {
    return res.status(400).json({ ok: false, message: "Malformed state payload" });
  }
  try {
    setState(body);
    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to save state:", err);
    res.status(500).json({ ok: false, message: "Server failed to save" });
  }
});

// ---- Static frontend ----
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`Church budget server running on http://localhost:${PORT}`);
});
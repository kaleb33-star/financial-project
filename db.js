// db.js — the actual database.
// Uses Node's BUILT-IN SQLite module (node:sqlite, Node 22.5+) instead of
// a third-party native package. That means no compiler/Visual Studio/
// node-gyp step is needed at all — it ships inside Node itself.
// Still a real, structured, file-based database: one file on disk,
// data/church.db, with proper tables — not a JSON blob.

const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, "church.db"));
db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    field TEXT,
    subfield TEXT,
    amount REAL,
    reason TEXT,
    payment TEXT,
    bankName TEXT,
    receipt TEXT,
    middlePersonName TEXT,
    middleNigdAmount REAL DEFAULT 0,
    middleBirhanAmount REAL DEFAULT 0,
    date TEXT,
    recordedBy TEXT,
    staffId TEXT
  );

  CREATE TABLE IF NOT EXISTS incomes (
    id TEXT PRIMARY KEY,
    source TEXT,
    bankName TEXT,
    amount REAL,
    note TEXT,
    receipt TEXT,
    date TEXT,
    recordedBy TEXT
  );

  CREATE TABLE IF NOT EXISTS con_incomes (
    id TEXT PRIMARY KEY,
    type TEXT,
    bankName TEXT,
    amount REAL,
    note TEXT,
    receipt TEXT,
    date TEXT,
    recordedBy TEXT
  );

  CREATE TABLE IF NOT EXISTS con_expenses (
    id TEXT PRIMARY KEY,
    type TEXT,
    bankName TEXT,
    amount REAL,
    reason TEXT,
    payment TEXT,
    receipt TEXT,
    middlePersonName TEXT,
    middleNigdAmount REAL DEFAULT 0,
    middleBirhanAmount REAL DEFAULT 0,
    date TEXT,
    recordedBy TEXT,
    staffId TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    regTrade REAL DEFAULT 0,
    regBirhan REAL DEFAULT 0,
    conTrade REAL DEFAULT 0,
    conBirhan REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS promised_money (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    phone TEXT,
    deadline TEXT,
    date TEXT,
    note TEXT,
    recordedBy TEXT
  );

  CREATE TABLE IF NOT EXISTS promise_payments (
    id TEXT PRIMARY KEY,
    promiseId TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT,
    note TEXT,
    recordedBy TEXT
  );

  CREATE TABLE IF NOT EXISTS middle_persons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    nigdAmount REAL NOT NULL DEFAULT 0,
    birhanAmount REAL NOT NULL DEFAULT 0,
    date TEXT,
    note TEXT,
    recordedBy TEXT
  );
`);

// Add columns to tables that may already exist from before this feature was
// introduced. SQLite has no "ADD COLUMN IF NOT EXISTS", so we just try and
// ignore the error when the column is already there.
function addColumnIfMissing(table, column, definition) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (e) {
    // Column already exists — nothing to do.
  }
}
addColumnIfMissing("promised_money", "phone", "TEXT");
addColumnIfMissing("promised_money", "deadline", "TEXT");
addColumnIfMissing("expenses", "middlePersonName", "TEXT");
addColumnIfMissing("expenses", "middleNigdAmount", "REAL DEFAULT 0");
addColumnIfMissing("expenses", "middleBirhanAmount", "REAL DEFAULT 0");
addColumnIfMissing("con_expenses", "middlePersonName", "TEXT");
addColumnIfMissing("con_expenses", "middleNigdAmount", "REAL DEFAULT 0");
addColumnIfMissing("con_expenses", "middleBirhanAmount", "REAL DEFAULT 0");
addColumnIfMissing("incomes", "receipt", "TEXT");
addColumnIfMissing("con_incomes", "receipt", "TEXT");

// Make sure the single settings row always exists.
db.exec(`
  INSERT OR IGNORE INTO settings (id, regTrade, regBirhan, conTrade, conBirhan)
  VALUES (1, 0, 0, 0, 0)
`);

function getState() {
  const expenses = db.prepare("SELECT * FROM expenses ORDER BY date DESC").all();
  const incomes = db.prepare("SELECT * FROM incomes ORDER BY date DESC").all();
  const conIncomes = db
    .prepare("SELECT * FROM con_incomes ORDER BY date DESC")
    .all();
  const conExpenses = db
    .prepare("SELECT * FROM con_expenses ORDER BY date DESC")
    .all();
  const settings = db.prepare("SELECT * FROM settings WHERE id = 1").get();
  const promisedMoney = db.prepare("SELECT * FROM promised_money ORDER BY date DESC").all();
  const promisePayments = db
    .prepare("SELECT * FROM promise_payments ORDER BY date DESC")
    .all();
  const middlePersons = db.prepare("SELECT * FROM middle_persons ORDER BY date DESC").all();
  return {
    expenses,
    incomes,
    conIncomes,
    conExpenses,
    settings,
    promisedMoney,
    promisePayments,
    middlePersons,
  };
}

// Whole-state replace, wrapped in a manual transaction (BEGIN/COMMIT/
// ROLLBACK) since node:sqlite doesn't have better-sqlite3's .transaction()
// helper. Simple and safe for a small single-church deployment: the
// browser sends its full current arrays after every add/remove/restore,
// and this swaps the tables' contents to match.
// (Trade-off: if two people save at almost the same instant, the last
// save wins — there's no per-record merge. Fine for a handful of
// admins/staff who aren't editing at the exact same second.)
function setState(state) {
  db.exec("BEGIN");
  try {
    db.exec("DELETE FROM expenses");
    const insExp = db.prepare(`
      INSERT INTO expenses (id, field, subfield, amount, reason, payment, bankName, receipt, middlePersonName, middleNigdAmount, middleBirhanAmount, date, recordedBy, staffId)
      VALUES (@id, @field, @subfield, @amount, @reason, @payment, @bankName, @receipt, @middlePersonName, @middleNigdAmount, @middleBirhanAmount, @date, @recordedBy, @staffId)
    `);
    for (const e of state.expenses || []) {
      insExp.run({
        id: String(e.id),
        field: e.field || "",
        subfield: e.subfield || "",
        amount: Number(e.amount) || 0,
        reason: e.reason || "",
        payment: e.payment || "",
        bankName: e.bankName || "",
        receipt: e.receipt || "",
        middlePersonName: e.middlePersonName || "",
        middleNigdAmount: Number(e.middleNigdAmount) || 0,
        middleBirhanAmount: Number(e.middleBirhanAmount) || 0,
        date: e.date || "",
        recordedBy: e.recordedBy || "",
        staffId: e.staffId != null ? String(e.staffId) : null,
      });
    }

    db.exec("DELETE FROM incomes");
    const insInc = db.prepare(`
      INSERT INTO incomes (id, source, bankName, amount, note, receipt, date, recordedBy)
      VALUES (@id, @source, @bankName, @amount, @note, @receipt, @date, @recordedBy)
    `);
    for (const i of state.incomes || []) {
      insInc.run({
        id: String(i.id),
        source: i.source || "",
        bankName: i.bankName || "",
        amount: Number(i.amount) || 0,
        note: i.note || "",
        receipt: i.receipt || "",
        date: i.date || "",
        recordedBy: i.recordedBy || "",
      });
    }

    db.exec("DELETE FROM con_incomes");
    const insConInc = db.prepare(`
      INSERT INTO con_incomes (id, type, bankName, amount, note, receipt, date, recordedBy)
      VALUES (@id, @type, @bankName, @amount, @note, @receipt, @date, @recordedBy)
    `);
    for (const i of state.conIncomes || []) {
      insConInc.run({
        id: String(i.id),
        type: i.type || "",
        bankName: i.bankName || "",
        amount: Number(i.amount) || 0,
        note: i.note || "",
        receipt: i.receipt || "",
        date: i.date || "",
        recordedBy: i.recordedBy || "",
      });
    }

    db.exec("DELETE FROM con_expenses");
    const insConExp = db.prepare(`
      INSERT INTO con_expenses (id, type, bankName, amount, reason, payment, receipt, middlePersonName, middleNigdAmount, middleBirhanAmount, date, recordedBy, staffId)
      VALUES (@id, @type, @bankName, @amount, @reason, @payment, @receipt, @middlePersonName, @middleNigdAmount, @middleBirhanAmount, @date, @recordedBy, @staffId)
    `);
    for (const e of state.conExpenses || []) {
      insConExp.run({
        id: String(e.id),
        type: e.type || "",
        bankName: e.bankName || "",
        amount: Number(e.amount) || 0,
        reason: e.reason || "",
        payment: e.payment || "",
        receipt: e.receipt || "",
        middlePersonName: e.middlePersonName || "",
        middleNigdAmount: Number(e.middleNigdAmount) || 0,
        middleBirhanAmount: Number(e.middleBirhanAmount) || 0,
        date: e.date || "",
        recordedBy: e.recordedBy || "",
        staffId: e.staffId != null ? String(e.staffId) : null,
      });
    }

    if (state.settings) {
      const s = state.settings;
      db.prepare(
        `UPDATE settings SET regTrade=@regTrade, regBirhan=@regBirhan,
           conTrade=@conTrade, conBirhan=@conBirhan WHERE id = 1`,
      ).run({
        regTrade: Number(s.regTrade) || 0,
        regBirhan: Number(s.regBirhan) || 0,
        conTrade: Number(s.conTrade) || 0,
        conBirhan: Number(s.conBirhan) || 0,
      });
    }

    db.exec("DELETE FROM promised_money");
    const insPromise = db.prepare(`
      INSERT INTO promised_money (id, name, amount, category, phone, deadline, date, note, recordedBy)
      VALUES (@id, @name, @amount, @category, @phone, @deadline, @date, @note, @recordedBy)
    `);
    for (const p of state.promisedMoney || []) {
      insPromise.run({
        id: String(p.id),
        name: p.name || "",
        amount: Number(p.amount) || 0,
        category: p.category || "normal",
        phone: p.phone || "",
        deadline: p.deadline || "",
        date: p.date || "",
        note: p.note || "",
        recordedBy: p.recordedBy || "",
      });
    }

    db.exec("DELETE FROM promise_payments");
    const insPromisePayment = db.prepare(`
      INSERT INTO promise_payments (id, promiseId, amount, date, note, recordedBy)
      VALUES (@id, @promiseId, @amount, @date, @note, @recordedBy)
    `);
    for (const p of state.promisePayments || []) {
      insPromisePayment.run({
        id: String(p.id),
        promiseId: String(p.promiseId),
        amount: Number(p.amount) || 0,
        date: p.date || "",
        note: p.note || "",
        recordedBy: p.recordedBy || "",
      });
    }

    db.exec("DELETE FROM middle_persons");
    const insMiddle = db.prepare(`
      INSERT INTO middle_persons (id, name, nigdAmount, birhanAmount, date, note, recordedBy)
      VALUES (@id, @name, @nigdAmount, @birhanAmount, @date, @note, @recordedBy)
    `);
    for (const m of state.middlePersons || []) {
      insMiddle.run({
        id: String(m.id),
        name: m.name || "",
        nigdAmount: Number(m.nigdAmount) || 0,
        birhanAmount: Number(m.birhanAmount) || 0,
        date: m.date || "",
        note: m.note || "",
        recordedBy: m.recordedBy || "",
      });
    }

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

module.exports = { getState, setState };

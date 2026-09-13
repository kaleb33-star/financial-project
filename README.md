# የቤተ ክርስቲያን በጀት ዳሽቦርድ — Server + Database Edition

This turns the single-file dashboard into a small **Node.js app with a real
SQLite database**, so the data lives on the server instead of one browser's
`localStorage`. Anyone who logs in — from any computer or phone — reads and
writes the same shared data.

## What changed vs. the old single-file version

- All the numbers (expenses, incomes, construction accounts, opening
  balances) now live in `data/church.db`, a real SQLite database file on
  the server, not in the browser.
- Login passwords are checked **on the server** (`server.js`), not in the
  page's JavaScript — before, anyone could open the browser's dev tools and
  read the admin password straight out of the code. That hole is closed.
- The web page (`public/index.html`) is almost identical to before — same
  look, same forms, same reports — it just now talks to the server via a
  small API instead of `localStorage`.
- A little "✅ ተቀምጧል / 💾 እያስቀመጠ... / ⚠️ አልተቀመጠም" indicator in the header
  tells you whether your last entry actually reached the database.
- The screen quietly refreshes itself every 20 seconds so a second admin or
  staff member's entries show up without anyone needing to hit reload.

**Known limitation, on purpose (kept simple):** if two people hit "save"
in the exact same second, the second save wins — there's no per-field
merging. For a small church team taking turns entering data, this is very
unlikely to matter. If it ever does, the fix is switching a few endpoints
from "replace everything" to "add one record", which is a moderate,
contained upgrade — ask me later if you want that.

## 1. Requirements

- [Node.js](https://nodejs.org) version 18 or newer installed on whatever
  machine or hosting account will run this (check with `node -v`).
- That's it — SQLite needs no separate database server/installation, the
  database is just a file that gets created automatically.

## 2. Run it locally first (recommended before hosting)

```bash
cd church-server
npm install
cp .env.example .env
```

Open `.env` in a text editor and set:

- `ADMIN_PASSWORD` — the admin login password
- `USER_PASSWORD` — the shared staff/data-entry password
- `SESSION_SECRET` — any long random string (the file explains how to
  generate one)

Then:

```bash
npm start
```

Visit **http://localhost:3000** — you should see the same login screen as
before. Log in, add a test expense, refresh the page — it should still be
there (now coming from the database, not the browser).

## 3. Hosting it for real

You need somewhere that can keep a Node.js process running continuously
(not just serve static files) and keep a `data/` folder around between
restarts. Two simple, cheap/free options:

### Option A — Render.com (probably the easiest)

1. Put this folder in a GitHub repository.
2. On [render.com](https://render.com), create a new **Web Service** from
   that repo.
3. Build command: `npm install` — Start command: `npm start`.
4. Add a **persistent disk** (Render calls this a "Disk") mounted at
   `/opt/render/project/src/data` — this is important, otherwise your
   database resets every time Render restarts the app.
5. Under Environment, add `ADMIN_PASSWORD`, `USER_PASSWORD`,
   `SESSION_SECRET`, and `COOKIE_SECURE=true` (Render gives you https://
   automatically).
6. Deploy. Render gives you a URL like `https://yourchurch.onrender.com` —
   that's what everyone visits.

Render's free tier sleeps after inactivity and wakes up on the next visit
(a few seconds' delay) — fine for a low-traffic internal tool. Paid tiers
remove that if it ever becomes annoying.

### Option B — Any VPS (DigitalOcean, Hetzner, a spare Linux box, etc.)

1. Install Node.js 18+ on the server.
2. Copy this folder up (e.g. `scp`, `git clone`, or an SFTP client).
3. `npm install`, create `.env` as above (set `COOKIE_SECURE=true` once
   HTTPS is set up).
4. Run it so it survives you logging out — either:
   - `npm install -g pm2 && pm2 start server.js --name church && pm2 save`
     (recommended — pm2 restarts it automatically if it crashes or the
     server reboots), or
   - a `systemd` service, if you're comfortable with that.
5. Put a reverse proxy (nginx or Caddy) in front of it for a real domain
   name and free HTTPS (Caddy does this almost automatically). Point the
   proxy at `http://localhost:3000`.

## 4. Backing up the database

The export/import buttons in the app (⚙️ ተጨማሪ አማራጮች → 💾 ምትኬ አውርድ / 📥 ምትኬ
መልስ) still work exactly as before, and are the easiest way for the admin
to keep a personal backup copy.

For a server-level backup, the whole database is one file:
`church-server/data/church.db`. Copying that file elsewhere periodically
(e.g. a nightly `scp` / cron job, or your hosting provider's disk snapshot
feature) is a complete backup.

## 5. Changing passwords later

Edit `ADMIN_PASSWORD` / `USER_PASSWORD` in your `.env` (or your host's
"Environment Variables" settings) and restart the app. There's no
in-app "change password" screen yet — this keeps the login logic simple
and server-side, which is the important security win. Say the word if
you'd like an in-app password-change screen added later.

## 6. File map

```
church-server/
├── server.js        the web server: login, sessions, the data API
├── db.js             the database itself: table setup + read/write helpers
├── package.json       Node dependency list
├── .env.example       copy to .env and fill in real passwords
├── .gitignore
└── public/
    └── index.html      the dashboard page (frontend) — same UI as before
```

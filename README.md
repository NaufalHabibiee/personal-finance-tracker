# Personal Finance Tracker

Aplikasi web mobile-first untuk mengelola keuangan pribadi (pemasukan, pengeluaran, budget, laporan) — full-stack JavaScript, bisa run lokal maupun deploy gratis ke Vercel + Turso.

**Stack:**
- **Backend:** Node.js + Express + libSQL (Turso-compatible SQLite) + JWT auth
- **Frontend:** React 18 + Vite + React Router + Recharts
- **DB:** libSQL — local file untuk dev, Turso cloud untuk production
- **Deploy:** Vercel (monorepo: frontend static + backend sebagai serverless functions)

---

## Quick start (lokal)

### Prasyarat
- Node.js ≥ 18, npm ≥ 9

### 1. Install
```bash
npm run install:all
```

### 2. Setup env
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```
Edit `backend/.env` → ganti `JWT_SECRET` ke string acak panjang.

### 3. (Opsional) Seed dummy data
```bash
npm run seed
```
Buat user demo:
- **Email:** `demo@pft.app`
- **Password:** `demo1234`
- 6 bulan transaksi + 5 budget aktif

### 4. Run
```bash
npm run dev
```
Buka **http://localhost:5173**

---

## Deploy ke Vercel (step-by-step)

Tujuan: aplikasimu accessible di URL publik (`https://your-app.vercel.app`), pakai data finance kamu sendiri, **gratis**.

### Step 1 — Push project ke GitHub

Repo lokal sudah ada (`.git/` di project root). Buat repo di GitHub lalu push:

```bash
# di folder project
gh repo create personal-finance-tracker --private --source . --remote origin --push
```

Atau manual:
1. Buka https://github.com/new — bikin repo kosong (private), JANGAN init dengan README
2. Copy URL HTTPS-nya
3. Jalankan:
   ```bash
   git remote add origin https://github.com/<USERNAME>/personal-finance-tracker.git
   git branch -M main
   git push -u origin main
   ```

### Step 2 — Setup Turso (database production)

Turso = SQLite di cloud, free tier 9 GB + 1 miliar reads/bulan. Lebih dari cukup untuk personal use.

**Via web (paling cepat):**
1. Buka https://turso.tech → "Start for free" → daftar pakai GitHub
2. Setelah login, klik **Create Database**
3. Beri nama (mis. `pft-prod`), pilih region terdekat (mis. `Singapore — sin`)
4. Database dibuat. Klik database → tab **Connect**
5. Copy 2 nilai ini, simpan dulu:
   - **Database URL** — format `libsql://pft-prod-<username>.turso.io`
   - **Auth Token** — klik "Create Token" kalau belum ada, copy nilainya

**Atau via CLI** (kalau familiar terminal):
```bash
# install Turso CLI
brew install tursodatabase/tap/turso     # macOS
# atau: curl -sSfL https://get.tur.so/install.sh | bash

turso auth signup                         # daftar via browser
turso db create pft-prod                  # bikin DB
turso db show pft-prod --url              # → DATABASE_URL
turso db tokens create pft-prod           # → TURSO_AUTH_TOKEN
```

> Schema akan auto-create saat backend pertama kali hit DB. Tidak perlu migrasi manual.

### Step 3 — Setup Vercel project

1. Buka https://vercel.com → daftar pakai GitHub
2. Setelah login, klik **Add New… → Project**
3. Pilih repo `personal-finance-tracker`. Klik **Import**
4. Di halaman config:
   - **Framework Preset:** biarkan **Other** (Vercel auto-detect dari `vercel.json`)
   - **Root Directory:** biarkan root (`.`)
   - **Build / Output / Install commands:** biarkan default (sudah ada di `vercel.json`)
5. Expand **Environment Variables**, tambahkan 3 ini:

| Name | Value | Environments |
|---|---|---|
| `DATABASE_URL` | `libsql://pft-prod-<username>.turso.io` (dari Turso) | Production, Preview, Development |
| `TURSO_AUTH_TOKEN` | token dari Turso | Production, Preview, Development |
| `JWT_SECRET` | string acak panjang (mis. dari `openssl rand -hex 32`) | Production, Preview, Development |

6. Klik **Deploy**. Tunggu ~1–2 menit.
7. Selesai → dapat URL `https://<project>.vercel.app`. Buka di browser.

### Step 4 — Buat akun kamu & hapus data dummy

Di production database (Turso) belum ada user — kosong total. Skema akan dibuat otomatis saat hit pertama.

1. Buka URL Vercel kamu → klik **"Daftar di sini"**
2. Daftar dengan email & password kamu sendiri
3. Default 15 kategori akan otomatis dibuat untuk akunmu
4. Mulai input transaksi real kamu. Selesai 🎉

> **JANGAN run `npm run seed` terhadap database production.** Script itu untuk dev lokal saja. Production database bersih dari awal.

### Step 5 — Update ke depan

Sekali Vercel terhubung ke GitHub, setiap `git push origin main` akan **auto-deploy** ke production. Workflow harian:

```bash
# edit kode di lokal
git add .
git commit -m "fix: ..."
git push        # ← Vercel deploy otomatis ~1 menit kemudian
```

---

## 🤖 Asisten AI (chatbot)

Tab **Asisten** di navigasi bawah. Ketik transaksi pakai bahasa sehari-hari dan sistem otomatis mencatatnya — tanpa buka form.

Contoh:
| Kamu ketik | Hasil otomatis |
|---|---|
| `gaji 5 juta` | Pemasukan Rp 5.000.000 → kategori Gaji |
| `beli kopi 25 ribu` | Pengeluaran Rp 25.000 → Makanan & Minuman |
| `bayar listrik 150rb` | Pengeluaran Rp 150.000 → Tagihan & Utilitas |
| `freelance project 2,5jt` | Pemasukan Rp 2.500.000 → Freelance |
| `bensin 50k` | Pengeluaran Rp 50.000 → Transportasi |

**Cara kerja:** parser lokal (rule-based) di `backend/src/nlp.js` — 100% gratis, tanpa API eksternal, jalan offline.
- **Nominal:** paham `5 juta`/`5jt`, `25 ribu`/`25rb`/`25k`, `1,5jt`, `5.000.000`, `setengah juta`, dst.
- **Tipe:** deteksi pemasukan vs pengeluaran dari kata kunci (gaji/bonus/jual → masuk; beli/bayar/jajan → keluar).
- **Kategori:** dicocokkan otomatis ke kategori kamu (makan→Makanan, bensin→Transportasi, dll).

Kalau nominal tidak ketemu, asisten akan minta diperjelas. Setiap transaksi yang dibuat punya tombol **Urungkan** untuk batal seketika.

---

## Pakai aplikasi tanpa dummy data (alur recommended)

Kalau kamu sudah deploy tapi mau sekalian bersihin demo data dari local dev:

```bash
# hapus SQLite lokal yang berisi demo
rm -rf backend/data
npm run dev                     # backend recreate schema kosong
```

Buka http://localhost:5173 → **Daftar** akun pribadi → siap pakai data sendiri.

Atau kalau cuma mau pakai versi cloud (Vercel + Turso): kerjain semuanya di URL Vercel kamu, local dev hanya untuk ngoding.

---

## Scripts

| Command | Deskripsi |
|---|---|
| `npm run install:all` | Install dependencies semua workspace |
| `npm run seed` | Seed demo user (LOKAL ONLY — jangan ke production) |
| `npm run dev` | Run backend (`:4000`) + frontend (`:5173`) |
| `npm run dev:backend` / `dev:frontend` | Run individual |
| `npm run build` | Build frontend production bundle |

---

## Struktur project

```
.
├── api/                       # Vercel serverless entry
│   ├── index.js               # Wraps backend Express app
│   └── package.json
├── backend/
│   ├── .env.example
│   ├── data/                  # libSQL file local (auto-created, gitignored)
│   └── src/
│       ├── app.js             # Express app factory (no .listen)
│       ├── index.js           # Local dev server (calls .listen)
│       ├── db.js              # libSQL client + schema init
│       ├── seed.js            # Demo data
│       ├── seedHelpers.js
│       ├── util.js
│       ├── middleware/auth.js
│       └── routes/
│           ├── auth.js
│           ├── categories.js
│           ├── transactions.js
│           ├── budgets.js
│           └── reports.js
├── frontend/
│   ├── .env.example
│   ├── index.html
│   ├── vite.config.js         # /api proxy ke :4000 untuk dev
│   └── src/
│       ├── App.jsx · main.jsx · api.js · auth.jsx · utils.js · styles.css
│       ├── components/        # Layout, BottomNav, AddTransactionSheet, etc.
│       └── pages/             # Login, Register, Dashboard, Transactions, Budgets, Reports, Profile
├── vercel.json                # Monorepo config: build frontend + bundle backend
└── package.json
```

---

## API endpoints

Base: `/api/v1` · Auth: `Authorization: Bearer <jwt>`

### Auth
- `POST /auth/signup` — `{ email, password, full_name? }` → `{ user, token }`
- `POST /auth/signin` — `{ email, password }` → `{ user, token }`
- `GET  /auth/me`
- `PATCH /auth/me`

### Transactions
- `GET    /transactions?page&limit&type&category_id&start_date&end_date&search`
- `GET    /transactions/summary?start_date&end_date`
- `POST   /transactions` — `{ category_id, type, amount, note?, transaction_date? }`
- `PATCH  /transactions/:id`
- `DELETE /transactions/:id`

### Categories
- `GET    /categories`
- `POST   /categories` — `{ name, icon, color, type }`
- `PATCH  /categories/:id`
- `DELETE /categories/:id`

### Budgets
- `GET    /budgets?month&year`
- `POST   /budgets` — `{ category_id, limit_amount, period_month, period_year }`
- `PATCH  /budgets/:id`
- `DELETE /budgets/:id`

### Assistant (chatbot)
- `POST /chat` — `{ message }` → `{ reply, created, transaction? }` — parse bahasa natural & auto-buat transaksi

### Reports
- `GET /reports/overview?month&year`
- `GET /reports/trend?months=6`
- `GET /reports/category-breakdown?month&year&type=expense`
- `GET /reports/top-expenses?month&year&limit=5`
- `GET /reports/comparison?month&year`

---

## Database

Schema (libSQL = SQLite-compatible):
- `users` — id (UUID), email, password_hash, full_name, currency, locale
- `categories` — per-user, flag `is_default`
- `transactions` — fk user + category, type (income/expense), amount, note, transaction_date
- `budgets` — UNIQUE on (user_id, category_id, period_month, period_year)

Schema dibuat otomatis saat first DB access (`db.ensureInit()`).

---

## Troubleshooting

**Deploy Vercel berhasil tapi `/api/...` return 500 "DATABASE_URL not set":**
Env vars belum ke-set untuk environment yang sesuai. Vercel Settings → Project → Environment Variables → pastikan `DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET` ada untuk **Production** (dan Preview kalau mau test branch).

**Setelah edit env vars, perubahan belum kelihatan:**
Vercel cache. Lakukan **Redeploy** dari Deployments tab (klik 3-dot pada deployment terakhir → Redeploy).

**Port 4000 dipakai (lokal):**
```bash
lsof -ti tcp:4000 | xargs kill
```

**Reset local database:**
```bash
rm -rf backend/data
npm run seed     # opsional, kalau mau demo data lagi
```

**Reset production database (Turso):**
- Via Turso UI: database → tab Shell → `DELETE FROM users; DELETE FROM transactions; DELETE FROM budgets; DELETE FROM categories;`
- Atau drop & recreate DB di Turso dashboard

**Schema migration di production:**
Karena `CREATE TABLE IF NOT EXISTS`, perubahan schema TIDAK auto-apply. Untuk alter table, sambungkan via Turso CLI (`turso db shell pft-prod`) dan jalankan `ALTER TABLE …` manual.

**CORS error saat development (frontend ke backend):**
Vite proxy di `frontend/vite.config.js` rute `/api` → `:4000`. Pastikan backend jalan. Di production tidak ada masalah CORS karena frontend & backend di domain Vercel yang sama.

---

## Cost (free tier)

| Service | Plan | Limit |
|---|---|---|
| Vercel | Hobby | 100GB bandwidth/bulan, serverless functions unlimited invocations |
| Turso | Starter (free) | 9GB storage, 1B row reads/bulan, 25M writes/bulan |
| GitHub | Free | Repo private unlimited |
| **Total** | | **$0/bulan** |

Untuk personal use, kamu tidak akan kena limit-nya dalam waktu dekat.

---

## License

Personal / educational use. Bebas modifikasi.

# Personal Finance Tracker

Aplikasi web mobile-first untuk mengelola keuangan pribadi (pemasukan, pengeluaran, budget, laporan) — full-stack JavaScript dengan stack ringan dan bisa berjalan 100% lokal.

**Stack:**
- **Backend:** Node.js + Express + SQLite (`better-sqlite3`) + JWT auth
- **Frontend:** React 18 + Vite + React Router + Recharts
- **DB:** SQLite (file lokal, otomatis dibuat)

---

## Quick start

### Prasyarat
- Node.js ≥ 18
- npm ≥ 9

### 1. Clone & install
```bash
# dari folder project
npm run install:all
```
Perintah ini menginstall dependencies di root, `backend/`, dan `frontend/`.

### 2. Setup env
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env` dan ganti `JWT_SECRET` ke string acak panjang (wajib untuk production).

### 3. Seed dummy data (opsional, recommended)
```bash
npm run seed
```
Akan membuat user demo + ~6 bulan transaksi + 5 budget aktif:
- **Email:** `demo@pft.app`
- **Password:** `demo1234`

### 4. Jalankan dev server
```bash
npm run dev
```
Akan menjalankan backend (port `4000`) dan frontend (port `5173`) bersamaan via `concurrently`.

Buka: **http://localhost:5173**

---

## Scripts

| Command | Deskripsi |
|---|---|
| `npm run install:all` | Install dependencies di semua workspace |
| `npm run seed` | Seed demo user + dummy transactions/budgets |
| `npm run dev` | Run backend + frontend bersamaan |
| `npm run dev:backend` | Run backend saja |
| `npm run dev:frontend` | Run frontend saja |
| `npm run build` | Build frontend production bundle |

---

## Struktur Project

```
.
├── backend/
│   ├── .env.example
│   ├── data/                  # SQLite file (auto-created)
│   └── src/
│       ├── index.js           # Express entry
│       ├── db.js              # SQLite schema
│       ├── seed.js            # Demo data generator
│       ├── seedHelpers.js     # Default categories
│       ├── util.js            # uuid + validation
│       ├── middleware/auth.js # JWT middleware
│       └── routes/
│           ├── auth.js
│           ├── categories.js
│           ├── transactions.js
│           ├── budgets.js
│           └── reports.js
├── frontend/
│   ├── .env.example
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx            # Routes
│       ├── api.js             # API client
│       ├── auth.jsx           # Auth context
│       ├── utils.js           # Format helpers
│       ├── styles.css
│       ├── components/
│       │   ├── Layout.jsx
│       │   ├── BottomNav.jsx
│       │   ├── AddTransactionSheet.jsx
│       │   ├── ConfirmModal.jsx
│       │   ├── ProtectedRoute.jsx
│       │   └── Toast.jsx
│       └── pages/
│           ├── Login.jsx
│           ├── Register.jsx
│           ├── Dashboard.jsx
│           ├── Transactions.jsx
│           ├── Budgets.jsx
│           ├── Reports.jsx
│           └── Profile.jsx
└── package.json               # Workspace root + concurrently scripts
```

---

## API endpoints

Base: `/api/v1` · Auth: `Authorization: Bearer <jwt>`

### Auth
- `POST /auth/signup` — `{ email, password, full_name? }` → `{ user, token }`
- `POST /auth/signin` — `{ email, password }` → `{ user, token }`
- `GET  /auth/me` — current user
- `PATCH /auth/me` — update profile

### Transactions
- `GET    /transactions?page&limit&type&category_id&start_date&end_date&search`
- `GET    /transactions/summary?start_date&end_date` → `{ income, expense, net, balance }`
- `POST   /transactions` — `{ category_id, type, amount, note?, transaction_date? }`
- `PATCH  /transactions/:id`
- `DELETE /transactions/:id`

### Categories
- `GET    /categories`
- `POST   /categories` — `{ name, icon, color, type }`
- `PATCH  /categories/:id`
- `DELETE /categories/:id` (gagal jika masih dipakai transaksi)

### Budgets
- `GET    /budgets?month&year` — list + computed `spent_amount` & `status`
- `POST   /budgets` — `{ category_id, limit_amount, period_month, period_year }`
- `PATCH  /budgets/:id` — `{ limit_amount }`
- `DELETE /budgets/:id`

### Reports
- `GET /reports/overview?month&year`
- `GET /reports/trend?months=6`
- `GET /reports/category-breakdown?month&year&type=expense`
- `GET /reports/top-expenses?month&year&limit=5`
- `GET /reports/comparison?month&year`

---

## Fitur

- ✅ Authentication (JWT) — signup, signin, protected routes
- ✅ Dashboard: saldo, income/expense bulan ini, donut chart, budget progress, recent transactions
- ✅ Transactions: CRUD, filter type/search, dikelompokkan per tanggal
- ✅ Add transaction bottom sheet (mobile-optimized, mode "Simpan & Lagi")
- ✅ Budget per kategori per bulan dengan progress + status (safe/warning/over)
- ✅ Reports: ringkasan, tren 6/12 bulan, breakdown kategori, top 5 expenses, MoM comparison
- ✅ Kategori kustom dengan icon emoji + warna
- ✅ Format IDR & tanggal Indonesia
- ✅ Mobile-first responsive (auto-scale ke desktop, max-width 720px)
- ✅ Toast notifications + confirm modals
- ✅ Dummy data seed untuk testing langsung

---

## Database

SQLite file disimpan di `backend/data/app.sqlite` (otomatis dibuat saat backend pertama kali run).

Schema:
- `users` — id, email, password_hash, full_name, currency, locale
- `categories` — per-user, dengan flag `is_default` untuk seed
- `transactions` — fk ke user + category, type (income/expense), amount, note, transaction_date
- `budgets` — unique per `(user_id, category_id, period_month, period_year)`

Foreign keys & cascade delete sudah diaktifkan.

---

## Troubleshooting

**`better-sqlite3` build error saat install:**
Butuh native build tools. Di macOS pastikan Xcode CLT terpasang (`xcode-select --install`). Di Linux: `apt install build-essential python3`.

**Port 4000 / 5173 sudah dipakai:**
Ubah `PORT` di `backend/.env` dan/atau ubah `server.port` di `frontend/vite.config.js` + proxy target.

**Reset database:**
```bash
rm backend/data/app.sqlite*
npm run seed
```

**CORS error:**
Pastikan `CORS_ORIGIN` di `backend/.env` cocok dengan URL frontend (default `http://localhost:5173`).

---

## Production notes (V2)

PRD mendesain untuk deploy Vercel + Supabase. Implementasi saat ini lokal-first dengan SQLite untuk kemudahan dev. Untuk production:
- Ganti `better-sqlite3` → `pg` (PostgreSQL) atau pakai Supabase langsung
- Pisahkan JWT_SECRET ke vault / env yang aman
- Tambahkan rate limiting, helmet, request logging
- Frontend build (`npm run build`) → deploy `frontend/dist` ke static host
- Backend → containerize atau deploy ke Render/Railway/Fly.io

---

## License

Internal / educational. Bebas dimodifikasi.

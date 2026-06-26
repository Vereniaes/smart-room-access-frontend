# Smart Room Access - Frontend Dashboard

> Antarmuka berbasis web untuk sistem kendali akses ruangan cerdas berbasis RFID dan face recognition.
> Dibangun menggunakan Next.js 16, React 19, dan Tailwind CSS v4 sebagai lapisan presentasi dari arsitektur multi-tier Smart Room Access System.

---

## Daftar Isi

- [Deskripsi Sistem](#deskripsi-sistem)
- [Arsitektur Sistem Keseluruhan](#arsitektur-sistem-keseluruhan)
- [Arsitektur Frontend](#arsitektur-frontend)
- [Struktur Direktori](#struktur-direktori)
- [Deskripsi Komponen](#deskripsi-komponen)
- [Alur Data (Data Flow)](#alur-data-data-flow)
- [User Flow Diagram](#user-flow-diagram)
- [State Management](#state-management)
- [Integrasi API](#integrasi-api)
- [Mekanisme Polling Real-time](#mekanisme-polling-real-time)
- [Fitur Autentikasi](#fitur-autentikasi)
- [Halaman dan Navigasi](#halaman-dan-navigasi)
- [Setup dan Instalasi](#setup-dan-instalasi)
- [Environment Variables](#environment-variables)
- [Ketergantungan dan Library](#ketergantungan-dan-library)

---

## Deskripsi Sistem

Smart Room Access Dashboard adalah antarmuka administrasi berbasis web yang berfungsi sebagai control panel terpusat untuk sistem kendali akses ruangan cerdas. Sistem ini memungkinkan administrator dan staf untuk memantau aktivitas akses secara real-time, mengelola registrasi kartu RFID, mendaftarkan data biometrik wajah untuk keperluan dual-factor authentication, serta melihat laporan tren akses dalam periode harian, mingguan, dan bulanan.

Frontend ini merupakan salah satu dari empat lapisan dalam arsitektur sistem keseluruhan, yaitu:

1. **Lapisan IoT** - ESP32 / ESP8266 dengan modul RFID dan kamera OV2640
2. **Lapisan Backend** - Node.js REST API dengan Express v5 dan PostgreSQL
3. **Lapisan ML** - FastAPI Python microservice dengan InsightFace untuk face recognition
4. **Lapisan Frontend** - Next.js Dashboard (aplikasi ini)

---

## Arsitektur Sistem Keseluruhan

Diagram berikut menggambarkan hubungan antar komponen dalam sistem secara keseluruhan:

```
+---------------------------+
|      Admin / Staff        |
|   (Browser Dashboard)     |
+---------------------------+
             |
             | HTTPS (JWT Bearer Token)
             v
+---------------------------+         +---------------------------+
|   smart-room-access-      |         |   smart-room-access-      |
|       frontend            |  <--->  |       backend             |
|   (Next.js / Vercel)      |  REST   |   (Node.js / Cloud Run)  |
+---------------------------+  API    +---------------------------+
                                               |
                               +---------------+---------------+
                               |               |               |
                               v               v               v
                        +------------+  +----------+  +------------------+
                        | PostgreSQL |  |   GCP    |  |  Python ML       |
                        |  (Neon)    |  |  Cloud   |  |  Microservice    |
                        | users      |  | Storage  |  |  (InsightFace)   |
                        | access_logs|  | (foto)   |  |  /face/register  |
                        | face_embed |  +----------+  |  /face/inference  |
                        +------------+               +------------------+
                               ^
                               | multipart/form-data
                               | (uid + room + photo)
                               |
+---------------------------+  |
|    ESP32 / ESP8266        |--+
|  - RFID RC522 Reader      |
|  - OV2640 Camera (opsional)|
|  - X-API-KEY Auth         |
+---------------------------+
```

---

## Arsitektur Frontend

Frontend dibangun dengan pola **Single-Page Application (SPA)** menggunakan Next.js App Router. Seluruh halaman dirender dalam satu root layout, dengan navigasi antar fitur menggunakan mekanisme state-based tab switching, bukan routing berbasis URL.

```
src/
 +-- app/
 |    +-- layout.tsx        <- Root HTML layout, font Geist, metadata SEO
 |    +-- page.tsx          <- Titik masuk utama; auth gate + orchestrator semua tab
 |    +-- globals.css       <- Global CSS reset dan variabel Tailwind
 |
 +-- components/
      +-- Sidebar.tsx              <- Navigasi vertikal (menu tab utama)
      +-- LastAccessPreview.tsx    <- Preview kartu log akses terbaru
      +-- LogTable.tsx             <- Tabel riwayat log akses + filter
      +-- TrendCharts.tsx          <- Grafik SVG tren harian / mingguan / bulanan
      +-- AccessCardManager.tsx    <- Manajemen kartu RFID (list + drawer detail)
      +-- RegistrationForm.tsx     <- Form registrasi user baru dengan RFID
      +-- UserCredentialsManager.tsx <- Manajemen kredensial user (edit, hapus, tambah)
      +-- MlFaceRegistrationForm.tsx <- Registrasi wajah biometrik (3 sudut foto webcam)
      +-- SettingsManager.tsx      <- Pengaturan sistem (info server, polling, preferensi)
```

### Pola Rendering

- **Client-side rendering penuh** - seluruh komponen menggunakan `'use client'` directive
- **Tidak ada Server Components** yang dipakai secara aktif karena kebutuhan interaksi real-time yang tinggi
- **Polling berbasis `setInterval`** digunakan sebagai mekanisme sinkronisasi data live
- **LocalStorage** digunakan untuk persistensi token JWT dan preferensi pengguna

---

## Struktur Direktori

```
smart-room-access-frontend/
+-- src/
|   +-- app/
|   |   +-- favicon.ico
|   |   +-- globals.css
|   |   +-- layout.tsx
|   |   +-- page.tsx
|   +-- components/
|       +-- AccessCardManager.tsx
|       +-- LastAccessPreview.tsx
|       +-- LogTable.tsx
|       +-- MlFaceRegistrationForm.tsx
|       +-- RegistrationForm.tsx
|       +-- SettingsManager.tsx
|       +-- Sidebar.tsx
|       +-- TrendCharts.tsx
|       +-- UserCredentialsManager.tsx
+-- public/
|   +-- Guide-Front.png        <- Ikon panduan pose wajah lurus
|   +-- Guide-Left.png         <- Ikon panduan pose wajah kiri
|   +-- Guide-Right.png        <- Ikon panduan pose wajah kanan
+-- .env.local                 <- Variabel lingkungan (tidak di-commit)
+-- next.config.ts
+-- package.json
+-- tsconfig.json
+-- postcss.config.mjs
```

---

## Deskripsi Komponen

### `page.tsx` - Orkestrator Utama

File ini merupakan titik masuk dari seluruh aplikasi. Bertanggung jawab atas:

- **Authentication gate** - menampilkan form login jika token tidak tersedia di localStorage
- **State management global** - menyimpan token, logs, daftar users, dan tab aktif
- **Polling lifecycle** - mengatur `setInterval` untuk pemanggilan API berkala
- **Routing tab** - mengontrol komponen mana yang ditampilkan berdasarkan `currentTab`
- **Prop drilling** - meneruskan token, data, dan callback ke komponen anak

**State yang dikelola:**

| State | Tipe | Fungsi |
|-------|------|--------|
| `currentTab` | string enum | Tab navigasi aktif |
| `token` | string atau null | JWT access token |
| `logs` | `AccessLog[]` | Riwayat log akses terbaru |
| `usersList` | array | Daftar pengguna terdaftar |
| `isApiOnline` | boolean atau null | Status koneksi backend |
| `pollingInterval` | number | Interval refresh dalam milidetik |

---

### `Sidebar.tsx` - Navigasi Utama

Komponen sidebar vertikal yang berisi menu navigasi utama. Ditampilkan secara permanen di sisi kiri layar sebagai `sticky` element.

**Menu yang tersedia:**

| Menu | Tab ID | Ikon |
|------|--------|------|
| Live Monitoring | `dashboard` | LayoutDashboard |
| Kartu Akses | `cards` | CreditCard |
| Kredensial User | `credentials` | ScanFace |
| Settings | `settings` | Settings |

Tab `register` dan `ml-register` bersifat child tab - diaktifkan secara programatik dari komponen lain, tidak muncul di sidebar.

---

### `LastAccessPreview.tsx` - Pratinjau Log Terbaru

Menampilkan kartu pratinjau untuk satu entri log akses. Mendukung dua layout:

- **`horizontal`** - ditampilkan di bagian paling atas dashboard, memperlihatkan informasi singkat log terbaru secara sekilas
- **`vertical`** - ditampilkan di panel detail samping tabel log, memperlihatkan foto akses dan detail lengkap termasuk gambar dari GCP Cloud Storage

---

### `LogTable.tsx` - Tabel Riwayat Akses

Menampilkan seluruh entri log akses dalam bentuk tabel interaktif. Fitur:

- Filter berdasarkan status (`allowed` / `denied` / semua)
- Pencarian berdasarkan nama pengguna atau RFID UID
- Baris yang dapat diklik untuk memilih log dan menampilkan detail di `LastAccessPreview`
- Badge status berwarna (hijau untuk allowed, merah untuk denied)
- Tampilan foto miniatur dari URL GCP Cloud Storage (jika tersedia)

---

### `TrendCharts.tsx` - Visualisasi Tren Akses

Menampilkan tiga kartu grafik batang SVG responsif tanpa library charting eksternal:

- **Tren Harian** - data hari ini dikelompokkan per 4 slot waktu (Pagi, Siang, Sore, Malam)
- **Tren Mingguan** - data 7 hari terakhir dikelompokkan per hari
- **Tren Bulanan** - data 30 hari terakhir dikelompokkan per 4 minggu (W1-W4)

Setiap batang menampilkan dua kolom berdampingan - hijau untuk akses diterima, merah untuk akses ditolak.

---

### `AccessCardManager.tsx` - Manajemen Kartu RFID

Komponen paling kompleks dalam aplikasi. Menampilkan tabel kartu RFID yang menggabungkan data dari dua sumber:

1. **Database** - kartu yang sudah terdaftar via endpoint `/api/v1/cards`
2. **Log akses** - UID kartu asing yang pernah tap namun belum terdaftar (unregistered)

**Fitur utama:**

- Filter berdasarkan status registrasi (Terdaftar / Belum Terdaftar / Diblokir)
- Filter berdasarkan role pengguna
- Pengurutan alfabetis (A-Z / Z-A)
- Pencarian berdasarkan nama, UID, atau role
- Drawer detail geser dari kanan saat kartu diklik
- Form inline edit hak akses (role, jadwal, masa berlaku)
- Form inline edit kredensial dengan fitur *Swap User* (RFID statis terkunci, ganti pemegang lewat dropdown)
- Preview 3 foto wajah biometrik dari API atau localStorage
- Modal tambah kartu baru dengan opsi penetapan langsung ke user terdaftar tanpa kartu
- Tombol aksi hapus kartu cepat pada kolom tabel (*delete card column*)
- Fungsi blokir/buka blokir kartu (set `valid_until = 1970-01-01`)
- Pembaruan status realtime berkala mengikuti interval polling live serta dilengkapi tombol putar ulang manual (*refresh button*)

---

### `RegistrationForm.tsx` - Form Registrasi Pengguna

Form multi-langkah untuk mendaftarkan pengguna baru ke sistem. Dapat diinisialisasi dengan RFID UID yang sudah diketahui (dari tap yang tercatat di log) atau dimulai dengan UID kosong.

**Field yang tersedia:**

- Nama lengkap
- RFID UID (pre-filled jika datang dari AccessCardManager)
- Role (`admin` / `staff` / `student` / `guest`)
- Jadwal akses (jam mulai dan selesai format HH:MM)
- Masa berlaku kartu (tanggal kadaluarsa, opsional)
- Username dan password dashboard (opsional, untuk role admin/staff)

---

### `UserCredentialsManager.tsx` - Manajemen Kredensial Pengguna

Menampilkan seluruh pengguna terdaftar dalam format kartu grid. Menyediakan aksi:

- Navigasi ke form registrasi wajah ML untuk pengguna yang dipilih
- Navigasi ke form registrasi pengguna baru
- Tampilan badge status wajah terdaftar atau belum

---

### `MlFaceRegistrationForm.tsx` - Registrasi Wajah Biometrik

Komponen registrasi wajah dengan antarmuka kamera interaktif. Menggunakan WebRTC `getUserMedia` API untuk mengakses kamera webcam pengguna.

**Alur registrasi wajah:**

```
1. Klik "Mulai Kamera" -> Browser meminta izin akses kamera
2. Stream kamera aktif dengan overlay SVG biometric (silhuet wajah + crosshair)
3. User mengikuti panduan pose:
   - Slot 1: Pandangan lurus (hadap depan)
   - Slot 2: Pandangan kiri (kepala sedikit ke kiri)
   - Slot 3: Pandangan kanan (kepala sedikit ke kanan)
4. Klik tombol capture untuk setiap slot (atau upload file manual)
5. Klik "Simpan & Daftarkan Wajah" -> kirim FormData ke POST /api/v1/face/register
6. Backend meneruskan ke Python ML service (InsightFace) untuk ekstraksi embedding
7. Sukses -> redirect kembali ke UserCredentialsManager
```

Hasil tangkapan gambar disimpan ke localStorage sebagai cache offline dengan kunci `user_photos_{userId}`.

---

### `SettingsManager.tsx` - Pengaturan Sistem

Memiliki dua sub-tab:

**Sub-tab Informasi Sistem** (data dari `GET /api/v1/system/info`):
- Profil administrator yang sedang login
- Status koneksi backend Node.js dan ML microservice Python
- Uptime server dalam format terbaca (hari, jam, menit, detik)
- Tabel daftar device IoT yang terhubung (nama ruangan, waktu terakhir terhubung, total tap, status Aktif/Standby)

**Sub-tab Preferensi UI**:
- Pengaturan interval polling data (2.5 detik / 5 detik / 10 detik / Manual)
- Toggle simulasi kamera live (untuk keperluan demo)

---

## Alur Data (Data Flow)

Diagram berikut menggambarkan bagaimana data mengalir dari hardware IoT hingga tampil di dashboard:

```
[Pengguna tap kartu RFID di pintu]
             |
             v
[ESP32 / ESP8266 membaca RFID UID]
[ESP32-CAM mengambil foto (opsional)]
             |
             | multipart/form-data
             | POST /api/v1/access
             | Header: X-API-KEY
             v
[Node.js Backend]
    |-- Validasi RFID (bcrypt compare)
    |-- Cek masa berlaku kartu
    |-- Cek jadwal akses (timezone WIB)
    |-- Face verification via ML service (jika foto ada)
    |-- Upload foto ke GCP Cloud Storage (async, non-blocking)
    |-- Insert ke tabel access_logs
    |-- Kirim notifikasi Telegram
    |-- Return HTTP 200 + status allowed/denied ke ESP32
             |
             v
[access_logs tersimpan di PostgreSQL Neon]
             |
             | GET /api/v1/logs (polling interval)
             | Header: Authorization Bearer <token>
             v
[Next.js Frontend Dashboard]
    |-- setLogs(fetchedLogs)
    |-- setIsApiOnline(true)
    |-- setLastUpdated(new Date())
    |-- LastAccessPreview menampilkan log[0]
    |-- LogTable merender seluruh log
    |-- TrendCharts mengkalkulasi ulang grafik
```

---

## User Flow Diagram

### User Flow: Login dan Monitoring

```
[Buka Dashboard URL]
         |
         v
[Cek localStorage -> access_token]
         |
    Tidak ada---------Ada
         |                |
         v                v
   [Tampilkan      [Fetch /api/v1/logs]
    Login Form]    [Fetch /api/v1/users]
         |                |
         v                v
   [Submit Form]  [Tampilkan Dashboard]
         |
         v
   [POST /auth/login]
         |
    Gagal---------Berhasil
         |                |
         v                v
   [Tampilkan      [Simpan token ke
    Error Alert]    localStorage]
                          |
                          v
                   [Redirect ke
                    Dashboard]
```

---

### User Flow: Registrasi Kartu RFID Baru

```
[Sidebar -> Kartu Akses]
         |
         v
[AccessCardManager menampilkan
 tabel kartu terdaftar + unregistered]
         |
         v
[Klik kartu dengan status "Belum Terdaftar"]
         |
         v
[Drawer detail terbuka di kanan]
         |
         v
[Klik tombol "Daftarkan Kartu Ini"]
         |
         v
[RegistrationForm terbuka
 dengan RFID UID sudah terisi otomatis]
         |
         v
[Isi data: Nama, Role, Jadwal, Valid Until]
[Opsional: Username + Password]
         |
         v
[Submit -> POST /api/v1/users]
         |
    Gagal---------Berhasil
         |                |
         v                v
   [Error Alert]  [Kembali ke
                   AccessCardManager]
                   [Data ter-refresh]
```

---

### User Flow: Registrasi Wajah Biometrik

```
[Sidebar -> Kredensial User]
         |
         v
[UserCredentialsManager menampilkan
 daftar pengguna]
         |
         v
[Klik tombol "Daftarkan Wajah" pada user]
         |
         v
[MlFaceRegistrationForm terbuka]
         |
         v
[Klik "Mulai Kamera" -> Browser minta izin]
         |
    Ditolak-------Diterima
         |                |
         v                v
   [Pesan error]  [Kamera aktif]
   [Gunakan       [Overlay silhuet
    upload file]   biometrik tampil]
                          |
                          v
                   [Ambil foto Slot 1:
                    Pose Lurus]
                          |
                          v
                   [Ambil foto Slot 2:
                    Pose Kiri]
                          |
                          v
                   [Ambil foto Slot 3:
                    Pose Kanan]
                          |
                          v
                   [Submit FormData
                    -> POST /api/v1/face/register]
                          |
                          v
                   [Backend -> ML Service
                    InsightFace ekstrak
                    512-dim embedding]
                          |
                   Gagal-------Berhasil
                          |         |
                          v         v
                   [Error Alert] [Sukses Alert]
                               [Kembali ke
                                Credentials]
```

---

## State Management

Aplikasi tidak menggunakan library state management eksternal (Redux, Zustand, dll). Seluruh state dikelola menggunakan React built-in hooks:

- **`useState`** - state lokal per komponen
- **`useEffect`** - side effects (fetch data, polling, cleanup)
- **`useRef`** - referensi DOM element (video stream kamera)

**Pola propagasi state:**

State utama (`token`, `logs`, `usersList`) dikelola di `page.tsx` dan diteruskan ke komponen anak melalui props. Komponen anak berkomunikasi ke atas melalui callback props (`onSuccess`, `onBack`, `onRefresh`, dll).

**Persistensi lokal (localStorage):**

| Key | Isi | Komponen yang Menulis |
|-----|-----|----------------------|
| `access_token` | JWT access token | `page.tsx` (login) |
| `pref_camera_simulated` | boolean toggle kamera | `SettingsManager.tsx` |
| `user_photos_{userId}` | JSON array base64 foto wajah | `MlFaceRegistrationForm.tsx` |

---

## Integrasi API

Seluruh komunikasi dengan backend menggunakan **Fetch API** native browser. Base URL dikonfigurasi melalui environment variable `NEXT_PUBLIC_API_URL`.

### Endpoint yang Digunakan

| Method | Endpoint | Autentikasi | Komponen Pemangggil |
|--------|----------|-------------|---------------------|
| `POST` | `/api/v1/auth/login` | - | `page.tsx` |
| `GET` | `/api/v1/logs` | JWT | `page.tsx` |
| `GET` | `/api/v1/users` | JWT | `page.tsx` |
| `POST` | `/api/v1/users` | JWT | `RegistrationForm.tsx` |
| `PUT` | `/api/v1/users/:id` | JWT | `AccessCardManager.tsx` |
| `DELETE` | `/api/v1/users/:id` | JWT | `UserCredentialsManager.tsx` |
| `GET` | `/api/v1/cards` | JWT | `AccessCardManager.tsx` |
| `POST` | `/api/v1/cards` | JWT | `AccessCardManager.tsx` |
| `PUT` | `/api/v1/cards/:id` | JWT | `AccessCardManager.tsx` |
| `GET` | `/api/v1/face/photos/:userId` | JWT | `AccessCardManager.tsx` |
| `POST` | `/api/v1/face/register` | JWT | `MlFaceRegistrationForm.tsx` |
| `GET` | `/api/v1/system/info` | JWT | `SettingsManager.tsx` |

### Format Response Backend

Seluruh endpoint mengikuti envelope response yang konsisten:

```json
{
  "success": true,
  "message": "Deskripsi hasil operasi",
  "data": { ... }
}
```

Jika `success: false`, komponen menampilkan pesan error dari field `message`.

### Penanganan Token Expired

Setiap fungsi fetch yang menggunakan JWT memeriksa status HTTP response:

```
Jika response.status === 401 atau 403:
    -> Panggil handleLogout()
    -> Hapus token dari localStorage
    -> Tampilkan pesan "Sesi Anda telah berakhir"
    -> Redirect ke halaman login
```

---

## Mekanisme Polling Real-time

Dashboard menggunakan **HTTP polling** (bukan WebSocket) untuk sinkronisasi data log secara real-time. Polling diimplementasikan di `page.tsx` menggunakan `setInterval`.

```
Lifecycle polling:

[Token tersedia]
       |
       v
[Fetch pertama: fetchLogs() + fetchUsers()]
       |
       v
[setInterval(fetchLogs + fetchUsers, pollingInterval)]
       |
       v
[Setiap pollingInterval ms:]
       |
   isPolling === true?
       |
    Ya -> fetch
    Tidak -> skip
       |
       v
[setIsApiOnline(true/false)]
[setLastUpdated(new Date())]
[setLogs(fetchedLogs)]
       |
       v
[Komponen re-render otomatis]
```

**Konfigurasi interval yang tersedia** (diatur melalui SettingsManager):

| Mode | Nilai | Keterangan |
|------|-------|-----------|
| Cepat | 2500 ms | Default, cocok untuk monitoring aktif |
| Sedang | 5000 ms | Keseimbangan performa dan beban |
| Lambat | 10000 ms | Minimal, untuk koneksi terbatas |
| Manual | 999999 ms | Efektif menonaktifkan auto-refresh |

Cleanup interval dilakukan pada return function `useEffect` untuk mencegah memory leak.

---

## Fitur Autentikasi

### Login Flow

1. Administrator membuka URL dashboard
2. Sistem memeriksa `localStorage.getItem('access_token')`
3. Jika tidak ada token, form login ditampilkan
4. Setelah submit, `POST /api/v1/auth/login` dikirim dengan `{ username, password }`
5. Backend memvalidasi password dengan bcrypt dan memeriksa role (hanya `admin` dan `staff` diizinkan)
6. Jika berhasil, `accessToken` disimpan ke localStorage dan dashboard ditampilkan
7. Jika gagal, pesan error ditampilkan di form

### Session Persistence

Token JWT disimpan di `localStorage` (bukan `sessionStorage` atau cookie), sehingga sesi tetap aktif meskipun tab browser ditutup dan dibuka kembali, hingga token kadaluarsa atau logout manual dilakukan.

### Logout

Klik tombol "Log Out" di header navbar akan:
1. Menghapus `access_token` dari localStorage
2. Me-reset state `token`, `logs`, dan `selectedLog` ke nilai awal
3. Dashboard kembali menampilkan form login

---

## Halaman dan Navigasi

Navigasi tidak menggunakan URL routing Next.js. Seluruh tab dikelola melalui state `currentTab` di `page.tsx`.

### Tab yang Tersedia

| Tab ID | Label di Sidebar | Komponen yang Dirender |
|--------|-----------------|------------------------|
| `dashboard` | Live Monitoring | `LastAccessPreview` + stat cards + `TrendCharts` + `LogTable` |
| `cards` | Kartu Akses | `AccessCardManager` |
| `register` | (hidden) | `RegistrationForm` |
| `credentials` | Kredensial User | `UserCredentialsManager` |
| `ml-register` | (hidden) | `MlFaceRegistrationForm` |
| `settings` | Settings | `SettingsManager` |

Tab `register` dan `ml-register` diaktifkan secara programatik dari AccessCardManager dan UserCredentialsManager dengan memanggil `setCurrentTab('register')` atau `setCurrentTab('ml-register')` yang diteruskan melalui prop.

### Struktur Layout

```
+------------------------------------------------------------------+
|  Sidebar (w-64, sticky)  |  Main Content Area (flex-1)          |
|                          |                                       |
|  [Logo SmartRoom]        |  [Top Navbar Header]                  |
|  [Gatekeeper]            |  - Judul tab aktif                    |
|                          |  - Badge status koneksi API           |
|  [Nav: Live Monitoring]  |  - Timestamp update terakhir          |
|  [Nav: Kartu Akses]      |  - Tombol Logout                      |
|  [Nav: Kredensial User]  |                                       |
|  [Nav: Settings]         |  [Main Content <main>]                |
|                          |  - Komponen sesuai tab aktif          |
|  [Footer: System Online] |                                       |
|  [v1.0.0]                |                                       |
+------------------------------------------------------------------+
```

---

## Setup dan Instalasi

### Prasyarat

- Node.js versi 18 atau lebih baru
- npm atau yarn
- Backend `smart-room-access-backend` sedang berjalan (lokal atau cloud)

### Langkah Instalasi

**1. Clone dan masuk ke direktori frontend:**

```bash
cd smart-room-access-frontend
```

**2. Install dependencies:**

```bash
npm install
```

**3. Konfigurasi environment:**

```bash
cp .env.local.example .env.local
# edit NEXT_PUBLIC_API_URL sesuai URL backend yang digunakan
```

**4. Jalankan server development:**

```bash
npm run dev
```

Dashboard akan berjalan di `http://localhost:3000`

**5. Build production (opsional):**

```bash
npm run build
npm start
```

---

## Environment Variables

| Variable | Keterangan | Contoh Nilai |
|----------|------------|--------------|
| `NEXT_PUBLIC_API_URL` | URL base backend REST API | `http://localhost:5000` |

Variabel dengan prefix `NEXT_PUBLIC_` akan diekspos ke sisi client (browser). Pastikan tidak menyimpan data sensitif pada variabel ini.

Nilai default (fallback) jika variabel tidak diset:

```
https://smart-room-access-backend-196827089960.asia-southeast2.run.app
```

---

## Ketergantungan dan Library

### Dependencies

| Package | Versi | Fungsi |
|---------|-------|--------|
| `next` | 16.2.9 | Framework React dengan App Router |
| `react` | 19.2.4 | Library UI utama |
| `react-dom` | 19.2.4 | Renderer DOM untuk React |
| `lucide-react` | 1.18.0 | Library ikon SVG |

### Dev Dependencies

| Package | Versi | Fungsi |
|---------|-------|--------|
| `typescript` | ^5 | Static typing |
| `tailwindcss` | ^4 | Utility-first CSS framework |
| `@tailwindcss/postcss` | ^4 | PostCSS plugin untuk Tailwind v4 |
| `eslint` | ^9 | Linting kode |
| `eslint-config-next` | 16.2.9 | Konfigurasi ESLint khusus Next.js |
| `@types/node` | ^20 | Type definitions Node.js |
| `@types/react` | ^19 | Type definitions React |
| `@types/react-dom` | ^19 | Type definitions React DOM |

### Pilihan Desain Library

- **Tidak menggunakan library charting eksternal** (Chart.js, Recharts, dll) - grafik batang diimplementasikan menggunakan SVG native untuk meminimalkan bundle size
- **Tidak menggunakan state management library** (Redux, Zustand, dll) - kompleksitas state saat ini masih terjangkau dengan React built-in hooks
- **Tidak menggunakan library form** (Formik, React Hook Form) - form sederhana dikelola dengan controlled inputs dan `useState`
- **Lucide React** dipilih sebagai satu-satunya library ikon karena tree-shakeable dan memiliki style konsisten

---

## Catatan Pengembangan

- **Timezone** - tampilan waktu di komponen `LastAccessPreview`, `LogTable`, dan `SettingsManager` menggunakan `toLocaleString('id-ID')` dengan opsi `timeZone: 'Asia/Jakarta'` untuk konsistensi tampilan WIB
- **Webcam access** - `getUserMedia` API hanya tersedia di konteks aman (HTTPS atau localhost). Registrasi wajah akan gagal jika diakses via HTTP pada domain selain localhost
- **Foto wajah fallback** - jika endpoint `/face/photos/:userId` tidak dapat diakses, komponen jatuh ke localStorage, kemudian ke gambar demo statis
- **Kartu unregistered** - kartu yang pernah tap namun belum terdaftar dimunculkan dengan cara menggabungkan data dari endpoint `/cards` dan log akses yang `user_id`-nya `null`
- **Blokir kartu** - mekanisme blokir dilakukan dengan mengatur field `valid_until` ke tanggal `1970-01-01`, bukan menghapus record dari database
- **Sinkronisasi Jadwal & Status** - endpoint `/cards` ikut mengembalikan data `user_schedule_start`, `user_schedule_end`, dan `user_valid_until` agar tabel pemantauan kartu selalu akurat mengikuti status pemblokiran maupun jadwal pengguna

# Repository Engineering Guidelines

Panduan ini mengatur standar penulisan kode, batasan arsitektur, dan konvensi pengujian pada proyek **StockSync Engine**.

## 1. Runtime & Standar Bahasa
- Gunakan **Node.js v22 LTS** dengan **ECMAScript Modules** (`import`/`export`, `"type": "module"`).
- Selalu gunakan prefiks protokol `node:` untuk modul bawaan Node.js (contoh: `node:fs`, `node:stream/promises`, `node:test`).
- Hindari operasi I/O sinkron (`fs.readFileSync`, `crypto.pbkdf2Sync`) di luar fase *startup* aplikasi agar *Event Loop* tidak terblokir.

## 2. Batasan Arsitektur Modular
Setiap modul domain di bawah `backend/src/modules/<domain>/` wajib mematuhi arah ketergantungan berikut:
`Routes -> Controller -> Service -> Repository`

- **Routes & Controller:** Hanya bertugas memvalidasi input (via Zod), mengekstrak parameter HTTP, memanggil `Service`, dan memformat status/payload HTTP. Dilarang menulis logika bisnis atau kueri data di sini.
- **Service:** Menampung seluruh aturan bisnis, orkestrasi transaksi, dan pemancaran event domain. Tidak boleh mengimpor objek `request` atau `reply` milik Fastify.
- **Repository:** Satu-satunya lapisan yang berinteraksi langsung dengan penyimpanan data (PostgreSQL/memori).

## 3. Penanganan Error & Siklus Hidup Proses
- Gunakan kelas `AppError` untuk seluruh *operational error* yang dapat diprediksi (misalnya stok tidak mencukupi, SKU tidak ditemukan).
- Biarkan *global error handler* memetakan error menjadi respons JSON standar; jangan membungkus setiap controller dengan `try/catch` yang mengembalikan respons ad-hoc.
- Setiap sumber daya eksternal (HTTP server, database pool, koneksi Redis) wajib ditutup dengan bersih pada *handler* sinyal `SIGTERM` dan `SIGINT`.

## 4. Konvensi Pengujian
- Gunakan test runner bawaan Node.js (`node --test`) dan `node:assert/strict`.
- Pengujian integrasi HTTP wajib menggunakan `app.inject()` melalui factory `buildApp()` tanpa membuka port jaringan nyata.
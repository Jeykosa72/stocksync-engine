# Architectural Decision Records (ADR)

Dokumen ini mencatat keputusan arsitektur utama pada **StockSync Engine** beserta konteks masalah dan *trade-off* yang dipertimbangkan.

---

## ADR-001: Penggunaan Node.js Streams (`pipeline`) untuk Impor Stok Massal
- **Status:** Accepted (Iterasi 1)
- **Konteks:** Sistem perlu memproses unggahan mutasi stok CSV hingga puluhan ribu baris per file tanpa menyebabkan lonjakan konsumsi memori (RAM) atau *out-of-memory crash* pada proses Node.js yang berjalan jangka panjang.
- **Keputusan:** Menggunakan custom `Transform` stream (`CsvStockParserStream`) dan `Writable` stream (`StockBatchWriterStream`) yang dirangkai menggunakan `stream/promises` (`pipeline`).
- **Alasan & Trade-off:**
  - `pipeline()` secara otomatis meneruskan sinyal *backpressure* dari lapisan penyimpanan ke pembaca file, sehingga memori heap tetap konstan terlepas dari ukuran file.
  - Berbeda dengan `.pipe()` standar, `pipeline()` otomatis menghancurkan (*destroy*) seluruh stream dalam rantai jika salah satu tahap mengalami kegagalan, mencegah kebocoran *file descriptor*.
  - *Trade-off:* Implementasi *buffering* baris yang terpotong antar-*chunk* byte harus ditangani secara eksplisit di dalam `_transform` dan `_flush`.

## ADR-002: Pemilihan Fastify sebagai HTTP Framework
- **Status:** Accepted (Iterasi 2)
- **Konteks:** Dibutuhkan framework HTTP minimalis yang mendukung arsitektur modular, *structured logging* bawaan, serta kemudahan pengujian HTTP tanpa overhead *binding* TCP port.
- **Keputusan:** Menggunakan **Fastify** dengan pola *app factory* (`buildApp()` terpisah dari `server.js`).
- **Alasan & Trade-off:**
  - Fastify terintegrasi langsung dengan **Pino** untuk *structured JSON logging* dan menyediakan `app.inject()` untuk menjalankan pengujian integrasi HTTP langsung di memori dengan cepat.
  - Siklus hidup plugin dan *hook* (`onRequest`, `preHandler`, `onError`, `onClose`) terstruktur dengan jelas untuk menangani *graceful shutdown* di lingkungan Linux/Docker.
  - *Trade-off:* Ekosistem middleware pihak ketiga tidak seluas Express, sehingga beberapa pola integrasi lebih baik ditulis sebagai plugin internal Fastify.

## ADR-003: Pemisahan Strict Layer (`Controller -> Service -> Repository`) dan Validasi Zod
- **Status:** Accepted (Iterasi 2)
- **Konteks:** Pada Iterasi 2 penyimpanan data masih menggunakan memori sementara sebelum dimigrasikan ke PostgreSQL pada Iterasi 3. Logika bisnis tidak boleh terikat pada mekanisme penyimpanan maupun objek HTTP request/response.
- **Keputusan:** Menerapkan pemisahan tiga lapisan dengan validasi skema input menggunakan **Zod** di batas lapisan transport.
- **Alasan & Trade-off:**
  - Mengganti *in-memory repository* menjadi *PostgreSQL repository* pada Iterasi 3 hanya memerlukan perubahan pada file `*.repository.js` tanpa menyentuh aturan bisnis di `*.service.js`.
  - Validasi skema gagal lebih awal (*fail-fast*) sebelum menyentuh transaksi database.

  Pada skrip sebelumnya, `ADR-002` (pemilihan Fastify) dan `ADR-003` (pemisahan layer + validasi Zod) sudah tercatat. Untuk melengkapi rekaman arsitektur Iterasi 2, tambahkan **`ADR-004`** yang menjelaskan mekanisme *graceful shutdown* dan pemisahan *operational error* yang baru saja kamu implementasikan di `server.js` dan `error-handler.js`.

```markdown
## ADR-004: Graceful Shutdown dan Klasifikasi Operational vs System Error
- **Status:** Accepted (Iterasi 2)
- **Konteks:** Proses Node.js berjalan jangka panjang (*long-running process*) di dalam container Linux. Penghentian proses secara paksa saat restart/deploy dapat memutus request yang sedang diproses, sementara kebocoran *stack trace* internal pada respons HTTP berisiko mengekspos struktur sistem ke klien.
- **Keputusan:**
  1. Menangani sinyal sistem operasi `SIGTERM` dan `SIGINT` pada `server.js` dengan batas waktu *drain* maksimal 10 detik (`forceExitTimer.unref()`).
  2. Membedakan *operational error* (`AppError`, kesalahan input/bisnis) dengan *system error* tidak terduga pada `globalErrorHandler`.
- **Alasan & Trade-off:**
  - `app.close()` menghentikan penerimaan koneksi baru namun memberi waktu bagi request yang sedang berjalan untuk selesai sebelum proses keluar dengan kode `0`.
  - Penggunaan `.unref()` pada timer darurat memastikan timer tersebut tidak menahan *Event Loop* tetap hidup jika server berhasil ditutup lebih cepat dari 10 detik.
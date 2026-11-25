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
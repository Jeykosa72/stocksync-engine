import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, 'bulk-stock-50k.csv');
const TOTAL_ROWS = 50_000;

async function generateCsv() {
  const writeStream = fs.createWriteStream(OUTPUT_FILE, { encoding: 'utf8' });
  writeStream.write('sku,warehouse_code,quantity_delta,reference_note\n');

  for (let i = 1; i <= TOTAL_ROWS; i++) {
    const sku = `SKU-${String(i).padStart(6, '0')}`;
    const warehouse = i % 2 === 0 ? 'WH-JKT-01' : 'WH-SBY-02';
    // Sisipkan 1 data tidak valid pada baris ke-25000 untuk menguji isolasi error
    const qty = i === 25_000 ? 'INVALID_QTY' : (i % 100) + 1;
    const line = `${sku},${warehouse},${qty},BATCH_RESTOCK_NOV\n`;

    // Hormati backpressure saat internal buffer penuh
    if (!writeStream.write(line)) {
      await new Promise((resolve) => writeStream.once('drain', resolve));
    }
  }

  writeStream.end();
  await new Promise((resolve) => writeStream.once('finish', resolve));
  console.log(`Generated ${TOTAL_ROWS} rows at ${OUTPUT_FILE}`);
}

generateCsv().catch((err) => {
  console.error('Failed to generate sample CSV:', err);
  process.exit(1);
});
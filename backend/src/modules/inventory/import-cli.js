import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { CsvStockParserStream } from './csv-parser.stream.js';
import { StockBatchWriterStream } from './batch-writer.stream.js';
import { inventoryEvents, INVENTORY_EVENTS } from './inventory.events.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CSV_PATH = path.resolve(__dirname, '../../../../samples/bulk-stock-50k.csv');

function formatMb(bytes) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// Simulai I/O database batch upsert
async function simulateDbBatchUpsert(records, batchNumber) {
    await new Promise((resolve) => setTimeout(resolve, 15))
    if(batchNumber % 25 === 0) {
        console.log(`[DB-SIM] Committed batch #${batchNumber} (${records.length} rows)`)
    }
}

async function runImport(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`CSV file not found at ${filePath}. Run "pnpm generate:csv" first.`);
    }

    const invalidRows = [];
    inventoryEvents.on(INVENTORY_EVENTS.ROW_VALIDATION_FAILED, (errInfo) => {
        invalidRows.push(errInfo);
    });

    inventoryEvents.once(INVENTORY_EVENTS.IMPORT_COMPLETED, (summary) => {
        console.log(`\n--- Import Summary ---`);
        console.log(`Total Valid Rows Processed: ${summary.totalProcessed}`);
        console.log(`Total Batches Committed: ${summary.totalBatches}`);
        console.log(`Total Invalid Rows Skipped: ${invalidRows.length}`);
        if (invalidRows.length > 0 ) {
            console.log(`Sample Invalid Row: `, invalidRows[0]);
        }
    })

    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    const readStream = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 });
    const parserStream = new CsvStockParserStream();
    const writerStream = new StockBatchWriterStream({
        batchSize: 500,
        persisBatchFn: simulateDbBatchUpsert,
    });

    // Pipeline otomatis menangani backpressure dan membersihkan stream jika error
    await pipeline(readStream, parserStream, writerStream);

    const durationMs = (performance.now() - startTime).toFixed(2);
    const endMemory = process.memoryUsage();

    console.log(`\n--- Runtime Telemetry ---`);
    console.log(`Execution Time: ${durationMs} ms`);
    console.log(`Heap Used (Start -> End)   : ${formatMb(startMemory.heapUsed)} -> ${formatMb(endMemory.heapUsed)}`);
    console.log(`RSS Memory (Start -> End)  : ${formatMb(startMemory.rss)} -> ${formatMb(endMemory.rss)}`);
    // console.log(`Heap Used (Start -> End): ${formatMb(startMemory.heapUsed)} -> ${formatMb(endMemory.heapUsed)}`);
    // console.log(`RSS Memory (Start -> End): ${formatMb(startMemory.rss)} -> ${formatMb(endMemory.rss)}`);
}

const targetFile = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_CSV_PATH;

runImport(targetFile).catch((error) => {
    console.error(`Fatal Import error: `, error.message);
    process.exit(1);
});
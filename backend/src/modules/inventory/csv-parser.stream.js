import { Transform } from 'node:stream';
import { inventoryEvents, INVENTORY_EVENTS } from './inventory.events.js';

export class CsvStockParserStream extends Transform {
    constructor(options = {}) {
        super({ ...options, readableObjectMode: true });
        this.buffer = '';
        this.lineNumber = 0;
        this.header = null;
    }

    _transform(chunk, encoding, callback) {
        try {
            this.buffer += chunk.toString('utf8');
            const lines = this.buffer.split(/\r?\n/);

            // Simpan baris terakhir jika tidak lengkap
            this.buffer = lines.pop() ?? '';

            for (const rawLine of lines) {
                this.lineNumber += 1;
                const line = rawLine.trim();
                if (!line) continue;

                if (this.lineNumber === 1) {
                    this.headers = line.split(',').map((h) => h.trim());
                    continue;
                }

                const parsed = this.#parseAndValidateRow(line, this.lineNumber);
                if (parsed) {
                    this.push(parsed);
                }
            }

            callback();
        } catch (error) {
            callback(error);
        }
    }

    _flushCallback() {
        try {
            const remaining = this.buffer.trim();
            if (remaining && this.lineNumber > 0) {
                this.lineNumber += 1;
                const parsed = this.#parseAndValidateRow(remaining, this.lineNumber);
                if (parsed) {
                    this.push(parsed);
                }
            }
        } catch (error) {
            this.emit('error', error);
        }
    }

    #parseAndValidateRow(line, lineNumber) {
        const [sku, warehouseCode, quantityRaw, referenceNote] = line.split(',').map((v) => v.trim());
        const quantityDelta = Number(quantityRaw);

        if (!sku || !warehouseCode || !Number.isInteger(quantityDelta) || quantityDelta === 0) {
            inventoryEvents.emit(INVENTORY_EVENTS.ROW_VALIDATION_FAILED, {
                lineNumber,
                rawLine: line,
                reason: 'Invalid SKU, warehouse code, or non-integer zero quantity',
            });
            return null;
        }

        return {
            lineNumber,
            sku,
            warehouseCode,
            quantityDelta,
            referenceNote: referenceNote || null,
        };
    }
}
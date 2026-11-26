import { pipeline } from 'node:stream/promises';
import { AppError } from '../../shared/errors/app-error.js';
import { CsvStockParserStream } from './csv-parser.stream.js';
import { StockBatchWriterStream } from './batch-writer.stream.js';
import { inventoryEvents, INVENTORY_EVENTS } from './inventory.events.js';
import { availableMemory } from 'node:process';
import { parse } from 'node:path';

export class inventoryService {
    constructor(repository) {
        this.repository = repository;
    }

    async getStockBySku(sku) {
        const records = await this.repository.findBySku(sku);
        if ( records.length === 0 ) {
            throw new AppError({
                message: `Stock records for SKU '${sku}' not found`,
                statusCode: 404,
                code: 'SKU_NOT_FOUND',
            });
        }

        return records;
    }

    async adjustSingleStock(payload) {
        if(payload.quantityDelta < 0) {
            const existing = await this.repository.findBySkuAndWarehouse(payload.sku, payload.warehouseCode);
            const currentQty = existing ? existing.availableQty : 0;
            if(currentQty + payload.quantityDelta < 0) {
                throw new AppError({
                    message: `Insufficient stock for negative adjusment`,
                    statusCode: 409,
                    code: 'INSUFFICIENT_STOCK',
                    details: { sku: payload.sku, warehouseCode: payload.warehouseCode, availableQty: payload.currentQty}
                });
            }
        }

        await this.repository.upsertBatch([payload]);
        return this.repository.findBySkuAndWarehouse(payload.sku, payload.warehouseCode);
    }

    async importCsvStream (readableStream) {
        const invalidRows = [];
        let summary = { totalBatch: 0, totalProcessed: 0};

        const onRowFailed = (info) => {
            if (invalidRows.length < 50 ) {
                invalidRows.push(info);
            }
        }

        const onCompleted = (result) => {
            summary = result;
        }

        inventoryEvents.on(INVENTORY_EVENTS.ROW_VALIDATION_FAILED, onRowFailed);
        inventoryEvents.once(INVENTORY_EVENTS.IMPORT_COMPLETED, onCompleted);

        try {
            const parserStream = new CsvStockParserStream();
            const writerStream = new StockBatchWriterStream({
                batchSize: 500,
                persistBatch: async (batch) => {
                    await this.repository.upsertBatch(batch);
                },
            });

            await pipeline(readableStream, parserStream, writerStream);

            return {
                ...summary, 
                invalidSampleCount: invalidRows.length,
                invalidSample: invalidRows, 
            };
        } finally {
            // bersihkan listener agar tidak memory leak http
            inventoryEvents.off(INVENTORY_EVENTS.ROW_VALIDATION_FAILED, onRowFailed),
            inventoryEvents.off(INVENTORY_EVENTS.IMPORT_COMPLETED, onCompleted)
        }
    }
}
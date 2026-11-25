import { Writable } from 'node:stream';
import { inventoryEvents, INVENTORY_EVENTS } from './inventory.events.js';

export class StockBatchWriterStream extends Writable {
    constructor({batchSize = 500, persisBatchFn, ...options } = {}) {
        super({ ...options, objectMode: true, highWaterMark: batchSize * 2 });
        this.batchSize = batchSize;
        this.persisBatchFn = persisBatchFn;
        this.batch = [];
        this.batchNumber = 0;
        this.totalProcessed = 0;
    }

    async _write(record, encoding, callback) {
        this.batch.push(record);

        if (this.batch.length >= this.batchSize) {
            try {
                await this.#flushBatch();
                callback();
            } catch (error) {
                callback(error);
            }
        } else {
            callback();
        }
    }

    async _final(callback) {
        try {
            if (this.batch.length > 0 ) {
                await this.#flushBatch();
            }
            inventoryEvents.emit(INVENTORY_EVENTS.IMPORT_COMPLETED, {
                totalBatches: this.batchNumber,
                totalProcessed: this.totalProcessed,
            });
            callback();
        } catch (error) {
            callback(error);
        }
    }

    async #flushBatch() {
        const currentBatch = this.batch;
        this.batch = [];
        this.batchNumber += 1;

        await this.persisBatchFn(currentBatch, this.batchNumber);
        this.totalProcessed += currentBatch.length;

        inventoryEvents.emit(INVENTORY_EVENTS.BATCH_PROCESSED, {
            batchNumber: this.batchNumber, 
            count: currentBatch.length, 
            totalProcessed: this.totalProcessed,
        });
    }
}
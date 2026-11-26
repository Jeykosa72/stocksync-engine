import { inventoryRepository } from './inventory.repository.js';
import { inventoryService } from './inventory.service.js';
import { inventoryController } from './inventory.controller.js';

export async function inventoryRoutes(fastify) {
    const service = new inventoryService(inventoryRepository);
    const controller = new inventoryController(service);

    fastify.get('/:sku', controller.getBySku);
    fastify.post('/adjust', controller.adjustStock);
    fastify.post('/import-stream', controller.uploadCsvStream);
}
import { EventEmitter } from 'node:events';

class InventoryEventBus extends EventEmitter {}

export const inventoryEvents = new InventoryEventBus();

export const INVENTORY_EVENTS = Object.freeze({
    BATCH_PROCESSED: 'inventory:batch_processed',
    ROW_VALIDATION_FAILED: 'inventory:row_validationi_failed',
    IMPORT_COMPLETED: 'inventory:import_completed',
})
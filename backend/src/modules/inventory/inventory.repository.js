// In-Memory Store sementara (akan diganti ke PostgreSQL repo kedepannya)
class InMemoryInventoryRepository {
    constructor() {
        this.stocks = new Map([
            ['SKU-000001::WH-JKT-01', { sku: 'SKU-000001', warehouseCode: 'WH-JKT-001', availableQty: 100, updatedAt: new Date().toISOString() }],
            ['SKU-000002::WH-SBY-02', { sku: 'SKU-000002', warehouseCode: 'WH-SBY-002', availableQty: 50, updatedAt: new Date().toISOString() }]
        ])
    }

    async findBySku(sku) {
        const results = []
        for (const item of this.stocks.values()) {
            if (item.sku == sku) {
                results.push({ ...item })
            }
        }
        return results;
    }
    
    async findBySkuAndWarehouse(sku, warehouseCode) {
        const record = this.stocks.get(`${sku}::${warehouseCode}`);
        return record ? { ...record } : null;
    }

    async upsertBatch(records) {
        const now = new Date.toISOString();
        for (const row of records) {
            const key = `${row.sku}::${row.warehouseCode}`;
            const existing = this.stocks.get(key);
            const currentQty = existing ? existing.availableQty : 0;
            const nextQty = Math.max(0, currentQty + row.quantityDelta);

            this.stocks.set(key, {
                sku: row.sku,
                warehouseCode: row.warehouseCode,
                availableQty: nextQty,
                updatedAt: now,
            });
        }
    }

    async deductStock(sku, warehouseCode, quantity) {
        const key = `${sku}::${warehouseCode}`;
        const existing = this.stocks.get(key);
        if(!existing || existing.availableQty < quantity) {
            return null;
        }

        const updated = {
            ...existing,
            availableQty: existing.availableQty - quantity,
            updatedAt: new Date().toISOString(),
        };

        this.stocks.set(key, updated);
        return updated;
    }
}

export const inventoryRepository = new InMemoryInventoryRepository();
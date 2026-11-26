import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../../src/app.js";

describe('StockSync API Integration (Iteration 2)', () => {
    let app;

    before(async () => {
        app = await buildApp({ logger: false });
        await app.ready();
    });

    after(async () => {
        await app.close();
    });

    it('GET /health return 200 OK', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/health',
        });

        assert.equal(res.statusCode, 200);
        const body = res.json();
        assert.equal(body.status, 'OK');
    });

    it('POST api/v1/orders rejects invalid payload with 402', async () => {
        const rest = await app.inject({
            method: 'POST',
            url: '/api/v1/orders',
            payload: {
                externalOrderRef: 'A',
                items: []
            },
        });

        assert.equal(rest.statusCode, 422);
        const body = rest.json();
        assert.equal(body.code, 'VALIDATION_ERROR');
    });

    it('POST /api/v1/orders alocates stock and prevents overselling', async () => {
        // Order valid pertama (SKU-000001 punya stok awal 100 di WH-JKT-01)
        const createRes = await app.inject({
            method: 'POST',
            url: '/api/v1/orders',
            payload: {
                externalOrderRef: 'ORD-JKT-2026-001',
                channelCode: 'SHOPEE_B2B',
                warehouseCode: 'WH-JKT-01',
                items: [{ sku: 'SKU-000001', quantity: 60 }],
            },
        });

        assert.equal(createRes.statusCode, 201);
        const createdOrder = createRes.json().data;
        assert.equal(createdOrder.status, 'ALLOCATED');

        // order kedua melebihi sisa stok (sisa 40, diminta 50) -> harus 409 conflict
        const oversellRes = await app.inject({
            method: 'POST',
            url: '/api/v1/orders',
            payload: {
                externalOrderRef: 'ORD-JKT-2026-02',
                channelCode: 'TOKOPEDIA_B2B',
                warehouseCode: 'WH-JKT-01',
                items: [{ sku: 'SKU-000001', quantity: 50 }],
            },
        });

        assert.equal(oversellRes.statusCode, 409);
        assert.equal(oversellRes.json().code, 'INSUFFICIENT_STOCK');
    });

    it('GET /api/v1/inventory/:sku returns stock records for existing SKU', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/api/v1/inventory/SKU-000002',
        });

        assert.equal(res.statusCode, 200);
        const body = res.json();
        assert.equal(body.status, 'success');
        assert.equal(body.data[0].sku, 'SKU-000002');
    });

    it('GET /api/v1/inventory/:sku returns 404 for unknown SKU', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/api/v1/inventory/SKU-UNKNOWN-999',
        });

        assert.equal(res.statusCode, 404);
        assert.equal(res.json().code, 'SKU_NOT_FOUND');
    });
});
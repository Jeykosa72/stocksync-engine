import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/helmet';
import { globalErrorHandler } from './shared/errors/error-handle.js';
import { inventoryRoutes } from './modules/inventory/inventory.routes.js';
import { orderRoutes } from './modules/orders/order.routes.js';
import { optional } from 'zod';

export async function buildApp(oprtions = {}) {
    const app = Fastify({
        logger: options.logger ?? null,
        requestIdHeader: 'x-request-id'
    });

    // Security header & cors
    await app.register(helmet);
    await app.register(cors, { origin: true });

    // File upload maksimal 25MB
    await app.register(multipart, {
        limits: {
            fileSize: 25 * 1024 * 1024, 
            files: 1,
        }
    });

    // Global error handler
    app.setErrorHandler(globalErrorHandler);

    // Health check point
    app.get('health', async () => ({
        status: `ok`,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    }));

    // Domain routes v1
    await app.register(inventoryRoutes, {prefix: 'api/v1/inventory'});
    // await app.register(orderRoutes)

    return app
}
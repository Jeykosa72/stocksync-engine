import { refine, z } from 'zod';

export const adjustStockSchema = z.object({
    sku: z.string().trim().min(3).max(64),
    warehouseCode: z.string().trim().min(2).max(32),
    quantityDelta: z.number().int().refine((val) => val !== 0, {
        message: 'quantityDelta cannot be zero',
    }),
    referenceNote: z.string().trim().max(255).optional(),
});

export const getStockParamsSchema = z.object({
    sku: z.string().trim().min(3).max(64),
});
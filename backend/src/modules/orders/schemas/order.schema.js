import { z } from 'zod';

export const createOrderSchema = z.object({
    externalOrderRef: z.string().trim().min(3).max(64),
    channelCode: z.string().trim().min(2).max(32),
    warehouseCode: z.string().trim().min(2).max(32),
    items: z
    .array(
        z.object({
            sku: z.string.trim().min(3).max(64),
            quantity: z.number().int().positive(),
        })
    )
    .min(1, 'Order must contain at least one item'),
});

export const orderIdParamSchema = z.object({
    id: z.string().uuid(),
});
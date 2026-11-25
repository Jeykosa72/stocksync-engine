import { AppError } from "../../shared/errors/app-error.js";

export class OrderService {
    constructor({orderRepo, inventoryRepo }) {
        this.orderRepo = orderRepo;
        this.inventoryRepo = inventoryRepo;
    }

    async createOrder(payload) {
        // validasi ketersediaan stok seluruh item
        for ( const item of payload.items) {
            const stock = await this.inventoryRepo.findBySkuAndWarehouse(item.sku, payload.warehouseCode);
            if (!stock || stock.availableQty < item.quantity) {
                throw new AppError({
                    message: `Insufficient stock for SKU '${item.sku}' at warehouse '${payload.warehouseCode}'`,
                    statusCode: 409,
                    code: 'INSUFFICIENT_STOCK',
                    details: {
                        sku: item.sku,
                        requested: item.quantity,
                        availableQty: stock ? stock.availableQty : 0,
                    },
                });
            }
        }

        // Potong stok (kedepannya bungkus transaksi ACID + select for update)
        for (const item of payload.items) {
            await this.inventoryRepo.deductStock(item.sku, payload.warehouseCode, item.quantity);
        }

        return this.orderRepo.create(payload);
    }

    async getOrderById(id) {
        const order = await this.orderRepo.findById(id);
        if (!order) {
            throw new AppError({
                message: `Order '${id}' not found.`,
                statusCode: 404,
                code: 'ORDER_NOT_FOUND',
            });
        }
        return order;
    }
}
import { randomUUID } from 'node:crypto';

class InMemoryOrderRepository {
    constructor() {
        this.orders = new Map();
    }

    async create(orderData) {
        const id = randomUUID();
        const record = {
            id,
            status: 'ALLOCATED',
            ...orderData,
            createdAt: new Date().toISOString(),
        };
        this.orders.set(id, record);
        return { ...record };
    }

    async findById(id) {
        const record = this.orders.get(id);
        return record ? { ...record } : null;
    }
}

export const orderRepository = new InMemoryOrderRepository();
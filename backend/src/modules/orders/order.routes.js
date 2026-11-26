import { inventoryRepository } from '../inventory/inventory.repository.js';
import { orderRepository } from './order.repository.js';
import { OrderService } from './order.service.js';
import { OrderController } from './order.controller.js';

export async function orderRoutes(fastify) {
  const service = new OrderService({
    orderRepo: orderRepository,
    inventoryRepo: inventoryRepository,
  });
  const controller = new OrderController(service);

  fastify.post('/', controller.create);
  fastify.get('/:id', controller.getById);
}
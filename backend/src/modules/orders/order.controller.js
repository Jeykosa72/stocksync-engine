import { createOrderSchema, orderIdParamSchema } from "./schemas/order.schema.js";

export class OrderController {
    constructor(orderService) {
        this.orderService = orderService;
    }

    create = async (request, reply) => {
        const payload = createOrderSchema.parse(request.body);
        const order = await this.orderService.createOrder(payload);
        return reply.status(201).send({
            status: 'success',
            data: order,
        });
    };

    getById = async (request, reply) => {
        const { id } = orderIdParamSchema.parse(request.params);
        const order  = await this.orderService.getOrderById(id);
        return reply.status(200).send({
            status: 'succes',
            data: order,
        });
    };
}
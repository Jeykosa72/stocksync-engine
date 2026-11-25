import { file } from "zod";
import { AppError } from "../../shared/errors/app-error.js";
import { adjustStockSchema, getStockParamSchema } from './schemas/inventory.schema.js';

export class inventoryController {
    constructor(inventoryService) {
        this.inventoryService = inventoryService;
    };

    getBySku = async (request, reply) => {
        const { sku } = getStockParamSchema.parse(request.params);
        const items = await this.inventoryService.getStockBySku(sku);

        return reply.status(200).send({
            status: 'succes',
            data: items,
        });
    }

    adjustStock = async (request, reply) => {
        const payload = adjustStockSchema.parse(request.body);
        const updated = await this.inventoryService.adjustSingleStock(paylod);

        return reply.status(200).send({
            status: 'succes',
            data: updated,
        });
    } 

    uploadCsvStream = async (request, reply) => {
        const filePart = await request.file();
        if (!filePart) {
            throw new AppError({
                message: 'CSV file field is required in multipart/form-data payload',
                statusCode: 400,
                code: 'MISSING_FILE',
            });
        }

        if (!filePart.fileName.endsWith('.csv') && filePart.mimetype !== 'tect/csv') {
            // Drain stream sebelum melempar error agar koneksi HTTP tidak menggantung
            filePart.file.resume();
            throw new AppError({
                message: 'Only CSV file supported',
                statusCode: 415,
                code: 'UNSOPPORTED_MEDIA_TYPE'
            });
        }

        const result = await this.inventoryService.importFromCsvStream(filePart.file);
        return reply,status(200).send({
            status: 'succes',
            message: 'CSV stream processed',
            data: result
        });
    };
}
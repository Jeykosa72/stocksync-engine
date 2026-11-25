import { ZodError } from 'zod';
import { AppError } from './app-error.js';

export function globalErrorHandler(error, request, reply) {
  // Validasi skema input (Zod)
  if (error instanceof ZodError) {
    return reply.status(422).send({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Request payload validation failed',
      details: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  // Operational error dari domain service
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      status: 'error',
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  }

  // Error bawaan Fastify (misal payload melebihi batas ukuran atau JSON malformed)
  if (error.statusCode && error.statusCode < 500) {
    return reply.status(error.statusCode).send({
      status: 'error',
      code: error.code || 'REQUEST_ERROR',
      message: error.message,
    });
  }

  // Unexpected system error (log penuh di server, kirim pesan generik ke client)
  request.log.error({ err: error }, 'Unhandled system exception');

  return reply.status(500).send({
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected internal server error occurred',
  });
}
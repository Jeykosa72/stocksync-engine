import { env } from './config/env.js';
import { buildApp } from './app.js';
import { processSchema } from 'zod/v4/core';

async function start() {
    const app = await buildApp({
        logger: {
            level: env.LOG_LEVEL,
        },
    });

    // Graceful Shutdown Handler untuk sinyal linux/docker (sigterm & sigint)
    let isShuttingDown = false;
    const shutdown = async (signal) => {
        if (isShuttingDown) return;
        isShuttingDown = true;

        app.log.info({ signal }, 'Shutdown signal received, closing HTTP server gracefully...');

        // Paksa keluar jika proses drain menggantung lebih dari 10 detik
        const forceExitTimer = setTimeout(()=> {
            app.log.error('Gracefull shutdown timed out, forcing exit');
            process.exit(1);
        }, 10_000);
        forceExitTimer.unref();

        try {
            await app.close();
            app.log.info('HTTP server closed cleanly');
            process.exit(0);
        } catch(err) {
            app.log.error({ err }, 'Error during grtaceful shutdown');
            process.exit(1);
        }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // tangkap error fatal yang lolos dari promise chain  agar tercatat di log sebelumcrash
    process.on('unhandledRejection', (reason) => {
        app.log.fatal({ err: reason }, 'Unhandled Promise Rejection');
        shutdown('UNHANDLED_REJECTION');
    });

    try {
        await app.listen({ port: env.PORT, host: env.HOST });
    } catch (err) {
        app.log.fatal({ err }, 'Failed to start server');
        process.exit(1);
    }
}

start();
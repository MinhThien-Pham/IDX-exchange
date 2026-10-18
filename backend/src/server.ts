import app, { database, environment, logger } from './app.js';

const server = app.listen(environment.PORT, () => {
  logger.info({ event: 'server_started', port: environment.PORT });
});

let shuttingDown = false;
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ event: 'server_stopping', signal });
  const timeout = setTimeout(() => {
    logger.error({ event: 'shutdown_timeout' });
    process.exit(1);
  }, 10_000);
  timeout.unref();
  server.close(() => {
    database.pool.end().then(
      () => {
        clearTimeout(timeout);
        process.exit(0);
      },
      () => {
        logger.error({ event: 'database_shutdown_failed' });
        process.exit(1);
      },
    );
  });
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

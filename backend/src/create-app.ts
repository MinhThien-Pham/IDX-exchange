import cors from 'cors';
import express from 'express';
import type { ListingRepository } from './modules/listings/application/ports/listing-repository.js';
import { createListingsModule } from './modules/listings/index.js';
import type { OpenHouseRepository } from './modules/open-houses/application/ports/open-house-repository.js';
import { createOpenHousesModule } from './modules/open-houses/index.js';
import { asyncHandler } from './platform/http/async-handler.js';
import { errorHandler, notFoundHandler } from './platform/http/error-handler.js';
import { HttpError } from './platform/http/http-error.js';
import { requestContext } from './platform/http/request-context.js';
import { openApiDocument } from './platform/http/openapi.js';
import { createLogger, type Logger } from './platform/logging/logger.js';

export interface AppDependencies {
  listingRepository: ListingRepository;
  openHouseRepository: OpenHouseRepository;
  allowedOrigins: string[];
  readiness: () => Promise<void>;
  logger?: Logger;
}

/** HTTP adapter; tests supply in-memory ports and never open a database connection. */
export function createApp(dependencies: AppDependencies, app = express()) {
  const logger = dependencies.logger ?? createLogger();
  const origins = new Set(dependencies.allowedOrigins);

  app.disable('x-powered-by');
  app.set('query parser', 'simple');
  app.use(requestContext(logger));
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || origins.has(origin)) {
          callback(null, true);
          return;
        }
        callback(new HttpError(403, 'ORIGIN_NOT_ALLOWED', 'Origin is not allowed.'));
      },
      methods: ['GET', 'HEAD', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
      exposedHeaders: ['X-Request-ID'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/openapi.json', (_request, response) => {
    response.json(openApiDocument);
  });

  app.get('/api/health/live', (_request, response) => {
    response.json({ status: 'ok' });
  });
  app.get(
    '/api/health',
    asyncHandler(async (_request, response) => {
      await dependencies.readiness().catch(() => {
        throw new HttpError(503, 'SERVICE_UNAVAILABLE', 'Database is temporarily unavailable.');
      });
      response.json({ status: 'ok', database: 'connected' });
    }),
  );

  const listings = createListingsModule(dependencies.listingRepository);
  const openHouses = createOpenHousesModule(
    dependencies.openHouseRepository,
    dependencies.listingRepository,
  );
  app.use('/api/v1/listings', listings.router, openHouses.router);

  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
}

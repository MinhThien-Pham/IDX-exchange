import 'dotenv/config';
import express from 'express';
import { attachDatabasePool } from '@vercel/functions';
import { createApp } from './create-app.js';
import { PostgresListingRepository } from './modules/listings/infrastructure/postgres-listing-repository.js';
import { PostgresOpenHouseRepository } from './modules/open-houses/infrastructure/postgres-open-house-repository.js';
import { parseEnvironment } from './platform/config/env.js';
import { createDatabase } from './platform/db/client.js';
import { createLogger } from './platform/logging/logger.js';

export const environment = parseEnvironment(process.env);
export const logger = createLogger(environment.LOG_LEVEL === 'silent');
export const database = createDatabase(environment.DATABASE_URL);

// Fluid compute can release idle pool connections before a function is suspended.
if (process.env.VERCEL) attachDatabasePool(database.pool);

// A direct Express import/instance makes this a discoverable Vercel entrypoint.
const app = express();
createApp(
  {
    listingRepository: new PostgresListingRepository(database.db),
    openHouseRepository: new PostgresOpenHouseRepository(database.db),
    allowedOrigins: environment.FRONTEND_ORIGINS,
    readiness: async () => {
      await database.pool.query('SELECT 1');
    },
    logger,
  },
  app,
);

export default app;

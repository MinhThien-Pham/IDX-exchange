import { listingParamsSchema, searchListingsSchema } from '@idx/contracts';
import { Router } from 'express';
import { validateRequest } from '../../../platform/http/validate-request.js';
import type { createListingController } from './listing-controller.js';

export function createListingRouter(
  controller: ReturnType<typeof createListingController>,
): Router {
  const router = Router();
  router.get('/', validateRequest('query', searchListingsSchema), controller.search);
  router.get('/:id', validateRequest('params', listingParamsSchema), controller.details);
  return router;
}

import { listingParamsSchema } from '@idx/contracts';
import { Router } from 'express';
import { validateRequest } from '../../../platform/http/validate-request.js';
import type { createOpenHouseController } from './open-house-controller.js';

export function createOpenHouseRouter(
  controller: ReturnType<typeof createOpenHouseController>,
): Router {
  const router = Router();
  router.get(
    '/:id/openhouses',
    validateRequest('params', listingParamsSchema),
    controller.listForListing,
  );
  return router;
}

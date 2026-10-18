import { listingParamsSchema } from '@idx/contracts';
import { Router } from 'express';
import type { RequestHandler } from 'express';
import { validateRequest } from '../../../platform/http/validate-request.js';

export function createOpenHouseRouter(controller: RequestHandler): Router {
  const router = Router();
  router.get('/:id/openhouses', validateRequest('params', listingParamsSchema), controller);
  return router;
}

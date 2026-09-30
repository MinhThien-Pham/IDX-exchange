import type { OpenHouseDto } from '@idx/contracts';
import type { RequestHandler } from 'express';
import { asyncHandler } from '../../../platform/http/async-handler.js';
import type { GetOpenHouses } from '../application/use-cases/get-open-houses.js';

export function createOpenHouseController(useCases: { getOpenHouses: GetOpenHouses }): {
  listForListing: RequestHandler;
} {
  return {
    listForListing: asyncHandler(async (_request, response) => {
      const { id } = response.locals.params as { id: string };
      const openHouses: OpenHouseDto[] = await useCases.getOpenHouses.execute(id);
      response.json(openHouses);
    }),
  };
}

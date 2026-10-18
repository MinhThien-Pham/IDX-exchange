import type {
  ListingExistenceLookup,
  OpenHouseRepository,
} from './application/ports/open-house-repository.js';
import { GetOpenHouses } from './application/use-cases/get-open-houses.js';
import { createOpenHouseController } from './presentation/open-house-controller.js';
import { createOpenHouseRouter } from './presentation/open-house-routes.js';

export function createOpenHousesModule(
  repository: OpenHouseRepository,
  listings: ListingExistenceLookup,
) {
  const controller = createOpenHouseController(new GetOpenHouses(repository, listings));
  return { router: createOpenHouseRouter(controller) };
}

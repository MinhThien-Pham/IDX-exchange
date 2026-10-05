import { openHousesResponseSchema } from '@idx/contracts';
import { request } from '../../../shared/api/client';

export function fetchOpenHouses(listingId: string, signal?: AbortSignal) {
  return request(
    `/listings/${encodeURIComponent(listingId)}/openhouses`,
    openHousesResponseSchema,
    signal,
  );
}

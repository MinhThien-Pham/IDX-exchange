import { citySuggestionsResponseSchema, homeTypesResponseSchema } from '@idx/contracts';
import { request } from '../../../shared/api/client';
import { buildQueryString } from '../../../shared/utils/query-string';

export function fetchHomeTypes(signal?: AbortSignal) {
  return request('/listings/home-types', homeTypesResponseSchema, signal);
}

export function fetchCitySuggestions(prefix: string, signal?: AbortSignal) {
  return request(
    `/listings/cities?${buildQueryString({ q: prefix })}`,
    citySuggestionsResponseSchema,
    signal,
  );
}

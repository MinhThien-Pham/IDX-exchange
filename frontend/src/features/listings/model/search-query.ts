import { searchListingsSchema } from '@idx/contracts';

export const validSearchSchema = searchListingsSchema.refine(
  (value) =>
    value.minPrice === undefined ||
    value.maxPrice === undefined ||
    value.minPrice <= value.maxPrice,
  { message: 'Minimum price must not exceed maximum price.', path: ['maxPrice'] },
);

export function parseListingSearch(params: URLSearchParams) {
  const query: Record<string, unknown> = {};
  for (const key of Object.keys(searchListingsSchema.shape)) {
    const values = params.getAll(key);
    if (values.length > 0) query[key] = values.length === 1 ? values[0] : values;
  }
  return validSearchSchema.safeParse(query);
}

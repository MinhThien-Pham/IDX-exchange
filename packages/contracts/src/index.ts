import { z } from 'zod';

export const sortFields = ['price', 'listedAt', 'squareFeet', 'bedrooms'] as const;
export const sortOrders = ['ASC', 'DESC'] as const;

// Query strings arrive as strings. Reject arrays, booleans, whitespace, NaN and Infinity.
const queryNumber = z
  .union([z.number(), z.string().trim().min(1)])
  .pipe(z.coerce.number<string | number>().finite());
const optionalText = (max: number) => z.string().trim().min(1).max(max).optional();

export const searchListingsSchema = z.strictObject({
  city: optionalText(100),
  zipcode: optionalText(20),
  minPrice: queryNumber.pipe(z.number().min(0).max(999_999_999_999)).optional(),
  maxPrice: queryNumber.pipe(z.number().min(0).max(999_999_999_999)).optional(),
  beds: queryNumber.pipe(z.number().int().min(0).max(100)).optional(),
  baths: queryNumber.pipe(z.number().min(0).max(100)).optional(),
  homeType: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z][a-z0-9-]*$/)
    .optional(),
  limit: queryNumber.pipe(z.number().int().min(1).max(100)).default(20),
  offset: queryNumber.pipe(z.number().int().min(0).max(1_000_000)).default(0),
  sortBy: z.enum(sortFields).default('listedAt'),
  sortOrder: z.enum(sortOrders).default('DESC'),
});

export type SearchListingsQuery = z.infer<typeof searchListingsSchema>;
export type ListingFilters = Pick<
  SearchListingsQuery,
  'city' | 'zipcode' | 'minPrice' | 'maxPrice' | 'beds' | 'baths' | 'homeType'
>;

export const homeTypeSchema = z.object({ value: z.string().min(1), label: z.string().min(1) });
export type HomeTypeOption = z.infer<typeof homeTypeSchema>;
export const homeTypesResponseSchema = z.array(homeTypeSchema);
export const citySuggestionsQuerySchema = z.strictObject({ q: z.string().trim().min(1).max(100) });
export type CitySuggestionsQuery = z.infer<typeof citySuggestionsQuerySchema>;
export const citySuggestionsResponseSchema = z.array(z.string().min(1).max(100)).max(8);

// Public routes use the internal UUID; the source MLS identifier is exposed as externalId.
export const listingIdSchema = z.uuid('Invalid listing ID');
export const listingParamsSchema = z.strictObject({ id: listingIdSchema });
const nullableNumber = z.number().finite().nullable();

export const listingSchema = z.object({
  id: z.string(),
  source: z.string(),
  externalId: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipcode: z.string(),
  price: nullableNumber,
  bedrooms: nullableNumber,
  bathrooms: nullableNumber,
  squareFeet: nullableNumber,
  listedAt: z.string().nullable(),
  photos: z.array(z.string().url()),
  latitude: nullableNumber,
  longitude: nullableNumber,
  description: z.string(),
  propertyType: z.string().nullable(),
  propertySubType: z.string().nullable(),
  homeType: homeTypeSchema.nullable(),
  yearBuilt: nullableNumber,
  lotSizeAcres: nullableNumber,
  parkingSpaces: nullableNumber,
});

export type ListingDto = z.infer<typeof listingSchema>;
export const listingsResponseSchema = z.object({
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  results: z.array(listingSchema),
});
export type ListingsResponse = z.infer<typeof listingsResponseSchema>;

export const openHouseSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  date: z.string(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  timeZone: z.string(),
  remarks: z.string(),
});
export type OpenHouseDto = z.infer<typeof openHouseSchema>;
export const openHousesResponseSchema = z.array(openHouseSchema);

export const apiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), details: z.unknown().optional() }),
  requestId: z.string().optional(),
});
export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;

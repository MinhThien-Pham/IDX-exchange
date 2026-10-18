import { z } from 'zod';
import {
  apiErrorSchema,
  listingSchema,
  listingsResponseSchema,
  openHousesResponseSchema,
  searchListingsSchema,
} from '@idx/contracts';

const jsonSchema = (schema: z.ZodType) => z.toJSONSchema(schema, { io: 'output' });
const querySchema = jsonSchema(searchListingsSchema);
const response = (description: string, schema: unknown) => ({
  description,
  content: { 'application/json': { schema } },
});
const errorResponse = { $ref: '#/components/responses/Error' };
const idParameter = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'Internal listing UUID returned by the search endpoint.',
  schema: { type: 'string', format: 'uuid' },
};

// Output schemas come from the same Zod contracts the API and browser consume.
export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'IDX Exchange API',
    version: '1.0.0',
    description:
      'Read-only property search API. Unknown and duplicate query parameters are rejected. Prices are USD; open-house times are local wall-clock values accompanied by an IANA time zone.',
  },
  servers: [{ url: '/' }],
  paths: {
    '/api/health/live': {
      get: {
        operationId: 'liveness',
        summary: 'Check the API process',
        responses: {
          '200': response('API is running', {
            type: 'object',
            properties: { status: { const: 'ok' } },
          }),
        },
      },
    },
    '/api/health': {
      get: {
        operationId: 'readiness',
        summary: 'Check database connectivity',
        responses: {
          '200': response('Database is reachable', {
            type: 'object',
            properties: { status: { const: 'ok' }, database: { const: 'connected' } },
          }),
          '503': errorResponse,
        },
      },
    },
    '/api/v1/listings': {
      get: {
        operationId: 'searchListings',
        summary: 'Filter, sort and paginate listings',
        description:
          'City matches a trimmed, case-insensitive exact city. ZIP matches exactly. Beds and baths are minimums. minPrice must not exceed maxPrice. Sorts use NULLS LAST and an ascending UUID tie-breaker.',
        parameters: Object.entries(querySchema.properties ?? {}).map(([name, schema]) => ({
          name,
          in: 'query',
          required: false,
          schema,
        })),
        responses: {
          '200': response('Paginated listings', { $ref: '#/components/schemas/ListingsResponse' }),
          '400': errorResponse,
          '403': errorResponse,
          '500': errorResponse,
        },
      },
    },
    '/api/v1/listings/{id}': {
      get: {
        operationId: 'getListing',
        summary: 'Get listing details',
        parameters: [idParameter],
        responses: {
          '200': response('Listing details', { $ref: '#/components/schemas/Listing' }),
          '400': errorResponse,
          '404': errorResponse,
          '500': errorResponse,
        },
      },
    },
    '/api/v1/listings/{id}/openhouses': {
      get: {
        operationId: 'getOpenHouses',
        summary: 'Get a listing’s open houses',
        description:
          'An existing listing without events returns an empty array. A missing listing returns 404.',
        parameters: [idParameter],
        responses: {
          '200': response('Open houses ordered by date and local start time', {
            $ref: '#/components/schemas/OpenHouses',
          }),
          '400': errorResponse,
          '404': errorResponse,
          '500': errorResponse,
        },
      },
    },
  },
  components: {
    schemas: {
      Listing: jsonSchema(listingSchema),
      ListingsResponse: jsonSchema(listingsResponseSchema),
      OpenHouses: jsonSchema(openHousesResponseSchema),
      ApiError: jsonSchema(apiErrorSchema),
    },
    responses: {
      Error: response('Standard error; unexpected internal messages are not exposed', {
        $ref: '#/components/schemas/ApiError',
      }),
    },
  },
};

import { z } from 'zod';

const configSchema = z.object({
  apiBaseUrl: z.union([
    z.literal(''),
    z.url().refine((value) => /^https?:\/\//.test(value), 'API URL must use HTTP or HTTPS'),
  ]),
  googleMapsApiKey: z.string(),
});

// Only explicitly public VITE_ variables belong in the browser bundle.
export const config = configSchema.parse({
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, ''),
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
});

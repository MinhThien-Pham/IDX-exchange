import { apiErrorSchema } from '@idx/contracts';
import { type z } from 'zod';
import { config } from '../config';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${config.apiBaseUrl}/api/v1${path}`, { signal });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body);
    throw new ApiError(
      parsed.success ? parsed.data.error.message : `Request failed (HTTP ${response.status})`,
      response.status,
      parsed.success ? parsed.data.error.code : 'HTTP_ERROR',
      parsed.success ? parsed.data.requestId : undefined,
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    throw new ApiError(
      'The server returned an unexpected response. Please try again.',
      response.status,
      'INVALID_RESPONSE',
    );
  return parsed.data;
}

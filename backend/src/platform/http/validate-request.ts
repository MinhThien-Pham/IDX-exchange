import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { HttpError } from './http-error.js';

/** Express 5 query is a getter. Keep parsed values in locals instead of mutating it. */
export function validateRequest(
  source: 'query' | 'params' | 'body',
  schema: ZodType,
): RequestHandler {
  return (request, response, next) => {
    const result = schema.safeParse(request[source]);
    if (!result.success) {
      next(
        new HttpError(
          400,
          'VALIDATION_ERROR',
          `Invalid request ${source}.`,
          result.error.issues.map((issue) => ({
            path: issue.path.map(String).join('.'),
            message: issue.message,
          })),
        ),
      );
      return;
    }
    response.locals[source] = result.data;
    next();
  };
}

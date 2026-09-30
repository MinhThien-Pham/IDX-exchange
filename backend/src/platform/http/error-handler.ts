import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ApiErrorResponse } from '@idx/contracts';
import {
  ApplicationError,
  type ApplicationErrorKind,
} from '../../shared/errors/application-error.js';
import type { Logger } from '../logging/logger.js';
import { HttpError } from './http-error.js';

const statusByKind: Record<ApplicationErrorKind, number> = {
  'not-found': 404,
  'invalid-input': 400,
};

export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new HttpError(404, 'ROUTE_NOT_FOUND', 'Route not found.'));
};

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, _request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred.';
    let details: unknown;

    if (error instanceof HttpError) {
      ({ status, code, message, details } = error);
    } else if (error instanceof ApplicationError) {
      status = statusByKind[error.kind];
      ({ code, message } = error);
    } else if (error instanceof URIError && 'status' in error && error.status === 400) {
      status = 400;
      code = 'INVALID_PATH';
      message = 'Request path contains invalid URL encoding.';
    } else if (isBodyParserError(error)) {
      status = error.status;
      code = error.status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INVALID_JSON';
      message =
        error.status === 413 ? 'Request body is too large.' : 'Request body is not valid JSON.';
    }

    if (status >= 500) {
      logger.error({
        event: 'request_failed',
        requestId: response.locals.requestId,
        code,
        // Avoid logging SQL, connection strings or arbitrary upstream error messages.
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
    }

    const body: ApiErrorResponse = {
      error: { code, message, ...(details !== undefined ? { details } : {}) },
      requestId: response.locals.requestId as string | undefined,
    };
    response.status(status).json(body);
  };
}

function isBodyParserError(error: unknown): error is { status: 400 | 413 } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'status' in error &&
    ((error.type === 'entity.parse.failed' && error.status === 400) ||
      (error.type === 'entity.too.large' && error.status === 413))
  );
}

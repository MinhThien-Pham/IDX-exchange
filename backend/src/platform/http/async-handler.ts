import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncHandler = (request: Request, response: Response, next: NextFunction) => Promise<unknown>;

/** Express 5 also catches rejected handlers; this wrapper makes the shared policy explicit. */
export function asyncHandler(handler: AsyncHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve()
      .then(() => handler(request, response, next))
      .catch(next);
  };
}

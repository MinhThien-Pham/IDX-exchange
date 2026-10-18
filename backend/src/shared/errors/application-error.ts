/** Business failures have stable codes; the HTTP adapter chooses their status codes. */
export class ApplicationError extends Error {
  constructor(
    public readonly code: 'INVALID_SEARCH_RANGE' | 'LISTING_NOT_FOUND',
    message: string,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

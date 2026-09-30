/** Categories let the HTTP adapter choose status codes without knowing module-specific codes. */
export type ApplicationErrorKind = 'not-found' | 'invalid-input';

/** Business failures have stable codes; modules own their codes, the adapter owns HTTP status. */
export class ApplicationError extends Error {
  constructor(
    public readonly kind: ApplicationErrorKind,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

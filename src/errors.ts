/**
 * Error thrown when an Investec API request fails.
 */
export class InvestecApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown
  ) {
    super(message);
    this.name = 'InvestecApiError';
  }
}

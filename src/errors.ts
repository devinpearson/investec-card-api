/**
 * Error thrown when an Investec API request fails.
 */
export class InvestecApiError extends Error {
  /**
   * @param message - Human-readable description of the failure
   * @param status - HTTP status code
   * @param body - Parsed JSON or text error body, when the API returned one
   * @param endpoint - The URL that was requested
   */
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
    readonly endpoint?: string,
  ) {
    super(message);
    this.name = 'InvestecApiError';
  }
}

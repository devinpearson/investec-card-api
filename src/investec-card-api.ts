import { InvestecApiError } from './errors';
import type {
  AuthResponse,
  CardResponse,
  CodePayload,
  CodeResponse,
  CodeToggle,
  EnvResponse,
  EnvVars,
  ExecuteResult,
  ExecutionResult,
  ReferenceResponse,
  Transaction,
} from './types';

const DEFAULT_HOST = 'https://openapi.investec.com';
const REQUEST_TIMEOUT_MS = 30_000;
/** Refresh tokens this many ms before they expire. */
const TOKEN_SKEW_MS = 60_000;
const CARDS_SCOPE = 'cards';

type Method = 'GET' | 'POST';

/**
 * Helper to create a full API endpoint URL from host and path.
 */
const createEndpoint = (host: string, path: string) =>
  new URL(path, host).toString();

/**
 * Main API class for interacting with Investec programmable cards.
 *
 * @example
 * ```typescript
 * import { InvestecCardApi } from 'investec-card-api';
 * const api = new InvestecCardApi('clientId', 'clientSecret', 'apiKey');
 * const cards = await api.getCards();
 * ```
 *
 * @remarks
 * - All methods throw {@link InvestecApiError} on HTTP failures.
 * - Card methods reject with a `TypeError` for an invalid card key, before
 *   any request is made.
 * - A request that gets a 401 is retried once with a fresh token.
 * - You must provide valid Investec API credentials with the `cards` scope.
 */
export class InvestecCardApi {
  private readonly host: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly apiKey: string;
  private token: string | undefined;
  private expiresAt = 0;
  private refreshPromise: Promise<string> | undefined;

  /**
   * Constructs a new InvestecCardApi instance.
   * @param clientId - OAuth client ID
   * @param clientSecret - OAuth client secret
   * @param apiKey - Investec API key
   * @param host - API host URL (default: 'https://openapi.investec.com')
   */
  constructor(
    clientId: string,
    clientSecret: string,
    apiKey: string,
    host: string = DEFAULT_HOST,
  ) {
    this.host = host;
    this.apiKey = apiKey;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Gets a valid OAuth token, refreshing if necessary.
   * Concurrent callers share a single in-flight refresh.
   * @returns The OAuth token string.
   * @throws InvestecApiError if token cannot be retrieved.
   */
  async getToken(): Promise<string> {
    if (this.token && Date.now() < this.expiresAt - TOKEN_SKEW_MS) {
      return this.token;
    }

    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshAccessToken().finally(() => {
        this.refreshPromise = undefined;
      });
    }

    return this.refreshPromise;
  }

  /**
   * Requests a new OAuth access token from Investec.
   * @returns The AuthResponse object.
   * @throws InvestecApiError if authentication fails, or with status 403 if
   * the token does not carry the `cards` scope.
   */
  async getAccessToken(): Promise<AuthResponse> {
    const endpoint = createEndpoint(this.host, '/identity/v2/oauth2/token');
    const response = await fetch(endpoint, {
      method: 'POST',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${this.clientId}:${this.clientSecret}`,
        ).toString('base64')}`,
        'x-api-key': this.apiKey,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw await toApiError(response, endpoint);
    }

    const result = await readJson<AuthResponse>(response, endpoint);

    // Scopes are space-separated; match whole entries, not substrings.
    const scopes = (result.scope ?? '').split(/\s+/);
    if (!scopes.includes(CARDS_SCOPE)) {
      throw new InvestecApiError(
        'You require the cards scope to use this tool',
        403,
        { scope: result.scope },
        endpoint,
      );
    }

    this.token = result.access_token;
    this.expiresAt = Date.now() + result.expires_in * 1000;
    return result;
  }

  /**
   * Replaces the environment variables on a programmable card.
   * The variables are sent as `{ variables: env }`, the shape the API expects.
   */
  async uploadEnv(cardKey: number, env: EnvVars): Promise<EnvResponse> {
    return this.cardRequest<EnvResponse>(
      'POST',
      cardKey,
      '/environmentvariables',
      { variables: env },
    );
  }

  /**
   * Uploads code to a programmable card.
   */
  async uploadCode(cardKey: number, code: CodePayload): Promise<CodeResponse> {
    return this.cardRequest<CodeResponse>('POST', cardKey, '/code', code);
  }

  /**
   * Publishes code to a programmable card.
   */
  async uploadPublishedCode(
    cardKey: number,
    codeId: string,
    code: string,
  ): Promise<CodeResponse> {
    return this.cardRequest<CodeResponse>('POST', cardKey, '/publish', {
      code,
      codeId,
    });
  }

  /**
   * Retrieves all programmable cards for the authenticated user.
   */
  async getCards(): Promise<CardResponse> {
    return this.request<CardResponse>('GET', '/za/v1/cards');
  }

  /**
   * Retrieves environment variables for a programmable card.
   */
  async getEnv(cardKey: number): Promise<EnvResponse> {
    return this.cardRequest<EnvResponse>(
      'GET',
      cardKey,
      '/environmentvariables',
    );
  }

  /**
   * Retrieves code for a programmable card.
   */
  async getCode(cardKey: number): Promise<CodeResponse> {
    return this.cardRequest<CodeResponse>('GET', cardKey, '/code');
  }

  /**
   * Retrieves published code for a programmable card.
   */
  async getPublishedCode(cardKey: number): Promise<CodeResponse> {
    return this.cardRequest<CodeResponse>('GET', cardKey, '/publishedcode');
  }

  /**
   * Enables or disables programmable features on a card.
   */
  async toggleCode(cardKey: number, enabled: boolean): Promise<CodeToggle> {
    return this.cardRequest<CodeToggle>(
      'POST',
      cardKey,
      '/toggle-programmable-feature',
      { Enabled: enabled },
    );
  }

  /**
   * Retrieves code execution results for a programmable card.
   */
  async getExecutions(cardKey: number): Promise<ExecutionResult> {
    return this.cardRequest<ExecutionResult>(
      'GET',
      cardKey,
      '/code/executions',
    );
  }

  /**
   * Executes code in a simulated transaction context.
   */
  async executeCode(
    code: string,
    transaction: Transaction,
    cardKey: number,
  ): Promise<ExecuteResult> {
    return this.cardRequest<ExecuteResult>('POST', cardKey, '/code/execute', {
      simulationcode: code,
      centsAmount: transaction.centsAmount,
      currencyCode: transaction.currencyCode,
      merchantCode: transaction.merchant.category.code,
      merchantName: transaction.merchant.name,
      merchantCity: transaction.merchant.city,
      countryCode: transaction.merchant.country.code,
    });
  }

  /**
   * Retrieves supported currencies for programmable cards.
   */
  async getCurrencies(): Promise<ReferenceResponse> {
    return this.request<ReferenceResponse>('GET', '/za/v1/cards/currencies');
  }

  /**
   * Retrieves supported countries for programmable cards.
   */
  async getCountries(): Promise<ReferenceResponse> {
    return this.request<ReferenceResponse>('GET', '/za/v1/cards/countries');
  }

  /**
   * Retrieves supported merchants for programmable cards.
   */
  async getMerchants(): Promise<ReferenceResponse> {
    return this.request<ReferenceResponse>('GET', '/za/v1/cards/merchants');
  }

  private async refreshAccessToken(): Promise<string> {
    const result = await this.getAccessToken();
    return result.access_token;
  }

  private invalidateToken(): void {
    this.token = undefined;
    this.expiresAt = 0;
  }

  /** A request scoped to one card: validates the key, names 404s "Card not found". */
  private async cardRequest<T>(
    method: Method,
    cardKey: number,
    suffix: string,
    body?: unknown,
  ): Promise<T> {
    if (!Number.isSafeInteger(cardKey) || cardKey < 0) {
      throw new TypeError(
        `Invalid card key: expected a non-negative integer, got ${String(cardKey)}`,
      );
    }
    return this.request<T>(
      method,
      `/za/v1/cards/${cardKey}${suffix}`,
      body,
      'Card not found',
    );
  }

  private async request<T>(
    method: Method,
    path: string,
    body?: unknown,
    notFoundMessage?: string,
  ): Promise<T> {
    const endpoint = createEndpoint(this.host, path);

    let response = await this.send(method, endpoint, body);
    if (response.status === 401) {
      // The token may have been revoked or expired early; retry once.
      this.invalidateToken();
      response = await this.send(method, endpoint, body);
    }

    if (!response.ok) {
      throw await toApiError(response, endpoint, notFoundMessage);
    }

    return readJson<T>(response, endpoint);
  }

  private async send(
    method: Method,
    endpoint: string,
    body: unknown,
  ): Promise<Response> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'x-api-key': this.apiKey,
      Accept: 'application/json',
    };

    if (body !== undefined) {
      headers['content-type'] = 'application/json';
    }

    return fetch(endpoint, {
      method,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
}

/** Parses a successful response, turning a non-JSON body into an InvestecApiError. */
async function readJson<T>(response: Response, endpoint: string): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new InvestecApiError(
      `Expected a JSON response from ${endpoint}`,
      response.status,
      text,
      endpoint,
    );
  }
}

async function toApiError(
  response: Response,
  endpoint: string,
  notFoundMessage?: string,
): Promise<InvestecApiError> {
  const body = await readErrorBody(response);
  const message =
    (response.status === 404 && notFoundMessage) ||
    messageFromBody(body) ||
    response.statusText ||
    `Request failed with status ${response.status}`;
  return new InvestecApiError(message, response.status, body, endpoint);
}

/** Picks a human-readable message out of a plain-text or JSON error body. */
function messageFromBody(body: unknown): string | undefined {
  if (typeof body === 'string') {
    return body;
  }
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    for (const key of ['message', 'error_description', 'error', 'title']) {
      const value = record[key];
      if (typeof value === 'string' && value) {
        return value;
      }
    }
  }
  return undefined;
}

async function readErrorBody(response: Response): Promise<unknown> {
  let text: string;
  try {
    text = await response.text();
  } catch {
    return undefined;
  }
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

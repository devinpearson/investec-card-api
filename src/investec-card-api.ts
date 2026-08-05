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

/**
 * Helper to create a full API endpoint URL from host and path.
 */
const createEndpoint = (host: string, path: string) => new URL(path, host).toString();

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
 * - All methods return typed responses.
 * - You must provide valid Investec API credentials.
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
  constructor(clientId: string, clientSecret: string, apiKey: string, host: string = DEFAULT_HOST) {
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
   * @throws InvestecApiError if authentication fails or the cards scope is missing.
   */
  async getAccessToken(): Promise<AuthResponse> {
    const endpoint = createEndpoint(this.host, `/identity/v2/oauth2/token`);
    const response = await fetch(endpoint, {
      method: 'POST',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Authorization:
          'Basic ' + Buffer.from(this.clientId + ':' + this.clientSecret).toString('base64'),
        'x-api-key': this.apiKey,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw await this.createHttpError(response);
    }

    const result = (await response.json()) as AuthResponse;

    if (!result.scope.includes('cards')) {
      throw new InvestecApiError('You require the cards scope to use this tool', response.status);
    }

    this.token = result.access_token;
    this.expiresAt = Date.now() + result.expires_in * 1000;
    return result;
  }

  /**
   * Uploads environment variables to a programmable card.
   */
  async uploadEnv(cardKey: number, env: EnvVars): Promise<EnvResponse> {
    return this.request<EnvResponse>(
      'POST',
      `/za/v1/cards/${encodeURIComponent(cardKey.toString())}/environmentvariables`,
      env
    );
  }

  /**
   * Uploads code to a programmable card.
   */
  async uploadCode(cardKey: number, code: CodePayload): Promise<CodeResponse> {
    return this.request<CodeResponse>(
      'POST',
      `/za/v1/cards/${encodeURIComponent(cardKey.toString())}/code`,
      code
    );
  }

  /**
   * Publishes code to a programmable card.
   */
  async uploadPublishedCode(cardKey: number, codeId: string, code: string): Promise<CodeResponse> {
    return this.request<CodeResponse>(
      'POST',
      `/za/v1/cards/${encodeURIComponent(cardKey.toString())}/publish`,
      { code, codeId }
    );
  }

  /**
   * Retrieves all programmable cards for the authenticated user.
   */
  async getCards(): Promise<CardResponse> {
    return this.request<CardResponse>('GET', `/za/v1/cards`);
  }

  /**
   * Retrieves environment variables for a programmable card.
   */
  async getEnv(cardKey: number): Promise<EnvResponse> {
    return this.request<EnvResponse>(
      'GET',
      `/za/v1/cards/${encodeURIComponent(cardKey.toString())}/environmentvariables`
    );
  }

  /**
   * Retrieves code for a programmable card.
   */
  async getCode(cardKey: number): Promise<CodeResponse> {
    return this.request<CodeResponse>(
      'GET',
      `/za/v1/cards/${encodeURIComponent(cardKey.toString())}/code`
    );
  }

  /**
   * Retrieves published code for a programmable card.
   */
  async getPublishedCode(cardKey: number): Promise<CodeResponse> {
    return this.request<CodeResponse>(
      'GET',
      `/za/v1/cards/${encodeURIComponent(cardKey.toString())}/publishedcode`
    );
  }

  /**
   * Enables or disables programmable features on a card.
   */
  async toggleCode(cardKey: number, enabled: boolean): Promise<CodeToggle> {
    return this.request<CodeToggle>(
      'POST',
      `/za/v1/cards/${encodeURIComponent(cardKey.toString())}/toggle-programmable-feature`,
      { Enabled: enabled }
    );
  }

  /**
   * Retrieves code execution results for a programmable card.
   */
  async getExecutions(cardKey: number): Promise<ExecutionResult> {
    return this.request<ExecutionResult>(
      'GET',
      `/za/v1/cards/${encodeURIComponent(cardKey.toString())}/code/executions`
    );
  }

  /**
   * Executes code in a simulated transaction context.
   */
  async executeCode(
    code: string,
    transaction: Transaction,
    cardKey: number
  ): Promise<ExecuteResult> {
    return this.request<ExecuteResult>(
      'POST',
      `/za/v1/cards/${encodeURIComponent(cardKey.toString())}/code/execute`,
      {
        simulationcode: code,
        centsAmount: transaction.centsAmount,
        currencyCode: transaction.currencyCode,
        merchantCode: transaction.merchant.category.code,
        merchantName: transaction.merchant.name,
        merchantCity: transaction.merchant.city,
        countryCode: transaction.merchant.country.code,
      }
    );
  }

  /**
   * Retrieves supported currencies for programmable cards.
   */
  async getCurrencies(): Promise<ReferenceResponse> {
    return this.request<ReferenceResponse>('GET', `/za/v1/cards/currencies`);
  }

  /**
   * Retrieves supported countries for programmable cards.
   */
  async getCountries(): Promise<ReferenceResponse> {
    return this.request<ReferenceResponse>('GET', `/za/v1/cards/countries`);
  }

  /**
   * Retrieves supported merchants for programmable cards.
   */
  async getMerchants(): Promise<ReferenceResponse> {
    return this.request<ReferenceResponse>('GET', `/za/v1/cards/merchants`);
  }

  private async refreshAccessToken(): Promise<string> {
    const result = await this.getAccessToken();
    return result.access_token;
  }

  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const token = await this.getToken();
    const endpoint = createEndpoint(this.host, path);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'x-api-key': this.apiKey,
      Accept: 'application/json',
    };

    if (body !== undefined) {
      headers['content-type'] = 'application/json';
    }

    const response = await fetch(endpoint, {
      method,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new InvestecApiError('Card not found', 404, await readErrorBody(response));
      }
      throw await this.createHttpError(response);
    }

    return (await response.json()) as T;
  }

  private async createHttpError(response: Response): Promise<InvestecApiError> {
    const body = await readErrorBody(response);
    const message =
      typeof body === 'string' && body.length > 0
        ? body
        : response.statusText || `Request failed with status ${response.status}`;
    return new InvestecApiError(message, response.status, body);
  }
}

async function readErrorBody(response: Response): Promise<unknown> {
  try {
    const text = await response.text();
    if (!text) {
      return undefined;
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  } catch {
    return undefined;
  }
}

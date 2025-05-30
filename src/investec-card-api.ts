import fetch from 'node-fetch';
import type {
  AuthResponse,
  CardResponse,
  CodeResponse,
  CodeToggle,
  EnvResponse,
  ExecuteResult,
  ExecutionResult,
  ReferenceResponse,
  Transaction,
} from './types';

/**
 * Helper to create a full API endpoint URL from host and path.
 * @param host - The API host URL (e.g. 'https://openapi.investec.com')
 * @param path - The API path (e.g. '/za/v1/cards')
 * @returns The full endpoint URL as a string
 */
const createEndpoint = (host: string, path: string) => new URL(path, host).toString();

/**
 * Main API class for interacting with Investec programmable cards.
 *
 * Example usage:
 * ```typescript
 * import { InvestecCardApi } from './investec-card-api';
 * const api = new InvestecCardApi('clientId', 'clientSecret', 'apiKey');
 * const cards = await api.getCards();
 * ```
 *
 * @remarks
 * - All methods throw on HTTP/network errors.
 * - All methods return typed responses.
 * - You must provide valid Investec API credentials.
 */
export class InvestecCardApi {
  /** The API host URL. */
  host!: string;
  /** The OAuth client ID. */
  clientId!: string;
  /** The OAuth client secret. */
  clientSecret!: string;
  /** The Investec API key. */
  apiKey!: string;
  /** The current OAuth token. */
  token!: string;
  /** The token expiry date. */
  expiresIn!: Date;

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
    host: string = 'https://openapi.investec.com'
  ) {
    this.host = host;
    this.apiKey = apiKey;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.expiresIn = new Date();
  }

  /**
   * Gets a valid OAuth token, refreshing if necessary.
   * @returns The OAuth token string.
   * @throws Error if token cannot be retrieved.
   */
  async getToken(): Promise<string> {
    const now = new Date();
    if (this.token) {
      if (now.getTime() < this.expiresIn.getTime()) {
        return this.token;
      }
    }

    const result = await this.getAccessToken();
    now.setSeconds(now.getSeconds() + result.expires_in);
    this.expiresIn = now;
    return result.access_token;
  }

  /**
   * Requests a new OAuth access token from Investec.
   * @returns The AuthResponse object.
   * @throws Error if authentication fails or the cards scope is missing.
   */
  async getAccessToken(): Promise<AuthResponse> {
    const endpoint = createEndpoint(this.host, `/identity/v2/oauth2/token`);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' + Buffer.from(this.clientId + ':' + this.clientSecret).toString('base64'),
        'x-api-key': this.apiKey,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    // console.log(response.status);
    if (response.status !== 200) {
      throw new Error(response.statusText);
    }
    const result = (await response.json()) as AuthResponse;

    if (!result.scope.includes('cards')) {
      throw new Error('You require the cards scope to use this tool');
    }

    this.token = result.access_token;
    return result;
  }

  /**
   * Uploads environment variables to a programmable card.
   * @param cardKey - The card key
   * @param env - The environment variables object
   * @returns The EnvResponse object
   * @throws Error if parameters are missing or the request fails.
   */
  async uploadEnv(cardKey: number, env: object): Promise<EnvResponse> {
    if (!cardKey || !env) {
      throw new Error('Missing required parameters');
    }
    const endpoint = createEndpoint(
      this.host,
      `/za/v1/cards/${encodeURIComponent(cardKey.toString())}/environmentvariables`
    );
    const token = this.token || (await this.getToken());
    return fetchPost<EnvResponse>(endpoint, token, env);
  }

  /**
   * Uploads code to a programmable card.
   * @param cardKey - The card key
   * @param code - The code object
   * @returns The CodeResponse object
   * @throws Error if parameters are missing or the request fails.
   */
  async uploadCode(cardKey: number, code: object): Promise<CodeResponse> {
    if (!cardKey || !code) {
      throw new Error('Missing required parameters');
    }
    const endpoint = createEndpoint(
      this.host,
      `/za/v1/cards/${encodeURIComponent(cardKey.toString())}/code`
    );
    const token = this.token || (await this.getToken());
    return fetchPost<CodeResponse>(endpoint, token, code);
  }

  /**
   * Publishes code to a programmable card.
   * @param cardKey - The card key
   * @param codeId - The code ID
   * @param code - The code string
   * @returns The CodeResponse object
   * @throws Error if parameters are missing or the request fails.
   */
  async uploadPublishedCode(cardKey: number, codeId: string, code: string): Promise<CodeResponse> {
    if (!cardKey || !codeId || !code) {
      throw new Error('Missing required parameters');
    }
    const raw = { code: code, codeId: codeId };
    const endpoint = createEndpoint(
      this.host,
      `/za/v1/cards/${encodeURIComponent(cardKey.toString())}/publish`
    );
    const token = this.token || (await this.getToken());
    return fetchPost<CodeResponse>(endpoint, token, raw);
  }

  /**
   * Retrieves all programmable cards for the authenticated user.
   * @returns The CardResponse object
   * @throws Error if the request fails.
   */
  async getCards(): Promise<CardResponse> {
    const endpoint = createEndpoint(this.host, `/za/v1/cards`);
    const token = this.token || (await this.getToken());
    return fetchGet<CardResponse>(endpoint, token);
  }

  /**
   * Retrieves environment variables for a programmable card.
   * @param cardKey - The card key
   * @returns The EnvResponse object
   * @throws Error if parameters are missing or the request fails.
   */
  async getEnv(cardKey: number): Promise<EnvResponse> {
    if (!cardKey) {
      throw new Error('Missing required parameters');
    }
    const endpoint = createEndpoint(
      this.host,
      `/za/v1/cards/${encodeURIComponent(cardKey.toString())}/environmentvariables`
    );
    const token = this.token || (await this.getToken());
    return fetchGet<EnvResponse>(endpoint, token);
  }

  /**
   * Retrieves code for a programmable card.
   * @param cardKey - The card key
   * @returns The CodeResponse object
   * @throws Error if parameters are missing or the request fails.
   */
  async getCode(cardKey: number): Promise<CodeResponse> {
    if (!cardKey) {
      throw new Error('Missing required parameters');
    }
    const endpoint = createEndpoint(
      this.host,
      `/za/v1/cards/${encodeURIComponent(cardKey.toString())}/code`
    );
    const token = this.token || (await this.getToken());
    return fetchGet<CodeResponse>(endpoint, token);
  }

  /**
   * Retrieves published code for a programmable card.
   * @param cardKey - The card key
   * @returns The CodeResponse object
   * @throws Error if parameters are missing or the request fails.
   */
  async getPublishedCode(cardKey: number): Promise<CodeResponse> {
    if (!cardKey) {
      throw new Error('Missing required parameters');
    }
    const endpoint = createEndpoint(
      this.host,
      `/za/v1/cards/${encodeURIComponent(cardKey.toString())}/publishedcode`
    );
    const token = this.token || (await this.getToken());
    return fetchGet<CodeResponse>(endpoint, token);
  }

  /**
   * Enables or disables programmable features on a card.
   * @param cardKey - The card key
   * @param enabled - Whether to enable the feature
   * @returns The CodeToggle object
   * @throws Error if parameters are missing or the request fails.
   */
  async toggleCode(cardKey: number, enabled: boolean): Promise<CodeToggle> {
    if (!cardKey || enabled === undefined) {
      throw new Error('Missing required parameters');
    }
    const endpoint = createEndpoint(
      this.host,
      `/za/v1/cards/${encodeURIComponent(cardKey.toString())}/toggle-programmable-feature`
    );
    const token = this.token || (await this.getToken());
    return fetchPost<CodeToggle>(endpoint, token, {
      Enabled: enabled,
    });
  }

  /**
   * Retrieves code execution results for a programmable card.
   * @param cardKey - The card key
   * @returns The ExecutionResult object
   * @throws Error if parameters are missing or the request fails.
   */
  async getExecutions(cardKey: number): Promise<ExecutionResult> {
    if (!cardKey) {
      throw new Error('Missing required parameters');
    }
    const endpoint = createEndpoint(
      this.host,
      `/za/v1/cards/${encodeURIComponent(cardKey.toString())}/code/executions`
    );
    const token = this.token || (await this.getToken());
    return fetchGet<ExecutionResult>(endpoint, token);
  }

  /**
   * Executes code in a simulated transaction context.
   * @param code - The code string
   * @param transaction - The transaction object
   * @param cardKey - The card key
   * @returns The ExecuteResult object
   * @throws Error if parameters are missing or the request fails.
   */
  async executeCode(
    code: string,
    transaction: Transaction,
    cardKey: number
  ): Promise<ExecuteResult> {
    if (!code || !cardKey) {
      throw new Error('Missing required parameters');
    }
    const raw = {
      simulationcode: code,
      centsAmount: transaction.centsAmount,
      currencyCode: transaction.currencyCode,
      merchantCode: transaction.merchant.category.code,
      merchantName: transaction.merchant.name,
      merchantCity: transaction.merchant.city,
      countryCode: transaction.merchant.country.code,
    };
    const endpoint = createEndpoint(
      this.host,
      `/za/v1/cards/${encodeURIComponent(cardKey.toString())}/code/execute`
    );
    const token = this.token || (await this.getToken());
    return fetchPost<ExecuteResult>(endpoint, token, raw);
  }

  /**
   * Retrieves supported currencies for programmable cards.
   * @returns The ReferenceResponse object
   * @throws Error if the request fails.
   */
  async getCurrencies(): Promise<ReferenceResponse> {
    const endpoint = createEndpoint(this.host, `/za/v1/cards/currencies`);
    const token = this.token || (await this.getToken());
    return fetchGet<ReferenceResponse>(endpoint, token);
  }

  /**
   * Retrieves supported countries for programmable cards.
   * @returns The ReferenceResponse object
   * @throws Error if the request fails.
   */
  async getCountries(): Promise<ReferenceResponse> {
    const endpoint = createEndpoint(this.host, `/za/v1/cards/countries`);
    const token = this.token || (await this.getToken());
    return fetchGet<ReferenceResponse>(endpoint, token);
  }

  /**
   * Retrieves supported merchants for programmable cards.
   * @returns The ReferenceResponse object
   * @throws Error if the request fails.
   */
  async getMerchants(): Promise<ReferenceResponse> {
    const endpoint = createEndpoint(this.host, `/za/v1/cards/merchants`);
    const token = this.token || (await this.getToken());
    return fetchGet<ReferenceResponse>(endpoint, token);
  }
}

/**
 * Helper function to perform a GET request with authentication.
 * @param endpoint - The API endpoint URL
 * @param token - The OAuth token
 * @returns The parsed JSON response
 * @throws Error if the request fails or the card is not found.
 */
async function fetchGet<T>(endpoint: string, token: string) {
  const response = await fetch(endpoint, {
    method: 'GET',
    signal: AbortSignal.timeout(30000),
    headers: {
      Authorization: 'Bearer ' + token,
      'content-type': 'application/json',
    },
  });
  if (response.status !== 200) {
    if (response.status === 404) {
      throw new Error('Card not found');
    }
    throw new Error(response.statusText);
  }
  return (await response.json()) as T;
}

/**
 * Helper function to perform a POST request with authentication and JSON body.
 * @param endpoint - The API endpoint URL
 * @param token - The OAuth token
 * @param body - The request body object
 * @returns The parsed JSON response
 * @throws Error if the request fails or the card is not found.
 */
async function fetchPost<T>(endpoint: string, token: string, body: object) {
  const response = await fetch(endpoint, {
    method: 'POST',
    signal: AbortSignal.timeout(30000),
    headers: {
      Authorization: 'Bearer ' + token,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (response.status !== 200) {
    if (response.status === 404) {
      throw new Error('Card not found');
    }
    throw new Error(response.statusText);
  }
  return (await response.json()) as T;
}

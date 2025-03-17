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
} from './index';

const createEndpoint = (host: string, path: string) =>
  new URL(path, host).toString();

export class InvestecCardApi {
  host!: string;
  clientId!: string;
  clientSecret!: string;
  apiKey!: string;
  token!: string;
  expiresIn!: Date;

  constructor(
    clientId: string,
    clientSecret: string,
    apiKey: string,
    host: string = 'https://openapi.investec.com',
  ) {
    this.host = host;
    this.apiKey = apiKey;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.expiresIn = new Date();
  }

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

  async getAccessToken(): Promise<AuthResponse> {
    const endpoint = createEndpoint(this.host, `/identity/v2/oauth2/token`);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(this.clientId + ':' + this.clientSecret).toString(
            'base64',
          ),
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

  async uploadEnv(cardKey: number, env: object): Promise<EnvResponse> {
    if (!cardKey || !env) {
      throw new Error('Missing required parameters');
    }
    const endpoint = createEndpoint(
      this.host,
      `/za/v1/cards/${encodeURIComponent(
        cardKey.toString(),
      )}/environmentvariables`,
    );
    const token = this.token || (await this.getToken());
    return fetchPost<EnvResponse>(endpoint, token, env);
  }

  async uploadCode(cardKey: number, code: object): Promise<CodeResponse> {
    if (!cardKey || !code) {
      throw new Error('Missing required parameters');
    }
    const endpoint = createEndpoint(
      this.host,
      `/za/v1/cards/${encodeURIComponent(cardKey.toString())}/code`,
    );
    const token = this.token || (await this.getToken());
    return fetchPost<CodeResponse>(endpoint, token, code);
  }

  async uploadPublishedCode(
    cardKey: number,
    codeId: string,
    code: string,
  ): Promise<CodeResponse> {
    if (!cardKey || !codeId || !code) {
      throw new Error('Missing required parameters');
    }
    const raw = { code: code, codeId: codeId };
    const endpoint = createEndpoint(
      this.host,
      `/za/v1/cards/${encodeURIComponent(cardKey.toString())}/publish`,
    );
    const token = this.token || (await this.getToken());
    return fetchPost<CodeResponse>(endpoint, token, raw);
  }

  async getCards(): Promise<CardResponse> {
    const endpoint = createEndpoint(this.host, `/za/v1/cards`);
    const token = this.token || (await this.getToken());
    return fetchGet<CardResponse>(endpoint, token);
  }

  async getEnv(cardKey: number): Promise<EnvResponse> {
    if (!cardKey) {
      throw new Error('Missing required parameters');
    }
    const endpoint = createEndpoint(
      this.host,
      `/za/v1/cards/${encodeURIComponent(
        cardKey.toString(),
      )}/environmentvariables`,
    );
    const token = this.token || (await this.getToken());
    return fetchGet<EnvResponse>(endpoint, token);
  }

  async getCode(cardKey: number): Promise<CodeResponse> {
    if (!cardKey) {
      throw new Error('Missing required parameters');
    }
    const endpoint = createEndpoint(
      this.host,
      `/za/v1/cards/${encodeURIComponent(cardKey.toString())}/code`,
    );
    const token = this.token || (await this.getToken());
    return fetchGet<CodeResponse>(endpoint, token);
  }

  async getPublishedCode(cardKey: number): Promise<CodeResponse> {
    if (!cardKey) {
      throw new Error('Missing required parameters');
    }
    const endpoint = createEndpoint(
      this.host,
      `/za/v1/cards/${encodeURIComponent(cardKey.toString())}/publishedcode`,
    );
    const token = this.token || (await this.getToken());
    return fetchGet<CodeResponse>(endpoint, token);
  }

  async toggleCode(cardKey: number, enabled: boolean): Promise<CodeToggle> {
    if (!cardKey || enabled === undefined) {
      throw new Error('Missing required parameters');
    }
    const endpoint = createEndpoint(
      this.host,
      `/za/v1/cards/${encodeURIComponent(
        cardKey.toString(),
      )}/toggle-programmable-feature`,
    );
    const token = this.token || (await this.getToken());
    return fetchPost<CodeToggle>(endpoint, token, {
      Enabled: enabled,
    });
  }

  async getExecutions(cardKey: number): Promise<ExecutionResult> {
    if (!cardKey) {
      throw new Error('Missing required parameters');
    }
    const endpoint = createEndpoint(
      this.host,
      `/za/v1/cards/${encodeURIComponent(cardKey.toString())}/code/executions`,
    );
    const token = this.token || (await this.getToken());
    return fetchGet<ExecutionResult>(endpoint, token);
  }

  async executeCode(
    code: string,
    transaction: Transaction,
    cardKey: number,
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
      `/za/v1/cards/${encodeURIComponent(cardKey.toString())}/code/execute`,
    );
    const token = this.token || (await this.getToken());
    return fetchPost<ExecuteResult>(endpoint, token, raw);
  }

  async getCurrencies(): Promise<ReferenceResponse> {
    const endpoint = createEndpoint(this.host, `/za/v1/cards/currencies`);
    const token = this.token || (await this.getToken());
    return fetchGet<ReferenceResponse>(endpoint, token);
  }

  async getCountries(): Promise<ReferenceResponse> {
    const endpoint = createEndpoint(this.host, `/za/v1/cards/countries`);
    const token = this.token || (await this.getToken());
    return fetchGet<ReferenceResponse>(endpoint, token);
  }

  async getMerchants(): Promise<ReferenceResponse> {
    const endpoint = createEndpoint(this.host, `/za/v1/cards/merchants`);
    const token = this.token || (await this.getToken());
    return fetchGet<ReferenceResponse>(endpoint, token);
  }
}

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

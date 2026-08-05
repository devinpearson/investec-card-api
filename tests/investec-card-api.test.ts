import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { InvestecCardApi } from '../src/investec-card-api';
import { InvestecApiError } from '../src/errors';
import type {
  AuthResponse,
  CardResponse,
  CodeResponse,
  EnvResponse,
  CodeToggle,
  ExecutionResult,
  ExecuteResult,
  ReferenceResponse,
  Transaction,
} from '../src/types';
import { CountryCode } from '../src/types';

const mockFetch = vi.fn();
const HOST = 'https://api.example.com';

const mockToken: AuthResponse = {
  access_token: 'token',
  token_type: 'Bearer',
  expires_in: 3600,
  scope: 'cards accounts',
};

const mockCardResponse: CardResponse = {
  data: {
    cards: [
      {
        CardKey: 1,
        CardNumber: '123',
        IsProgrammable: true,
        status: 'active',
        CardTypeCode: 'VISA',
        AccountNumber: '456',
        AccountId: '789',
      },
    ],
  },
};

const mockCodeResponse: CodeResponse = {
  data: {
    result: {
      codeId: 'id',
      code: 'return true;',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-02',
      error: null,
    },
  },
};

const mockEnvResponse: EnvResponse = {
  data: {
    result: {
      variables: { FOO: 'BAR' },
      createdAt: '2024-01-01',
      updatedAt: '2024-01-02',
      error: null,
    },
  },
};

const mockCodeToggle: CodeToggle = {
  data: { result: { Enabled: true } },
};

const mockExecutionResult: ExecutionResult = {
  data: {
    result: {
      executionItems: [
        {
          executionId: 'exec-1',
          rootCodeFunctionId: 'fn-1',
          sandbox: true,
          type: 'before_transaction',
          authorizationApproved: true,
          logs: [{ level: 'info', message: 'ok' }],
          smsCount: 0,
          emailCount: 0,
          pushNotificationCount: 0,
          createdAt: '',
          startedAt: '',
          completedAt: '',
          updatedAt: '',
        },
      ],
      error: null,
    },
  },
};

const mockExecuteResult: ExecuteResult = {
  data: { result: mockExecutionResult.data.result.executionItems },
};

const mockReferenceResponse: ReferenceResponse = {
  data: { result: [{ Code: 'ZAR', Name: 'Rand' }] },
};

const sampleTransaction: Transaction = {
  accountNumber: '123',
  dateTime: '2024-01-01T00:00:00Z',
  centsAmount: 100,
  currencyCode: 'ZAR',
  type: 'purchase',
  reference: 'ref',
  card: { id: '1' },
  merchant: {
    category: { key: '1', code: '5411', name: 'Grocery' },
    name: 'Test Store',
    city: 'Cape Town',
    country: { code: CountryCode.ZA, alpha3: 'ZAF', name: 'South Africa' },
  },
};

function jsonResponse(data: unknown, status = 200, statusText = 'OK') {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

function textResponse(body: string, status: number, statusText: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => {
      throw new Error('not json');
    },
    text: async () => body,
  };
}

function emptyResponse(status: number, statusText: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => ({}),
    text: async () => '',
  };
}

function lastCall() {
  const call = mockFetch.mock.calls.at(-1);
  if (!call) {
    throw new Error('fetch was not called');
  }
  return {
    url: String(call[0]),
    init: call[1] as RequestInit,
  };
}

function authThen(...responses: unknown[]) {
  mockFetch.mockResolvedValueOnce(jsonResponse(mockToken));
  for (const response of responses) {
    mockFetch.mockResolvedValueOnce(response);
  }
}

describe('InvestecApiError', () => {
  test('exposes status and body', () => {
    const error = new InvestecApiError('boom', 502, { detail: 'bad gateway' });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('InvestecApiError');
    expect(error.message).toBe('boom');
    expect(error.status).toBe(502);
    expect(error.body).toEqual({ detail: 'bad gateway' });
  });
});

describe('InvestecCardApi', () => {
  let api: InvestecCardApi;

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    api = new InvestecCardApi('clientId', 'clientSecret', 'apiKey', HOST);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    test('defaults host to Investec production API', async () => {
      const productionApi = new InvestecCardApi('clientId', 'clientSecret', 'apiKey');
      mockFetch.mockResolvedValue(jsonResponse(mockToken));
      await productionApi.getAccessToken();
      expect(String(mockFetch.mock.calls[0]?.[0])).toBe(
        'https://openapi.investec.com/identity/v2/oauth2/token'
      );
    });
  });

  describe('authentication', () => {
    test('getAccessToken posts client credentials with Basic auth and api key', async () => {
      mockFetch.mockResolvedValue(jsonResponse(mockToken));
      const token = await api.getAccessToken();

      expect(token).toEqual(mockToken);
      const { url, init } = lastCall();
      expect(url).toBe(`${HOST}/identity/v2/oauth2/token`);
      expect(init.method).toBe('POST');
      expect(init.body).toBe('grant_type=client_credentials');
      expect(init.headers).toMatchObject({
        Authorization: `Basic ${Buffer.from('clientId:clientSecret').toString('base64')}`,
        'x-api-key': 'apiKey',
        'content-type': 'application/x-www-form-urlencoded',
      });
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    test('getAccessToken throws InvestecApiError with parsed JSON body', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ error: 'invalid_client' }, 401, 'Unauthorized'));
      const error = await api.getAccessToken().catch((err: unknown) => err);

      expect(error).toBeInstanceOf(InvestecApiError);
      expect(error).toMatchObject({
        status: 401,
        body: { error: 'invalid_client' },
      });
    });

    test('getAccessToken uses plain-text body as message when response is not JSON', async () => {
      mockFetch.mockResolvedValue(textResponse('auth failed', 403, 'Forbidden'));
      await expect(api.getAccessToken()).rejects.toMatchObject({
        name: 'InvestecApiError',
        status: 403,
        message: 'auth failed',
        body: 'auth failed',
      });
    });

    test('getAccessToken falls back to statusText when body is empty', async () => {
      mockFetch.mockResolvedValue(emptyResponse(500, 'Internal Server Error'));
      await expect(api.getAccessToken()).rejects.toMatchObject({
        name: 'InvestecApiError',
        status: 500,
        message: 'Internal Server Error',
      });
    });

    test('getAccessToken ignores unreadable error bodies', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: async () => ({}),
        text: async () => {
          throw new Error('stream failed');
        },
      });
      await expect(api.getAccessToken()).rejects.toMatchObject({
        name: 'InvestecApiError',
        status: 502,
        message: 'Bad Gateway',
        body: undefined,
      });
    });

    test('getAccessToken uses generic message when statusText and body are empty', async () => {
      mockFetch.mockResolvedValue(emptyResponse(503, ''));
      await expect(api.getAccessToken()).rejects.toMatchObject({
        name: 'InvestecApiError',
        status: 503,
        message: 'Request failed with status 503',
      });
    });

    test('getAccessToken throws when cards scope is missing', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ ...mockToken, scope: 'accounts' }));
      await expect(api.getAccessToken()).rejects.toThrow('You require the cards scope');
    });

    test('getToken returns access token string', async () => {
      mockFetch.mockResolvedValue(jsonResponse(mockToken));
      await expect(api.getToken()).resolves.toBe('token');
    });
  });

  describe('token lifecycle', () => {
    test('reuses a valid token without refreshing', async () => {
      authThen(jsonResponse(mockCardResponse), jsonResponse(mockCardResponse));

      await api.getCards();
      await api.getCards();

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(String(mockFetch.mock.calls[0]?.[0])).toContain('/identity/v2/oauth2/token');
      expect(String(mockFetch.mock.calls[1]?.[0])).toContain('/za/v1/cards');
      expect(String(mockFetch.mock.calls[2]?.[0])).toContain('/za/v1/cards');
    });

    test('refreshes when token is fully expired', async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse({ ...mockToken, expires_in: 0 }))
        .mockResolvedValueOnce(jsonResponse(mockCardResponse))
        .mockResolvedValueOnce(jsonResponse(mockToken))
        .mockResolvedValueOnce(jsonResponse(mockCardResponse));

      await api.getCards();
      await api.getCards();

      const tokenCalls = mockFetch.mock.calls.filter(([url]) =>
        String(url).includes('/identity/v2/oauth2/token')
      );
      expect(tokenCalls).toHaveLength(2);
    });

    test('refreshes within the skew window before expiry', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

      mockFetch
        .mockResolvedValueOnce(jsonResponse({ ...mockToken, expires_in: 30 }))
        .mockResolvedValueOnce(jsonResponse(mockCardResponse))
        .mockResolvedValueOnce(jsonResponse(mockToken))
        .mockResolvedValueOnce(jsonResponse(mockCardResponse));

      await api.getCards();
      await api.getCards();

      const tokenCalls = mockFetch.mock.calls.filter(([url]) =>
        String(url).includes('/identity/v2/oauth2/token')
      );
      expect(tokenCalls).toHaveLength(2);
    });

    test('shares a single in-flight token refresh across concurrent callers', async () => {
      let resolveToken!: (value: unknown) => void;
      const tokenPromise = new Promise((resolve) => {
        resolveToken = resolve;
      });

      mockFetch.mockImplementation((url: string) => {
        if (String(url).includes('/identity/v2/oauth2/token')) {
          return tokenPromise.then(() => jsonResponse(mockToken));
        }
        return Promise.resolve(jsonResponse(mockCardResponse));
      });

      const pending = Promise.all([api.getCards(), api.getCards(), api.getCurrencies()]);
      resolveToken(undefined);
      await pending;

      const tokenCalls = mockFetch.mock.calls.filter(([url]) =>
        String(url).includes('/identity/v2/oauth2/token')
      );
      expect(tokenCalls).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    test('allows a new refresh after a failed refresh attempt', async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse({ error: 'unavailable' }, 503, 'Service Unavailable'))
        .mockResolvedValueOnce(jsonResponse(mockToken))
        .mockResolvedValueOnce(jsonResponse(mockCardResponse));

      await expect(api.getCards()).rejects.toBeInstanceOf(InvestecApiError);
      await expect(api.getCards()).resolves.toEqual(mockCardResponse);
    });
  });

  describe('HTTP request behaviour', () => {
    test('GET requests send bearer token, api key, accept header, and timeout', async () => {
      authThen(jsonResponse(mockCardResponse));
      await api.getCards();

      const { init } = lastCall();
      expect(init.method).toBe('GET');
      expect(init.body).toBeUndefined();
      expect(init.headers).toEqual({
        Authorization: 'Bearer token',
        'x-api-key': 'apiKey',
        Accept: 'application/json',
      });
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    test('POST requests send JSON body and content-type', async () => {
      authThen(jsonResponse(mockEnvResponse));
      await api.uploadEnv(42, { FOO: 'BAR' });

      const { url, init } = lastCall();
      expect(url).toBe(`${HOST}/za/v1/cards/42/environmentvariables`);
      expect(init.method).toBe('POST');
      expect(init.headers).toMatchObject({
        Authorization: 'Bearer token',
        'x-api-key': 'apiKey',
        Accept: 'application/json',
        'content-type': 'application/json',
      });
      expect(JSON.parse(String(init.body))).toEqual({ FOO: 'BAR' });
    });

    test('encodes card keys in request paths', async () => {
      authThen(jsonResponse(mockCodeResponse));
      await api.getCode(1001);

      expect(lastCall().url).toBe(`${HOST}/za/v1/cards/1001/code`);
    });

    test('throws Card not found on 404 with response body preserved', async () => {
      authThen(jsonResponse({ message: 'missing' }, 404, 'Not Found'));

      await expect(api.getCode(1)).rejects.toMatchObject({
        name: 'InvestecApiError',
        status: 404,
        message: 'Card not found',
        body: { message: 'missing' },
      });
    });

    test('throws InvestecApiError for non-404 API failures', async () => {
      authThen(jsonResponse({ error: 'rate_limited' }, 429, 'Too Many Requests'));

      await expect(api.getCards()).rejects.toMatchObject({
        name: 'InvestecApiError',
        status: 429,
        body: { error: 'rate_limited' },
      });
    });
  });

  describe('card endpoints', () => {
    test('getCards returns cards', async () => {
      authThen(jsonResponse(mockCardResponse));
      await expect(api.getCards()).resolves.toEqual(mockCardResponse);
    });

    test('getEnv returns environment variables', async () => {
      authThen(jsonResponse(mockEnvResponse));
      const res = await api.getEnv(1);
      expect(res.data.result.variables).toEqual({ FOO: 'BAR' });
      expect(lastCall().url).toBe(`${HOST}/za/v1/cards/1/environmentvariables`);
    });

    test('uploadEnv posts variables to the environment endpoint', async () => {
      authThen(jsonResponse(mockEnvResponse));
      const res = await api.uploadEnv(1, { FOO: 'BAR' });
      expect(res.data.result.variables.FOO).toBe('BAR');
    });

    test('getCode returns code', async () => {
      authThen(jsonResponse(mockCodeResponse));
      const res = await api.getCode(1);
      expect(res.data.result.codeId).toBe('id');
      expect(lastCall().url).toBe(`${HOST}/za/v1/cards/1/code`);
    });

    test('uploadCode posts code payload', async () => {
      authThen(jsonResponse(mockCodeResponse));
      const res = await api.uploadCode(1, { code: 'return true;' });
      expect(res.data.result.codeId).toBe('id');
      expect(JSON.parse(String(lastCall().init.body))).toEqual({ code: 'return true;' });
    });

    test('getPublishedCode hits the publishedcode endpoint', async () => {
      authThen(jsonResponse(mockCodeResponse));
      await api.getPublishedCode(9);
      expect(lastCall().url).toBe(`${HOST}/za/v1/cards/9/publishedcode`);
    });

    test('uploadPublishedCode posts code and codeId to publish', async () => {
      authThen(jsonResponse(mockCodeResponse));
      await api.uploadPublishedCode(9, 'code-id', 'return false;');

      const { url, init } = lastCall();
      expect(url).toBe(`${HOST}/za/v1/cards/9/publish`);
      expect(JSON.parse(String(init.body))).toEqual({
        code: 'return false;',
        codeId: 'code-id',
      });
    });

    test('toggleCode posts Enabled true and false', async () => {
      authThen(
        jsonResponse(mockCodeToggle),
        jsonResponse({ data: { result: { Enabled: false } } })
      );

      await expect(api.toggleCode(1, true)).resolves.toEqual(mockCodeToggle);
      expect(JSON.parse(String(lastCall().init.body))).toEqual({ Enabled: true });

      await expect(api.toggleCode(1, false)).resolves.toEqual({
        data: { result: { Enabled: false } },
      });
      expect(JSON.parse(String(lastCall().init.body))).toEqual({ Enabled: false });
      expect(lastCall().url).toBe(`${HOST}/za/v1/cards/1/toggle-programmable-feature`);
    });

    test('getExecutions returns execution history', async () => {
      authThen(jsonResponse(mockExecutionResult));
      const res = await api.getExecutions(1);
      expect(res.data.result.executionItems[0]?.executionId).toBe('exec-1');
      expect(lastCall().url).toBe(`${HOST}/za/v1/cards/1/code/executions`);
    });

    test('executeCode maps transaction fields into the simulation payload', async () => {
      authThen(jsonResponse(mockExecuteResult));
      const res = await api.executeCode('return true;', sampleTransaction, 7);

      expect(res).toEqual(mockExecuteResult);
      expect(lastCall().url).toBe(`${HOST}/za/v1/cards/7/code/execute`);
      expect(JSON.parse(String(lastCall().init.body))).toEqual({
        simulationcode: 'return true;',
        centsAmount: 100,
        currencyCode: 'ZAR',
        merchantCode: '5411',
        merchantName: 'Test Store',
        merchantCity: 'Cape Town',
        countryCode: CountryCode.ZA,
      });
    });
  });

  describe('reference endpoints', () => {
    test.each([
      ['getCurrencies', '/za/v1/cards/currencies'] as const,
      ['getCountries', '/za/v1/cards/countries'] as const,
      ['getMerchants', '/za/v1/cards/merchants'] as const,
    ])('%s hits %s', async (method, path) => {
      authThen(jsonResponse(mockReferenceResponse));
      const res = await api[method]();
      expect(res.data.result[0]?.Code).toBe('ZAR');
      expect(lastCall().url).toBe(`${HOST}${path}`);
    });
  });
});

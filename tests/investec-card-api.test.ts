import { describe, test, expect, beforeEach, vi } from 'vitest';
import { InvestecCardApi } from '../src/investec-card-api';
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
import fetch from 'node-fetch';

vi.mock('node-fetch', async () => {
  return {
    default: vi.fn(),
  };
});

const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;

let api: InvestecCardApi;

const mockToken: AuthResponse = {
  access_token: 'token',
  token_type: 'Bearer',
  expires_in: 3600,
  scope: 'cards',
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
  data: { result: { codeId: 'id', code: 'code', createdAt: '', updatedAt: '', error: null } },
};

const mockEnvResponse: EnvResponse = {
  data: { result: { variables: { FOO: 'BAR' }, createdAt: '', updatedAt: '', error: null } },
};

const mockCodeToggle: CodeToggle = {
  data: { result: { Enabled: true } },
};

const mockExecutionResult: ExecutionResult = {
  data: { result: { executionItems: [], error: null } },
};

const mockExecuteResult: ExecuteResult = {
  data: { result: [] },
};

const mockReferenceResponse: ReferenceResponse = {
  data: { result: [{ Code: 'ZAR', Name: 'Rand' }] },
};

describe('InvestecCardApi', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    api = new InvestecCardApi('clientId', 'clientSecret', 'apiKey', 'https://api.example.com');
  });

  test('getAccessToken returns token', async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      status: 200,
      json: async () => mockToken,
    });
    const token = await api.getAccessToken();
    expect(token.access_token).toBe('token');
  });

  test('getAccessToken throws on error', async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ status: 400, statusText: 'Bad Request' });
    await expect(api.getAccessToken()).rejects.toThrow('Bad Request');
  });

  test('getCards returns cards', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce({ status: 200, json: async () => mockToken }) // token
      .mockResolvedValueOnce({ status: 200, json: async () => mockCardResponse }); // cards
    const cards = await api.getCards();
    expect(cards.data.cards[0].CardKey).toBe(1);
  });

  test('uploadEnv throws on missing params', async () => {
    // @ts-expect-error
    await expect(api.uploadEnv()).rejects.toThrow('Missing required parameters');
  });

  test('uploadEnv returns EnvResponse', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce({ status: 200, json: async () => mockToken })
      .mockResolvedValueOnce({ status: 200, json: async () => mockEnvResponse });
    const res = await api.uploadEnv(1, { FOO: 'BAR' });
    expect(res.data.result.variables.FOO).toBe('BAR');
  });

  test('uploadCode returns CodeResponse', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce({ status: 200, json: async () => mockToken })
      .mockResolvedValueOnce({ status: 200, json: async () => mockCodeResponse });
    const res = await api.uploadCode(1, { code: 'test' });
    expect(res.data.result.codeId).toBe('id');
  });

  test('toggleCode returns CodeToggle', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce({ status: 200, json: async () => mockToken })
      .mockResolvedValueOnce({ status: 200, json: async () => mockCodeToggle });
    const res = await api.toggleCode(1, true);
    expect(res.data.result.Enabled).toBe(true);
  });

  test('getExecutions returns ExecutionResult', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce({ status: 200, json: async () => mockToken })
      .mockResolvedValueOnce({ status: 200, json: async () => mockExecutionResult });
    const res = await api.getExecutions(1);
    expect(res.data.result.executionItems).toBeDefined();
  });

  test('getCurrencies returns ReferenceResponse', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce({ status: 200, json: async () => mockToken })
      .mockResolvedValueOnce({ status: 200, json: async () => mockReferenceResponse });
    const res = await api.getCurrencies();
    expect(res.data.result[0].Code).toBe('ZAR');
  });

  test('executeCode returns ExecuteResult', async () => {
    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce({ status: 200, json: async () => mockToken })
      .mockResolvedValueOnce({ status: 200, json: async () => mockExecuteResult });
    const transaction: Transaction = {
      accountNumber: '123',
      dateTime: '',
      centsAmount: 100,
      currencyCode: 'ZAR',
      type: '',
      reference: '',
      card: { id: '1' },
      merchant: {
        category: { key: '', code: '123', name: '' },
        name: 'Test',
        city: 'City',
        country: { code: CountryCode.ZA, alpha3: 'ZAF', name: 'South Africa' },
      },
    };
    const res = await api.executeCode('code', transaction, 1);
    expect(res.data.result).toBeDefined();
  });

  test('getCode throws on missing cardKey', async () => {
    // @ts-expect-error
    await expect(api.getCode()).rejects.toThrow('Missing required parameters');
  });
});

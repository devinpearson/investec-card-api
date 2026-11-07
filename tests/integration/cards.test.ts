import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  CountryCode,
  InvestecApiError,
  type InvestecCardApi,
  type Transaction,
} from '../../src';
import {
  createRealClient,
  createSimClient,
  createTestCard,
  deleteTestCard,
  simUrl,
} from './simulator';

const approveCode = `const beforeTransaction = async (authorization) => {
  console.log('it-approve');
  return true;
};`;

const transaction: Transaction = {
  accountNumber: '10012420003',
  dateTime: new Date().toISOString(),
  centsAmount: 10_000,
  currencyCode: 'zar',
  type: 'card',
  reference: 'it-execute',
  card: { id: '1' },
  merchant: {
    category: { key: 'it', code: '5462', name: 'Bakeries' },
    name: 'The Coders Bakery',
    city: 'Cape Town',
    country: { code: CountryCode.ZA, alpha3: 'ZAF', name: 'South Africa' },
  },
};

describe.skipIf(!simUrl)('programmable-banking-sim', () => {
  let api: InvestecCardApi;
  let cardKey: number;

  beforeAll(async () => {
    api = createSimClient();
    cardKey = await createTestCard();
  });

  afterAll(async () => {
    if (cardKey) {
      await deleteTestCard(cardKey);
    }
  });

  describe('authentication', () => {
    test('rejects a wrong client secret with InvestecApiError 401', async () => {
      const err = await createRealClient({ clientSecret: 'wrong' })
        .getAccessToken()
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(InvestecApiError);
      expect((err as InvestecApiError).status).toBe(401);
    });

    test('rejects a wrong API key with InvestecApiError 401', async () => {
      await expect(
        createRealClient({ apiKey: 'wrong' }).getAccessToken(),
      ).rejects.toMatchObject({ name: 'InvestecApiError', status: 401 });
    });

    // Simulator divergence: client-credentials tokens carry scope "accounts",
    // never "cards", so the real client refuses them. Flip to `test` once the
    // simulator grants the cards scope.
    test.fails('accepts a client-credentials token from the simulator', async () => {
      const auth = await createRealClient().getAccessToken();
      expect(auth.scope).toContain('cards');
    });
  });

  describe('cards', () => {
    test('lists the test card with the documented fields', async () => {
      const { cards } = (await api.getCards()).data;
      const card = cards.find((c) => String(c.CardKey) === String(cardKey));
      expect(card).toEqual(
        expect.objectContaining({
          CardNumber: expect.any(String),
          IsProgrammable: expect.any(Boolean),
          status: expect.any(String),
          CardTypeCode: expect.any(String),
          AccountNumber: expect.any(String),
          AccountId: expect.any(String),
        }),
      );
    });

    test('toggleCode enables programmable features on the card', async () => {
      await api.toggleCode(cardKey, true);
      const { cards } = (await api.getCards()).data;
      const card = cards.find((c) => String(c.CardKey) === String(cardKey));
      expect(card?.IsProgrammable).toBe(true);
    });

    test('maps an unknown card to InvestecApiError 404', async () => {
      const err = await api.getCode(1).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(InvestecApiError);
      expect(err).toMatchObject({ status: 404, message: 'Card not found' });
    });
  });

  describe('environment variables', () => {
    test('uploadEnv replaces the variables and getEnv reads them back', async () => {
      const uploaded = await api.uploadEnv(cardKey, { IT_FLAG: 'on' });
      expect(uploaded.data.result.variables).toEqual({ IT_FLAG: 'on' });

      const read = await api.getEnv(cardKey);
      expect(read.data.result.variables).toEqual({ IT_FLAG: 'on' });
    });
  });

  describe('code', () => {
    test('executeCode runs code against a simulated transaction', async () => {
      const { result } = (
        await api.executeCode(approveCode, transaction, cardKey)
      ).data;
      expect(result.length).toBeGreaterThan(0);
      for (const item of result) {
        expect(item).toEqual(
          expect.objectContaining({
            executionId: expect.any(String),
            sandbox: true,
            type: expect.any(String),
          }),
        );
      }
    });
  });

  describe('reference data', () => {
    test.each(['getCurrencies', 'getCountries', 'getMerchants'] as const)(
      '%s returns a non-empty list',
      async (method) => {
        const { result } = (await api[method]()).data;
        expect(result.length).toBeGreaterThan(0);
      },
    );
  });

  // Simulator response-shape divergences. Each one fails today; flip it to
  // `test` once programmable-banking-sim matches the real API.
  describe('known simulator divergences', () => {
    test.fails('uploadCode/getCode return the code under data.result', async () => {
      await api.uploadCode(cardKey, { code: approveCode });
      const read = await api.getCode(cardKey);
      expect(read.data.result.code).toBe(approveCode);
    });

    test.fails('uploadPublishedCode posts to /publish', async () => {
      const saved = await api.uploadCode(cardKey, { code: approveCode });
      await api.uploadPublishedCode(
        cardKey,
        saved.data.result?.codeId ?? '',
        approveCode,
      );
      const published = await api.getPublishedCode(cardKey);
      expect(published.data.result.code).toBe(approveCode);
    });

    test.fails('toggleCode returns data.result.Enabled', async () => {
      const res = await api.toggleCode(cardKey, true);
      expect(res.data.result.Enabled).toBe(true);
    });

    test.fails('getExecutions returns data.result.executionItems', async () => {
      await api.executeCode(approveCode, transaction, cardKey);
      const res = await api.getExecutions(cardKey);
      expect(Array.isArray(res.data.result.executionItems)).toBe(true);
    });

    test.fails('reference data uses Code/Name keys', async () => {
      const [first] = (await api.getCurrencies()).data.result;
      expect(first).toEqual(
        expect.objectContaining({
          Code: expect.any(String),
          Name: expect.any(String),
        }),
      );
    });
  });
});

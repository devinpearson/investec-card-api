import { InvestecCardApi } from '../src/index.js';

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. See examples/README.md.`,
    );
  }
  return value;
}

/** The card the example acts on, from INVESTEC_CARD_KEY. */
export function cardKeyFromEnv(): number {
  const raw = requireEnv('INVESTEC_CARD_KEY');
  const cardKey = Number(raw);
  if (!Number.isInteger(cardKey)) {
    throw new Error(`INVESTEC_CARD_KEY must be a number, got "${raw}".`);
  }
  return cardKey;
}

/**
 * Create an API client from environment variables.
 *
 * Required: INVESTEC_CLIENT_ID, INVESTEC_CLIENT_SECRET, INVESTEC_API_KEY
 * Optional: INVESTEC_HOST (defaults to production; use the sandbox URL or
 * programmable-banking-sim while experimenting)
 */
export function createClientFromEnv(): InvestecCardApi {
  return new InvestecCardApi(
    requireEnv('INVESTEC_CLIENT_ID'),
    requireEnv('INVESTEC_CLIENT_SECRET'),
    requireEnv('INVESTEC_API_KEY'),
    process.env.INVESTEC_HOST ?? 'https://openapi.investec.com',
  );
}

/** Sample card code that approves every transaction and logs it. */
export const approveAllCode = `const beforeTransaction = async (authorization) => {
  console.log(authorization);
  return true;
};
`;

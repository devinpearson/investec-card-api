// Example: run code against a simulated transaction (no real card activity)
import { CountryCode, type Transaction } from '../src/index.js';
import {
  approveAllCode,
  cardKeyFromEnv,
  createClientFromEnv,
} from './create-client';

const api = createClientFromEnv();
const cardKey = cardKeyFromEnv();

const transaction: Transaction = {
  accountNumber: '123456789',
  dateTime: new Date().toISOString(),
  centsAmount: 10_000,
  currencyCode: 'zar',
  type: 'card',
  reference: 'simulation',
  card: { id: String(cardKey) },
  merchant: {
    category: { key: 'bakeries', code: '5462', name: 'Bakeries' },
    name: 'The Coders Bakery',
    city: 'Cape Town',
    country: { code: CountryCode.ZA, alpha3: 'ZAF', name: 'South Africa' },
  },
};

try {
  const { result } = (
    await api.executeCode(approveAllCode, transaction, cardKey)
  ).data;
  for (const item of result) {
    console.log(`${item.type}: approved=${item.authorizationApproved}`);
    for (const log of item.logs) {
      console.log(`  [${log.level ?? 'log'}] ${log.message ?? ''}`);
    }
  }
} catch (err) {
  console.error('Error executing code:', err);
  process.exitCode = 1;
}

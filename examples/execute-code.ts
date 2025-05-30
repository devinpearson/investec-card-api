// Example: Execute code in a simulated transaction context
import { InvestecCardApi } from '../src/investec-card-api';
import type { Transaction } from '../src/types';
import { CountryCode } from '../src/types';

async function simulateExecution() {
  const api = new InvestecCardApi('your-client-id', 'your-client-secret', 'your-api-key');
  const cardKey = 123456; // Replace with your card key
  const code = 'return true;';
  const transaction: Transaction = {
    accountNumber: '123456789',
    dateTime: new Date().toISOString(),
    centsAmount: 1000,
    currencyCode: 'ZAR',
    type: 'purchase',
    reference: 'TestRef',
    card: { id: 'card-id' },
    merchant: {
      category: { key: '1', code: '5411', name: 'Grocery Stores' },
      name: 'Test Store',
      city: 'Cape Town',
      country: { code: CountryCode.ZA, alpha3: 'ZAF', name: 'South Africa' },
    },
  };
  try {
    const result = await api.executeCode(code, transaction, cardKey);
    console.log('Execution result:', result);
  } catch (err) {
    console.error('Error executing code:', err);
  }
}

simulateExecution();

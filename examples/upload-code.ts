// Example: Upload code to a programmable card
import { InvestecCardApi } from '../src/investec-card-api';

async function uploadCode() {
  const api = new InvestecCardApi('your-client-id', 'your-client-secret', 'your-api-key');
  const cardKey = 123456; // Replace with your card key
  const code = { code: 'return true;' };
  try {
    const result = await api.uploadCode(cardKey, code);
    console.log('Upload result:', result);
  } catch (err) {
    console.error('Error uploading code:', err);
  }
}

uploadCode();

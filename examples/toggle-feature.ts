// Example: Toggle programmable feature on a card
import { InvestecCardApi } from '../src/investec-card-api';

async function toggleProgrammableFeature() {
  const api = new InvestecCardApi('your-client-id', 'your-client-secret', 'your-api-key');
  const cardKey = 123456; // Replace with your card key
  try {
    const result = await api.toggleCode(cardKey, true); // Enable programmable feature
    console.log('Feature toggled:', result);
  } catch (err) {
    console.error('Error toggling feature:', err);
  }
}

toggleProgrammableFeature();

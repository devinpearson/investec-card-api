// Example: List all programmable cards
import { InvestecCardApi } from '../src/investec-card-api';

async function listCards() {
  const api = new InvestecCardApi('your-client-id', 'your-client-secret', 'your-api-key');
  try {
    const cards = await api.getCards();
    console.log('Cards:', cards.data.cards);
  } catch (err) {
    console.error('Error fetching cards:', err);
  }
}

listCards();

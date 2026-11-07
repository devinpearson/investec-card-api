// Example: list programmable cards
import { createClientFromEnv } from './create-client';

const api = createClientFromEnv();

try {
  const { cards } = (await api.getCards()).data;
  console.table(
    cards.map((c) => ({
      CardKey: c.CardKey,
      CardNumber: c.CardNumber,
      IsProgrammable: c.IsProgrammable,
      status: c.status,
    })),
  );
} catch (err) {
  console.error('Error fetching cards:', err);
  process.exitCode = 1;
}

import { InvestecCardApi } from '../src/index';
import { test, expect } from 'vitest';

const card = new InvestecCardApi('', '', '');

test('get an access token', async () => {
  let dateTime = new Date();
  const token = await card.getAccessToken();
  //console.log(token);
  expect(token.access_token).toBeTypeOf('string');
});

test('get card list', async () => {
  const cards = await card.getCards();
  expect(cards.data.cards[0].CardKey).toBeTypeOf('string');
  expect(cards.data).toBeDefined();
  expect(cards.links).toBeDefined();
  expect(cards.meta).toBeDefined();
});

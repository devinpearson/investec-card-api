// Example: enable or disable programmable features on a card
// (dry run unless CONFIRM_TOGGLE=true; ENABLED=false to disable)
import { cardKeyFromEnv, createClientFromEnv } from './create-client';

const api = createClientFromEnv();
const cardKey = cardKeyFromEnv();
const enabled = process.env.ENABLED !== 'false';

if (process.env.CONFIRM_TOGGLE !== 'true') {
  console.log(
    `Dry run: would ${enabled ? 'enable' : 'disable'} programmable features on card ${cardKey}.`,
  );
  console.log('Set CONFIRM_TOGGLE=true to apply it.');
} else {
  try {
    const result = await api.toggleCode(cardKey, enabled);
    console.log('Feature toggled:', result.data.result);
  } catch (err) {
    console.error('Error toggling feature:', err);
    process.exitCode = 1;
  }
}

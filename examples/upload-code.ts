// Example: save code to a card (dry run unless CONFIRM_UPLOAD=true)
import {
  approveAllCode,
  cardKeyFromEnv,
  createClientFromEnv,
} from './create-client';

const api = createClientFromEnv();
const cardKey = cardKeyFromEnv();

if (process.env.CONFIRM_UPLOAD !== 'true') {
  console.log(`Dry run: would save this code to card ${cardKey}:\n`);
  console.log(approveAllCode);
  console.log('Set CONFIRM_UPLOAD=true to upload it.');
} else {
  try {
    const result = await api.uploadCode(cardKey, { code: approveAllCode });
    console.log('Saved code:', result.data.result);
  } catch (err) {
    console.error('Error uploading code:', err);
    process.exitCode = 1;
  }
}

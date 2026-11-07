# Examples

Runnable scripts that exercise `investec-card-api` against Investec production, the sandbox, or [programmable-banking-sim](https://github.com/devinpearson/programmable-banking-sim).

## Setup

```sh
export INVESTEC_CLIENT_ID=your_client_id
export INVESTEC_CLIENT_SECRET=your_client_secret
export INVESTEC_API_KEY=your_api_key
export INVESTEC_CARD_KEY=123456   # for the per-card examples

# Optional — prefer the sandbox or simulator while experimenting
export INVESTEC_HOST=https://openapisandbox.investec.com
```

## Scripts

| Command                          | File                                       | What it does                                          |
| -------------------------------- | ------------------------------------------ | ----------------------------------------------------- |
| `npm run example:list-cards`     | [`list-cards.ts`](./list-cards.ts)         | List programmable cards                               |
| `npm run example:execute-code`   | [`execute-code.ts`](./execute-code.ts)     | Run sample code against a simulated transaction       |
| `npm run example:upload-code`    | [`upload-code.ts`](./upload-code.ts)       | Save sample code to a card (dry run by default)       |
| `npm run example:toggle-feature` | [`toggle-feature.ts`](./toggle-feature.ts) | Enable/disable programmable features (dry run by default) |

Shared client setup lives in [`create-client.ts`](./create-client.ts).

## Examples that change a card

`upload-code` and `toggle-feature` change how a real card behaves, so they only call the API when you set a confirm flag:

```sh
CONFIRM_UPLOAD=true npm run example:upload-code
CONFIRM_TOGGLE=true npm run example:toggle-feature
ENABLED=false CONFIRM_TOGGLE=true npm run example:toggle-feature
```

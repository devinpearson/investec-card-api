# Investec Card Code API

Connect with the Investec Card API.

[![Node.js CI](https://github.com/devinpearson/investec-card-api/actions/workflows/node.js.yml/badge.svg)](https://github.com/devinpearson/investec-card-api/actions/workflows/node.js.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![npm version](https://badge.fury.io/js/investec-card-api.svg)](https://badge.fury.io/js/investec-card-api)

## About

A basic package to connect to the investec programmable card api. It was created to service the investec-ipb command line application.

## Installation

Install the package using npm:

```
npm i investec-card-api
```

## Usage

Import the connector into your code:

```typescript
import { InvestecCardApi } from 'investec-card-api';
```

Create a new instance of the InvestecCardApi class:

```typescript
const cardApi = new InvestecCardApi('<clientId>', '<clientSecret>', '<apiKey>');
```

Fetch a list of cards:

```typescript
const cards = await cardApi.getCards();
```

Replace a card's environment variables (sent to the API as `{ variables: env }`):

```typescript
const result = await cardApi.uploadEnv(cardKey, { API_KEY: 'value' });
console.log(result.data.result.variables);
```

Uploads the code to a card as the saved card code:

```typescript
const result = await cardApi.uploadCode(cardKey, { code: 'return true;' });
```

### Errors

Failed HTTP requests throw `InvestecApiError`:

```typescript
import { InvestecApiError } from 'investec-card-api';

try {
  await cardApi.getCode(cardKey);
} catch (err) {
  if (err instanceof InvestecApiError) {
    console.error(err.status, err.message, err.endpoint, err.body);
  }
}
```

- `message` comes from the error body (plain text, or a JSON `message`, `error_description`, `error` or `title` field), falling back to the HTTP status text.
- A 404 from a card endpoint (`getCode(cardKey)` and so on) has the message `Card not found`.
- A token without the `cards` scope is rejected with status `403`.
- A `2xx` response that isn't JSON is also an `InvestecApiError`.
- A request that gets a `401` is retried once with a fresh token.
- Card methods reject with a `TypeError`, without making a request, if `cardKey` isn't a non-negative integer.

## Examples

Runnable examples live in [`examples/`](examples/) and read credentials from environment variables. See [`examples/README.md`](examples/README.md) for setup.

```bash
npm run example:list-cards
npm run example:execute-code
```

`example:upload-code` and `example:toggle-feature` change a real card, so they are dry runs unless you set `CONFIRM_UPLOAD=true` / `CONFIRM_TOGGLE=true`.

## API Response Shapes

Below are the main response shapes returned by this library. All methods return typed objects matching these interfaces:

### CardResponse

```typescript
{
  data: {
    cards: Array<{
      CardKey: number;
      CardNumber: string;
      IsProgrammable: boolean;
      status: string;
      CardTypeCode: string;
      AccountNumber: string;
      AccountId: string;
    }>;
  }
}
```

### CodeResponse

```typescript
{
  data: {
    result: {
      codeId: string;
      code: string;
      createdAt: string;
      updatedAt: string;
      error: string | null;
    }
  }
}
```

### EnvResponse

```typescript
{
  data: {
    result: {
      variables: { [key: string]: string };
      createdAt: string;
      updatedAt: string;
      error: string | null;
    };
  };
}
```

### CodeToggle

```typescript
{
  data: {
    result: {
      Enabled: boolean;
    }
  }
}
```

### ExecutionResult

```typescript
{
  data: {
    result: {
      executionItems: Array<ExecutionItem>;
      error: string | null;
    }
  }
}
```

### ExecuteResult

```typescript
{
  data: {
    result: Array<ExecutionItem>;
  }
}
```

### ReferenceResponse

```typescript
{
  data: {
    result: Array<{
      Code: string;
      Name: string;
    }>;
  }
}
```

## Development

| Command                    | What it does                                                  |
| -------------------------- | ------------------------------------------------------------- |
| `npm test`                 | Unit tests (mocked `fetch`)                                   |
| `npm run test:integration` | End-to-end tests against `programmable-banking-sim`           |
| `npm run test:mutation`    | Stryker mutation testing; report in `reports/mutation/`       |
| `npm run lint`             | Biome lint + format check (`npm run lint:fix` to fix)         |
| `npm run ci`               | Build, typecheck, lint, check exports, unit tests, `npm audit` |

### Integration tests

The integration suite runs the client against [programmable-banking-sim](https://github.com/devinpearson/programmable-banking-sim).
It is skipped unless `PB_SIM_URL` is set:

```bash
# in programmable-banking-sim
PORT=3000 npm run dev
```

```bash
PB_SIM_URL=http://localhost:3000 npm run test:integration
```

The default credentials are the simulator's seeded sandbox values; override
them with `PB_SIM_CLIENT_ID`, `PB_SIM_CLIENT_SECRET` and `PB_SIM_API_KEY`.
The suite creates its own card through the simulator and deletes it afterwards.

The simulator differs from the real API in a few places, so:

- Its tokens carry scope `accounts`, not `cards`, which this client rejects.
  The tests use a client subclass that skips that check, plus one `test.fails`
  tripwire for the scope itself.
- Code, published code, toggle, executions and reference-data responses use
  different shapes (and publishing uses `/publishedcode`, not `/publish`).
  Each is a `test.fails` tripwire under "known simulator divergences".

Flip a tripwire to `test` once the simulator matches the real API.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

# Investec Card Code API

Connect with the Investec Card API.

[![Node.js CI](https://github.com/devinpearson/investec-card-api/actions/workflows/node.js.yml/badge.svg)](https://github.com/devinpearson/investec-card-api/actions/workflows/node.js.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/investec-card-api.svg)](https://badge.fury.io/js/investec-card-api)

## About

A basic package to connect to the investec programmable card api.
It was created to service the investec-ipb command line application.

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

Upload an environment to a card:

```typescript
const cards = await cardApi.uploadEnv(cardKey, env);
```

Uploads the code to a card as the saved card code:

```typescript
const cards = await cardApi.uploadCode(cardKey, code);
```

Upload a published code to a card:
codeid is the id from the saved code that has previously uploaded.
This code will be used when the card is enabled.

```typescript
const cards = await cardApi.uploadPublishedCode(cardKey, codeId, code);
```

Fetch the environment for a card:

```typescript
const cards = await cardApi.getEnv(cardKey);
```

Fetch the saved card code for a card:

```typescript
const code = await cardApi.getCode(cardKey);
```

Fetch the published code for a card:

```typescript
const cards = await cardApi.getPublishedCode(cardKey);
```

Enable the card code or disable it:

```typescript
const cards = await cardApi.toggleCode(cardKey, true);
```

Get a list of all executions and the logs for each execution:
These do not include transactions when the code is disabled.

```typescript
const cards = await cardApi.getExecutions(cardKey);
```

Runs a simulation of the code and returns the result:

```typescript
const result = await cardApi.executeCode(code, transaction, cardKey);
```

### Reference Data

Fetch a list of currencies and their codes:

```typescript
const currencies = await cardApi.getCurrencies();
```

Fetch a list of countries and their codes:

```typescript
const countries = await cardApi.getCountries();
```

Fetch A list of merchants and the categories they belong to:

```typescript
const merchants = await cardApi.getMerchants();
```

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

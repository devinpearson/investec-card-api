import { type AuthResponse, InvestecCardApi } from '../../src';

/**
 * Credentials seeded by programmable-banking-sim (prisma/settings.ts).
 * These are the public Investec sandbox values, not secrets. Override them
 * with PB_SIM_CLIENT_ID / PB_SIM_CLIENT_SECRET / PB_SIM_API_KEY if your
 * simulator is configured differently.
 */
export const simCredentials = {
  clientId: process.env.PB_SIM_CLIENT_ID ?? 'yAxzQRFX97vOcyQAwluEU6H6ePxMA5eY',
  clientSecret: process.env.PB_SIM_CLIENT_SECRET ?? '4dY0PjEYqoBrZ99r',
  apiKey:
    process.env.PB_SIM_API_KEY ??
    'eUF4elFSRlg5N3ZPY3lRQXdsdUVVNkg2ZVB4TUE1ZVk6YVc1MlpYTjBaV010ZW1FdGNHSXRZV05qYjNWdWRITXRjMkZ1WkdKdmVBPT0=',
};

export const simUrl = process.env.PB_SIM_URL;

type Credentials = typeof simCredentials;

function requireSimUrl(): string {
  if (!simUrl) {
    throw new Error('PB_SIM_URL is not set');
  }
  return simUrl;
}

/** Requests a client-credentials token from the simulator, with no scope check. */
async function fetchSimToken(creds: Credentials): Promise<string> {
  const res = await fetch(
    new URL('/identity/v2/oauth2/token', requireSimUrl()),
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64')}`,
        'x-api-key': creds.apiKey,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    },
  );
  if (!res.ok) {
    throw new Error(`Simulator token request failed: ${res.status}`);
  }
  return ((await res.json()) as AuthResponse).access_token;
}

/**
 * The simulator issues client-credentials tokens with scope "accounts", which
 * InvestecCardApi rejects (the real API includes "cards"). This subclass gets
 * its token without that check so every other method can be exercised end to
 * end. The scope divergence itself is covered by a `test.fails` tripwire.
 */
class SimCardApi extends InvestecCardApi {
  private simToken: Promise<string> | undefined;

  constructor(private readonly creds: Credentials) {
    super(creds.clientId, creds.clientSecret, creds.apiKey, requireSimUrl());
  }

  override getToken(): Promise<string> {
    this.simToken ??= fetchSimToken(this.creds);
    return this.simToken;
  }
}

/** A client wired to the simulator that bypasses the cards-scope check. */
export function createSimClient(
  overrides: Partial<Credentials> = {},
): InvestecCardApi {
  return new SimCardApi({ ...simCredentials, ...overrides });
}

/** The unmodified client, for testing authentication itself. */
export function createRealClient(
  overrides: Partial<Credentials> = {},
): InvestecCardApi {
  const creds = { ...simCredentials, ...overrides };
  return new InvestecCardApi(
    creds.clientId,
    creds.clientSecret,
    creds.apiKey,
    requireSimUrl(),
  );
}

async function simRequest(method: string, path: string, body?: unknown) {
  const token = await fetchSimToken(simCredentials);
  const res = await fetch(new URL(path, requireSimUrl()), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'x-api-key': simCredentials.apiKey,
      'content-type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Simulator ${method} ${path} failed: ${res.status}`);
  }
}

/**
 * Creates a programmable card through the simulator's own (non-Investec)
 * endpoint, with fresh saved/published code records. The key is numeric
 * because InvestecCardApi takes card keys as numbers.
 */
export async function createTestCard(): Promise<number> {
  const cardKey = 900_000_000 + Math.floor(Math.random() * 99_999_999);
  await simRequest('POST', '/za/v1/cards', {
    cardKey: String(cardKey),
    isProgrammable: false,
  });
  return cardKey;
}

export async function deleteTestCard(cardKey: number): Promise<void> {
  await simRequest('DELETE', `/za/v1/cards/${cardKey}`);
}

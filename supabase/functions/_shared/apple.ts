// Sign in with Apple token revocation, which Apple requires when an account is deleted.
// No imports and no Deno globals at the top level, so the app's Jest tests can exercise it too.
//
// Flow: the app asks Apple for a fresh one-time authorization code (the person confirms once more), sends it here, and
// this exchanges it for a refresh token and revokes that. No Apple token is ever stored on our side.
// https://developer.apple.com/documentation/sign_in_with_apple/revoke_tokens

export interface AppleConfig {
  /** Apple Developer team id, e.g. BHQZ3J8C6Q. */
  teamId: string;
  /** The Sign in with Apple key's id (Apple Developer › Keys). */
  keyId: string;
  /** For the native app this is the bundle id, com.birdiesandbets.app. */
  clientId: string;
  /** The .p8 key's contents (PEM, PKCS#8). */
  privateKeyPem: string;
}

export type RevokeResult = { ok: true } | { ok: false; status: number; message: string };

const APPLE = 'https://appleid.apple.com';
export const APPLE_UNAVAILABLE = 'Apple did not answer. Nothing was deleted; try again in a minute.';
export const APPLE_CODE_EXPIRED = "Apple's confirmation expired. Nothing was deleted; try again.";
export const APPLE_WRONG_ACCOUNT = 'That Apple ID is not the one on this account. Nothing was deleted.';

/** Claims of the client secret Apple expects: an ES256 JWT from the team, about the app, short-lived (5 minutes). */
export function clientSecretClaims(cfg: Pick<AppleConfig, 'teamId' | 'clientId'>, nowSeconds: number) {
  return { iss: cfg.teamId, iat: nowSeconds, exp: nowSeconds + 300, aud: APPLE, sub: cfg.clientId };
}

export function tokenRequestBody(cfg: Pick<AppleConfig, 'clientId'>, clientSecret: string, code: string): URLSearchParams {
  return new URLSearchParams({ client_id: cfg.clientId, client_secret: clientSecret, code, grant_type: 'authorization_code' });
}

export function revokeRequestBody(cfg: Pick<AppleConfig, 'clientId'>, clientSecret: string, token: string, hint: 'refresh_token' | 'access_token'): URLSearchParams {
  return new URLSearchParams({ client_id: cfg.clientId, client_secret: clientSecret, token, token_type_hint: hint });
}

function base64UrlEncode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
}

/** The payload of a JWT that came straight from Apple over TLS (its signature does not need checking here). */
export function decodeJwtPayload(jwt: unknown): Record<string, unknown> | null {
  if (typeof jwt !== 'string') return null;
  const part = jwt.split('.')[1];
  if (!part) return null;
  try {
    const value = JSON.parse(base64UrlDecode(part)) as unknown;
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function pemToDer(pem: string): ArrayBuffer {
  const body = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\\n/g, '').replace(/\s+/g, '');
  const raw = atob(body);
  const out = new ArrayBuffer(raw.length);
  const view = new Uint8Array(out);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return out;
}

/** Sign the client secret with the .p8 key (Web Crypto; ECDSA P-256 signatures are already in JWS r||s form). */
export async function signClientSecret(cfg: AppleConfig, nowSeconds: number): Promise<string> {
  const enc = new TextEncoder();
  const header = base64UrlEncode(enc.encode(JSON.stringify({ alg: 'ES256', kid: cfg.keyId, typ: 'JWT' })));
  const claims = base64UrlEncode(enc.encode(JSON.stringify(clientSecretClaims(cfg, nowSeconds))));
  const input = `${header}.${claims}`;
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(cfg.privateKeyPem), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(input)));
  return `${input}.${base64UrlEncode(signature)}`;
}

export interface RevokeInput {
  /** The one-time authorization code the app just got from Apple. */
  code: string;
  /** The Apple user id (`sub`) on this account; the code must belong to the same Apple ID. */
  expectedSub?: string;
  cfg: AppleConfig;
  nowSeconds: number;
  fetchImpl: (url: string, init: { method: string; headers: Record<string, string>; body: URLSearchParams }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;
  sign?: (cfg: AppleConfig, nowSeconds: number) => Promise<string>;
}

/**
 * Exchange the code for Apple's tokens and revoke them. Any doubt (Apple down, an expired code, a different Apple ID)
 * returns an error, and the caller deletes nothing: an account is only deleted after Apple confirms the revocation.
 */
export async function revokeAppleTokens({ code, expectedSub, cfg, nowSeconds, fetchImpl, sign = signClientSecret }: RevokeInput): Promise<RevokeResult> {
  const secret = await sign(cfg, nowSeconds);
  const form = { 'Content-Type': 'application/x-www-form-urlencoded' };

  let tokenRes: Awaited<ReturnType<RevokeInput['fetchImpl']>>;
  try {
    tokenRes = await fetchImpl(`${APPLE}/auth/token`, { method: 'POST', headers: form, body: tokenRequestBody(cfg, secret, code) });
  } catch {
    return { ok: false, status: 503, message: APPLE_UNAVAILABLE };
  }
  if (tokenRes.status >= 500) return { ok: false, status: 503, message: APPLE_UNAVAILABLE };
  const tokens = ((await tokenRes.json().catch(() => ({}))) ?? {}) as { refresh_token?: unknown; access_token?: unknown; id_token?: unknown };
  // 400 invalid_grant: the code is older than five minutes or was already used.
  if (!tokenRes.ok) return { ok: false, status: 400, message: APPLE_CODE_EXPIRED };

  const sub = decodeJwtPayload(tokens.id_token)?.sub;
  if (expectedSub && typeof sub === 'string' && sub !== expectedSub) return { ok: false, status: 403, message: APPLE_WRONG_ACCOUNT };

  const refresh = typeof tokens.refresh_token === 'string' ? tokens.refresh_token : undefined;
  const access = typeof tokens.access_token === 'string' ? tokens.access_token : undefined;
  if (!refresh && !access) return { ok: false, status: 502, message: APPLE_UNAVAILABLE };

  let revokeRes: Awaited<ReturnType<RevokeInput['fetchImpl']>>;
  try {
    revokeRes = await fetchImpl(`${APPLE}/auth/revoke`, { method: 'POST', headers: form, body: revokeRequestBody(cfg, secret, (refresh ?? access)!, refresh ? 'refresh_token' : 'access_token') });
  } catch {
    return { ok: false, status: 503, message: APPLE_UNAVAILABLE };
  }
  if (!revokeRes.ok) return { ok: false, status: revokeRes.status >= 500 ? 503 : 502, message: APPLE_UNAVAILABLE };
  return { ok: true };
}

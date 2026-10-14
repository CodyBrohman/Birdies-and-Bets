// The delete-account Edge Function's Apple step (supabase/functions/_shared/apple.ts). The function itself runs on Deno;
// this logic has no Deno dependencies, so it is tested here: an account is deleted only after Apple confirms.
import {
  APPLE_CODE_EXPIRED,
  APPLE_UNAVAILABLE,
  APPLE_WRONG_ACCOUNT,
  clientSecretClaims,
  decodeJwtPayload,
  revokeAppleTokens,
  revokeRequestBody,
  tokenRequestBody,
  type AppleConfig,
  type RevokeInput,
} from '../../supabase/functions/_shared/apple';

const cfg: AppleConfig = { teamId: 'BHQZ3J8C6Q', keyId: 'KEY123', clientId: 'com.birdiesandbets.app', privateKeyPem: 'unused-in-these-tests' };
const sign = jest.fn(() => Promise.resolve('client.secret.jwt'));
const jwt = (payload: object) => `h.${btoa(JSON.stringify(payload)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')}.s`;
const reply = (status: number, body: unknown = {}) => ({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });

function apple(...replies: (ReturnType<typeof reply> | Error)[]) {
  const calls: { url: string; body: URLSearchParams }[] = [];
  const fetchImpl: RevokeInput['fetchImpl'] = jest.fn(async (url, init) => {
    calls.push({ url, body: init.body });
    const next = replies.shift();
    if (next instanceof Error) throw next;
    return next ?? reply(500);
  });
  return { fetchImpl, calls };
}

const input = (fetchImpl: RevokeInput['fetchImpl'], expectedSub = 'apple-sub-1'): RevokeInput => ({ code: 'one-time-code', expectedSub, cfg, nowSeconds: 1_760_000_000, fetchImpl, sign });

describe('Sign in with Apple revocation on account delete', () => {
  it('builds the client secret claims and form bodies Apple expects', () => {
    expect(clientSecretClaims(cfg, 1000)).toEqual({ iss: 'BHQZ3J8C6Q', iat: 1000, exp: 1300, aud: 'https://appleid.apple.com', sub: 'com.birdiesandbets.app' });
    expect(Object.fromEntries(tokenRequestBody(cfg, 's', 'c'))).toEqual({ client_id: 'com.birdiesandbets.app', client_secret: 's', code: 'c', grant_type: 'authorization_code' });
    expect(Object.fromEntries(revokeRequestBody(cfg, 's', 't', 'refresh_token'))).toEqual({ client_id: 'com.birdiesandbets.app', client_secret: 's', token: 't', token_type_hint: 'refresh_token' });
  });

  it('reads the payload of the id token Apple returns, and shrugs at garbage', () => {
    expect(decodeJwtPayload(jwt({ sub: 'apple-sub-1' }))).toEqual({ sub: 'apple-sub-1' });
    expect(decodeJwtPayload('not a jwt')).toBeNull();
    expect(decodeJwtPayload(undefined)).toBeNull();
  });

  it('exchanges the code, then revokes the refresh token', async () => {
    const { fetchImpl, calls } = apple(reply(200, { refresh_token: 'rt', access_token: 'at', id_token: jwt({ sub: 'apple-sub-1' }) }), reply(200));
    expect(await revokeAppleTokens(input(fetchImpl))).toEqual({ ok: true });
    expect(calls.map((c) => c.url)).toEqual(['https://appleid.apple.com/auth/token', 'https://appleid.apple.com/auth/revoke']);
    expect(calls[1]!.body.get('token')).toBe('rt');
    expect(calls[1]!.body.get('token_type_hint')).toBe('refresh_token');
  });

  it('Apple down or unreachable: nothing is revoked, and the caller deletes nothing', async () => {
    const down = apple(reply(503));
    expect(await revokeAppleTokens(input(down.fetchImpl))).toEqual({ ok: false, status: 503, message: APPLE_UNAVAILABLE });
    const offline = apple(new Error('Network request failed'));
    expect(await revokeAppleTokens(input(offline.fetchImpl))).toEqual({ ok: false, status: 503, message: APPLE_UNAVAILABLE });
    expect(down.calls).toHaveLength(1);
  });

  it('an expired or reused code asks to try again', async () => {
    const { fetchImpl } = apple(reply(400, { error: 'invalid_grant' }));
    expect(await revokeAppleTokens(input(fetchImpl))).toEqual({ ok: false, status: 400, message: APPLE_CODE_EXPIRED });
  });

  it("a code from a different Apple ID than the account's is refused before anything is revoked", async () => {
    const { fetchImpl, calls } = apple(reply(200, { refresh_token: 'rt', id_token: jwt({ sub: 'someone-else' }) }));
    expect(await revokeAppleTokens(input(fetchImpl))).toEqual({ ok: false, status: 403, message: APPLE_WRONG_ACCOUNT });
    expect(calls).toHaveLength(1);
  });

  it('a failed revoke is an error too', async () => {
    const { fetchImpl } = apple(reply(200, { refresh_token: 'rt', id_token: jwt({ sub: 'apple-sub-1' }) }), reply(500));
    expect(await revokeAppleTokens(input(fetchImpl))).toEqual({ ok: false, status: 503, message: APPLE_UNAVAILABLE });
  });
});

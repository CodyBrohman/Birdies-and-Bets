// Deletes the signed-in account and everything stored with it (Apple requires in-app deletion). For a Sign in with Apple
// account it first revokes the app's Apple tokens, as Apple also requires: the app sends a fresh one-time authorization
// code, this exchanges and revokes it, and only then deletes the user. If Apple cannot confirm, nothing is deleted.
//
// Deploy: npx supabase functions deploy delete-account
// Secrets (Supabase dashboard › Edge Functions › Secrets, or `npx supabase secrets set --env-file <file>`):
//   APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_CLIENT_ID, APPLE_PRIVATE_KEY (the .p8 contents). SUPABASE_URL and
//   SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { revokeAppleTokens, type AppleConfig } from '../_shared/apple.ts';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function appleConfig(): AppleConfig | null {
  const teamId = Deno.env.get('APPLE_TEAM_ID');
  const keyId = Deno.env.get('APPLE_KEY_ID');
  const clientId = Deno.env.get('APPLE_CLIENT_ID');
  const privateKeyPem = Deno.env.get('APPLE_PRIVATE_KEY');
  return teamId && keyId && clientId && privateKeyPem ? { teamId, keyId, clientId, privateKeyPem } : null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Sign in again, then delete the account.' }, 401);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.getUser(token);
  const user = data?.user;
  if (error || !user) return json({ error: 'Sign in again, then delete the account.' }, 401);

  const apple = user.identities?.find((i) => i.provider === 'apple');
  if (apple) {
    const cfg = appleConfig();
    if (!cfg) return json({ error: 'Account deletion is not set up yet. Nothing was deleted; contact support.' }, 500);
    const body = (await req.json().catch(() => ({}))) as { authorizationCode?: unknown };
    const code = typeof body.authorizationCode === 'string' ? body.authorizationCode : '';
    if (!code) return json({ error: 'Apple needs to confirm first. Nothing was deleted.' }, 400);
    const expectedSub = (apple.identity_data?.sub as string | undefined) ?? apple.id;
    const revoked = await revokeAppleTokens({ code, expectedSub, cfg, nowSeconds: Math.floor(Date.now() / 1000), fetchImpl: (url, init) => fetch(url, init) });
    if (!revoked.ok) return json({ error: revoked.message }, revoked.status);
  }

  // Deleting the auth user cascades to every table (see migrations/0001_init.sql).
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) return json({ error: 'Could not delete the account. Nothing was deleted; try again.' }, 500);
  return json({ ok: true });
});

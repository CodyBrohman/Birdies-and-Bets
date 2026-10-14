import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Button, Pressable, Screen, Text, TextField } from '@/components/ui';
import { BrandMark } from '@/components/BrandMark';
import { ContourField } from '@/components/ContourField';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/store';
import { friendlySignInError } from '@/lib/errors';
import {
  accountName,
  afterSignIn,
  appleSignInAvailable,
  cancelAccountSwitch,
  confirmAccountSwitch,
  continueWithoutAccount,
  needsName,
  PRIVACY_POLICY_URL,
  sendEmailCode,
  setAccountName,
  signInWithApple,
  verifyEmailCode,
} from '@/services';

type Step = 'choose' | 'email' | 'code' | 'name' | 'switch';

/** Seconds before another code can be sent. */
const RESEND_AFTER = 60;

const TITLES: Record<Step, string> = {
  choose: 'Birdies & Bets',
  email: 'Sign in with email',
  code: 'Check your email',
  name: 'What name goes on the scorecard?',
  switch: "Replace this iPhone's data?",
};

/**
 * Accounts are optional. As the welcome screen (nothing chosen yet) it offers Sign in with Apple, a 6-digit code by email,
 * or carrying on without an account. Opened later from Settings or Profile it is a sheet that signs in and closes.
 */
export default function SignInScreen() {
  const router = useRouter();
  const { c, space, radius } = useTheme();
  const status = useAuthStore((s) => s.status);
  const pendingSwitch = useAuthStore((s) => s.pendingSwitch);
  /** Opened from inside the app (no account yet, or signing in again): a sheet with a way out. */
  const asSheet = status !== 'signed-out';
  const [step, setStep] = useState<Step>('choose');
  const [apple, setApple] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    void appleSignInAvailable().then(setApple);
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const run = async (work: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await work();
    } catch (e) {
      setError(friendlySignInError(e));
    } finally {
      setBusy(false);
    }
  };

  /** Into the app: back to where the sheet was opened from, or Home from the welcome screen. */
  const enter = () => {
    if (asSheet && router.canGoBack()) router.back();
    else router.replace('/' as Href);
  };

  /** Signed in: wait for the account's data, then ask for a name only if the account has no "me" yet. */
  const finish = async (suggested?: string) => {
    const result = await afterSignIn();
    if (result.kind === 'switch') {
      setStep('switch');
      return;
    }
    // Only ask once the account's data is here: asking before it arrives could create a second "me".
    if (result.pulled && needsName()) {
      setName(suggested || (await accountName().catch(() => '')) || email.split('@')[0] || '');
      setStep('name');
      return;
    }
    enter();
  };

  const withApple = () =>
    run(async () => {
      const result = await signInWithApple();
      if (result) await finish(result.name);
    });

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const sendCode = () =>
    run(async () => {
      await sendEmailCode(email);
      setCode('');
      setResendIn(RESEND_AFTER);
      setStep('code');
    });
  const verify = () =>
    run(async () => {
      await verifyEmailCode(email, code);
      await finish();
    });
  const saveName = () =>
    run(async () => {
      await setAccountName(name);
      enter();
    });
  const withoutAccount = () =>
    run(async () => {
      await continueWithoutAccount();
      router.replace('/' as Href);
    });
  const replaceData = () =>
    run(async () => {
      await confirmAccountSwitch();
      await finish();
    });
  const keepData = () =>
    run(async () => {
      await cancelAccountSwitch();
      setStep('choose');
    });

  const body: Record<Step, string> = {
    choose: 'Sign in to sync your rounds across phones.',
    email: "We'll email you a 6-digit code. No password.",
    code: `We sent a 6-digit code to ${email.trim()}.`,
    name: 'This is how you show up on scorecards.',
    switch: `This iPhone has rounds, courses and players from another account. Signing in as ${pendingSwitch?.email ?? 'this account'} replaces them with this account's. Anything the other account had not synced yet is lost.`,
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {asSheet && step !== 'switch' ? (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: space[5], paddingTop: space[2] }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Not now" onPress={() => (router.canGoBack() ? router.back() : router.replace('/' as Href))} hitSlop={12} style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
              <Text step="label" tone="accent">
                Not now
              </Text>
            </Pressable>
          </View>
        ) : null}
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: space[5], gap: space[4], paddingVertical: space[6] }} keyboardShouldPersistTaps="handled">
          <ContourField opacity={0.06} />
          <BrandMark size={64} />
          <View style={{ gap: 6 }}>
            <Text accessibilityRole="header" step="display">
              {TITLES[step]}
            </Text>
            <Text step="body" tone="secondary" style={{ fontSize: 17, lineHeight: 24 }}>
              {body[step]}
            </Text>
          </View>

          {step === 'choose' ? (
            <View style={{ gap: space[3], marginTop: space[2] }}>
              {apple ? (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={radius.lg}
                  style={{ height: 52, opacity: busy ? 0.6 : 1 }}
                  onPress={() => {
                    if (!busy) void withApple();
                  }}
                />
              ) : null}
              <Button label="Continue with email" variant={apple ? 'secondary' : 'primary'} disabled={busy} onPress={() => setStep('email')} testID="sign-in-email" />
              {status === 'signed-out' ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Continue without an account" disabled={busy} onPress={() => void withoutAccount()} testID="continue-without-account" style={({ pressed }) => ({ minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
                  <Text step="label" tone="accent">
                    Continue without an account
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {step === 'email' ? (
            <View style={{ gap: space[3], marginTop: space[2] }}>
              <TextField
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                autoFocus
                accessibilityLabel="Email"
                returnKeyType="send"
                onSubmitEditing={() => {
                  if (validEmail) void sendCode();
                }}
                testID="email-field"
              />
              <Button label={busy ? 'Sending…' : 'Send code'} disabled={busy || !validEmail} onPress={() => void sendCode()} testID="send-code" />
              <Button label="Back" variant="secondary" disabled={busy} onPress={() => setStep('choose')} />
            </View>
          ) : null}

          {step === 'code' ? (
            <View style={{ gap: space[3], marginTop: space[2] }}>
              <TextField
                placeholder="123456"
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                autoFocus
                accessibilityLabel="6-digit code"
                testID="code-field"
              />
              <Button label={busy ? 'Signing in…' : 'Sign in'} disabled={busy || code.length !== 6} onPress={() => void verify()} testID="verify-code" />
              <Button label={resendIn > 0 ? `Send a new code in ${resendIn} s` : 'Send a new code'} variant="secondary" disabled={busy || resendIn > 0} onPress={() => void sendCode()} />
              <Button label="Use a different email" variant="secondary" disabled={busy} onPress={() => setStep('email')} />
            </View>
          ) : null}

          {step === 'name' ? (
            <View style={{ gap: space[3], marginTop: space[2] }}>
              <TextField placeholder="Your name" value={name} onChangeText={setName} autoCapitalize="words" autoFocus maxLength={40} accessibilityLabel="Your name" testID="name-field" />
              <Button label="Continue" disabled={busy || !name.trim()} onPress={() => void saveName()} testID="save-name" />
            </View>
          ) : null}

          {step === 'switch' ? (
            <View style={{ gap: space[3], marginTop: space[2] }}>
              <Button label="Replace with this account" destructive disabled={busy} onPress={() => void replaceData()} />
              <Button label="Keep this iPhone's data" variant="secondary" disabled={busy} onPress={() => void keepData()} />
            </View>
          ) : null}

          {error ? (
            <Text step="caption" tone="negative" tabular={false} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}

          {step === 'choose' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
              <Text step="caption" tone="tertiary" tabular={false}>
                Points only. Nothing is paid in the app.
              </Text>
              <Pressable accessibilityRole="link" accessibilityLabel="Privacy policy" onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)} hitSlop={12}>
                <Text step="caption" tabular={false} style={{ color: c.accentText, textDecorationLine: 'underline' }}>
                  Privacy policy
                </Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

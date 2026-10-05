import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Button, Screen, Text, TextField } from '@/components/ui';
import { BrandMark } from '@/components/BrandMark';
import { ContourField } from '@/components/ContourField';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/store';
import { accountName, afterSignIn, appleSignInAvailable, needsName, sendEmailCode, setAccountName, signInWithApple, verifyEmailCode } from '@/services';

type Step = 'choose' | 'email' | 'code' | 'name';

/**
 * Sign in before anything else: Sign in with Apple on iPhone, or a 6-digit code by email. A first sign-in then asks
 * for a name (Apple shares it only once; email never does) and carries on into the app.
 */
export default function SignInScreen() {
  const router = useRouter();
  const { space, radius } = useTheme();
  const [step, setStep] = useState<Step>('choose');
  const [apple, setApple] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void appleSignInAvailable().then(setApple);
  }, []);

  const setFinishing = useAuthStore((s) => s.setFinishing);

  const run = async (work: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  /** Into the app. Clearing `finishing` opens the signed-in routes. */
  const enter = () => {
    setFinishing(false);
    router.replace('/' as Href);
  };

  /** Signed in: wait for the account's data, then ask for a name only if the account has no "me" yet. */
  const finish = async (suggested?: string) => {
    await afterSignIn();
    if (needsName()) {
      setName(suggested || (await accountName().catch(() => '')) || email.split('@')[0] || '');
      setStep('name');
      return;
    }
    enter();
  };

  const withApple = () =>
    run(async () => {
      setFinishing(true);
      const result = await signInWithApple().catch((e: unknown) => {
        setFinishing(false);
        throw e;
      });
      if (result) await finish(result.name);
      else setFinishing(false);
    });

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const sendCode = () =>
    run(async () => {
      await sendEmailCode(email);
      setStep('code');
    });
  const verify = () =>
    run(async () => {
      setFinishing(true);
      await verifyEmailCode(email, code).catch((e: unknown) => {
        setFinishing(false);
        throw e;
      });
      await finish();
    });
  const saveName = () =>
    run(async () => {
      await setAccountName(name);
      enter();
    });
  const differentEmail = () => {
    setCode('');
    setStep('email');
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: space[5], gap: space[4], paddingVertical: space[6] }} keyboardShouldPersistTaps="handled">
          <ContourField opacity={0.06} />
          <BrandMark size={64} />
          <View style={{ gap: 6 }}>
            <Text step="eyebrow" tone="accent">
              {step === 'name' ? 'One last thing' : 'Welcome'}
            </Text>
            <Text accessibilityRole="header" step="display" style={{ fontSize: 40, lineHeight: 44 }}>
              {step === 'name' ? 'What should we call you?' : step === 'code' ? 'Check your email.' : 'Sign in to keep score.'}
            </Text>
            <Text step="body" tone="secondary" style={{ fontSize: 17, lineHeight: 24 }}>
              {step === 'name'
                ? 'This is how you show up on scorecards and to your friends.'
                : step === 'code'
                  ? `We sent a 6-digit code to ${email.trim()}.`
                  : 'Your rounds, courses and crew follow you to any phone.'}
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
              <Button label={apple ? 'Use email instead' : 'Continue with email'} variant={apple ? 'secondary' : 'primary'} icon="mail-outline" disabled={busy} onPress={() => setStep('email')} testID="sign-in-email" />
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
              <Button label="Use a different email" variant="secondary" disabled={busy} onPress={differentEmail} />
            </View>
          ) : null}

          {step === 'name' ? (
            <View style={{ gap: space[3], marginTop: space[2] }}>
              <TextField placeholder="Your name" value={name} onChangeText={setName} autoCapitalize="words" autoFocus maxLength={40} accessibilityLabel="Your name" testID="name-field" />
              <Button label="Continue" disabled={busy || !name.trim()} onPress={() => void saveName()} testID="save-name" />
            </View>
          ) : null}

          {error ? (
            <Text step="caption" tone="negative" tabular={false}>
              {error}
            </Text>
          ) : null}

          {step === 'choose' ? (
            <Text step="caption" tone="tertiary" tabular={false}>
              Points only; nothing is paid through the app. How your data is handled: birdiesandbets.com/privacy
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

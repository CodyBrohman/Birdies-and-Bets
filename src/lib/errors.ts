// Plain sentences for errors people can see. Raw messages from Supabase, Apple or HTTP ("AuthApiError: Token has expired
// or is invalid", "Course service error (500)") never reach the screen. Pure: inspects the error's code, status and
// message only.

type ErrorLike = { name?: unknown; message?: unknown; code?: unknown; status?: unknown };

const NO_SIGNAL = 'No connection. Check your signal and try again.';

function parts(e: unknown): { name: string; message: string; code: string; status: number | undefined } {
  const o = (e && typeof e === 'object' ? e : {}) as ErrorLike;
  return {
    name: typeof o.name === 'string' ? o.name : '',
    message: typeof o.message === 'string' ? o.message : typeof e === 'string' ? e : '',
    code: typeof o.code === 'string' ? o.code : '',
    status: typeof o.status === 'number' ? o.status : undefined,
  };
}

/** No signal, a dropped request or a timeout. */
export function isNetworkError(e: unknown): boolean {
  const { name, message, status } = parts(e);
  return name === 'AbortError' || name === 'AuthRetryableFetchError' || status === 0 || /network request failed|failed to fetch|network error|timed? ?out|timeout|aborted|offline|internet connection/i.test(message);
}

/** Signing in: email codes, Apple, the account service. */
export function friendlySignInError(e: unknown): string {
  const { message, code, status } = parts(e);
  if (isNetworkError(e)) return NO_SIGNAL;
  if (code === 'otp_expired' || /token has expired|invalid.*(token|otp|code)|expired.*code/i.test(message)) return "That code didn't work. Check it, or send a new one.";
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || status === 429 || /rate limit|too many/i.test(message)) return 'Too many tries. Wait a minute, then try again.';
  if (code === 'email_address_invalid' || code === 'validation_failed' || /invalid.*email|email.*invalid/i.test(message)) return "That email address doesn't look right.";
  if (code === 'signup_disabled' || code === 'email_provider_disabled') return "Email sign-in isn't available right now. Try Sign in with Apple.";
  if (/^ERR_REQUEST_(FAILED|UNKNOWN)|ERR_INVALID_RESPONSE/.test(code) || /apple/i.test(message)) return "Sign in with Apple didn't finish. Try again.";
  if (status !== undefined && status >= 500) return 'The account service is having trouble. Try again in a minute.';
  return 'Something went wrong. Try again.';
}

/** Online course search and importing a course. */
export function friendlyCourseError(e: unknown): string {
  const { message, status } = parts(e);
  if (isNetworkError(e)) return "Can't reach the course directory. Saved courses still work.";
  if (status === 429 || /too many/i.test(message)) return 'Search is busy. Try again in a minute.';
  if (/not available in this build/i.test(message)) return "Course search isn't set up in this build. Add the course by hand.";
  if (/no hole data|has no holes|holes/i.test(message)) return "This course has no hole-by-hole data yet. Add it by hand instead.";
  return "Couldn't load that course. Try again, or add it by hand.";
}

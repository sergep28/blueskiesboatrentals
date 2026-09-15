import type { Resend } from 'resend';

// Staging is a second Render service running this same code against its own
// database. It sets APP_ENV=staging. NODE_ENV stays 'production' there so the
// build and the ADMIN_PASSWORD guard behave exactly as they do live.
export const IS_STAGING = process.env.APP_ENV === 'staging';

// Refuse to boot a staging server holding live Stripe keys — a "test" deposit
// would be a real $1,000 charge on a real card. Evaluated on import, and
// index.ts imports this module first, before anything touches Stripe.
if (IS_STAGING) {
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  if (/^(sk|rk)_live_/.test(key)) {
    throw new Error(
      'Staging is configured with a LIVE Stripe key. Use the sk_test_ key from ' +
      'Stripe test mode in the staging service settings.',
    );
  }
}

// In staging, no email may reach a customer. Every send is rerouted to
// STAGING_EMAIL_TO with the intended recipient kept in the subject, and cc/bcc
// dropped. With STAGING_EMAIL_TO unset, sends are logged and skipped.
export function guardResend(client: Resend | null): Resend | null {
  if (!client || !IS_STAGING) return client;
  const send = client.emails.send.bind(client.emails);
  const redirectTo = process.env.STAGING_EMAIL_TO;

  client.emails.send = (async (payload: any, options?: any) => {
    const intended = [payload.to].flat().filter(Boolean).join(', ');
    if (!redirectTo) {
      console.log(`[staging] email suppressed (to: ${intended}): ${payload.subject}`);
      return { data: { id: 'staging-suppressed' }, error: null, headers: null };
    }
    const { cc, bcc, ...rest } = payload;
    return send({ ...rest, to: redirectTo, subject: `[STAGING → ${intended}] ${payload.subject}` }, options);
  }) as typeof client.emails.send;

  return client;
}

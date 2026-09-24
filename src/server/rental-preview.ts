import { Resend } from 'resend';
import { guardResend, IS_STAGING } from './staging.js';
import { sampleCollectionEmail } from './rental-flow.js';

const OWNER_EMAIL = 'info@blueskiescharter.com';
type PreviewKind = Parameters<typeof sampleCollectionEmail>[0];

/** Admin-only caller supplies a template kind, never a booking or recipient. */
export async function sendCollectionPreview(kind: PreviewKind) {
  if (IS_STAGING && process.env.STAGING_EMAIL_TO !== OWNER_EMAIL) {
    throw new Error('Staging preview requires the owner inbox as its email redirect');
  }
  const message = await sampleCollectionEmail(kind);
  const mailer = guardResend(process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null);
  if (!mailer) throw new Error('Email provider is not configured');
  const result = await mailer.emails.send({
    from: process.env.FROM_EMAIL || 'bookings@blueskiesboatrentals.com',
    to: OWNER_EMAIL, subject: message.subject, text: message.text,
  });
  if (result.error || !result.data?.id) throw new Error('Owner preview email was not accepted by provider');
  return { ok: true as const, to: OWNER_EMAIL, kind, providerId: result.data.id };
}

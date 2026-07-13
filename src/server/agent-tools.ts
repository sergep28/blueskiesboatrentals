import Anthropic from '@anthropic-ai/sdk';
import { db, schema } from '../db/index.js';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import { createDepositLink } from './deposits.js';
import { sendMarketingEmail } from './email.js';

// Two classes of tool:
//
//   READ  — query the database. Safe, run automatically inside the agent loop.
//   STAGE — outward-facing (email, money). These CANNOT act. They only write a
//           row to agent_actions with status 'pending'. The real Resend/Stripe
//           calls live in executeAction(), which is reachable only from the
//           approveAction mutation behind an admin click.
//
// This is a hard boundary, not a UI convention: there is no code path from a
// tool handler to an outbound send, so a confused or prompt-injected agent
// still cannot email a customer or move money.

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'look_up_booking',
    description:
      'Look up one booking by its reference code (e.g. BSB-1042) or by customer name. ' +
      'Returns trip details, deposit status, agreement status, and contact info. ' +
      'Call this before drafting any email or deposit link so you use real data, never guesses.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Booking reference code, or a customer name / partial name.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_bookings',
    description:
      'List bookings, most recent first. Use to answer questions like "who has not paid a deposit" ' +
      'or "what is coming up this week".',
    input_schema: {
      type: 'object',
      properties: {
        deposit_status: {
          type: 'string',
          // Must match the DB enum exactly. 'none' = no deposit requested yet.
          enum: ['none', 'requested', 'paid', 'partially_refunded', 'refunded'],
          description:
            "Only return bookings whose deposit is in this state. Use 'none' for " +
            "bookings that have not been asked for a deposit yet.",
        },
        upcoming_only: {
          type: 'boolean',
          description: 'Only bookings whose charter date is today or later.',
        },
        limit: { type: 'integer', description: 'Max rows to return (default 20).' },
      },
      required: [],
    },
  },
  {
    name: 'draft_email',
    description:
      'Stage an email to a customer for Serge to approve. This does NOT send the email — it queues a ' +
      'draft that Serge must explicitly approve in the admin panel before anything is delivered. ' +
      'Write the MIDDLE of the email only. The branded template already adds the greeting ' +
      '("Hey Michael,") at the top and the sign-off ("See you on the water, The Blue Skies Team") ' +
      'at the bottom — do NOT write your own greeting or sign-off, and never sign as Serge. ' +
      'Emails come from the business, not from him personally. Start with the first real sentence.\n\n' +
      'Tell Serge afterward that the draft is waiting for his approval.\n\n' +
      'NEVER write a Stripe or waiver URL yourself — you cannot know a real one, and an invented link ' +
      'is a dead link for the customer. Write {{DEPOSIT_LINK}} or {{WAIVER_LINK}} exactly, and pass ' +
      'booking_ref; the server substitutes the real URLs when Serge approves.',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address.' },
        customer_name: { type: 'string', description: 'Recipient full name.' },
        subject: { type: 'string', description: 'Subject line.' },
        body: {
          type: 'string',
          description:
            'Full plain-text body. Line breaks become paragraphs in the branded template. ' +
            'Use {{DEPOSIT_LINK}} / {{WAIVER_LINK}} for links — never a literal URL.',
        },
        booking_ref: {
          type: 'string',
          description: 'Related booking reference. REQUIRED if the body uses a link placeholder.',
        },
      },
      required: ['to', 'customer_name', 'subject', 'body'],
    },
  },
  {
    name: 'draft_deposit_link',
    description:
      'Stage a $1,000 refundable security-deposit payment link for Serge to approve. This does NOT ' +
      'create the Stripe link or charge anyone — it queues the request. On approval, Stripe generates ' +
      'the link and Serge can text it to the customer. Look the booking up first to get its ID.',
    input_schema: {
      type: 'object',
      properties: {
        booking_id: { type: 'integer', description: 'Numeric booking id (from look_up_booking).' },
        amount: { type: 'number', description: 'Deposit amount in dollars. Defaults to 1000.' },
        also_email: {
          type: 'boolean',
          description: 'If true, email the link to the customer on approval. Default false — Serge usually texts it.',
        },
      },
      required: ['booking_id'],
    },
  },
];

const STAGING_TOOLS = new Set(['draft_email', 'draft_deposit_link']);
export const isStagingTool = (name: string) => STAGING_TOOLS.has(name);

// ── Link safety ────────────────────────────────────────────────────────────
// The model has no way to know a real Stripe checkout URL or waiver link — those
// only exist after the server generates them. Left to itself it will invent one
// that looks perfectly plausible (it did: a fake `cs_live_...` URL in an email to
// a real customer). A human skimming a wall of text will eventually approve one.
//
// So this is enforced in code, not in the prompt: any payment or waiver URL in a
// drafted body is REJECTED. The agent must write a placeholder instead, and the
// server substitutes the real, freshly-generated link at send time.

const FORBIDDEN_URL = /(checkout\.stripe\.com|stripe\.com\/c\/pay|\/waiver\/|buy\.stripe\.com)/i;

export const DEPOSIT_PLACEHOLDER = '{{DEPOSIT_LINK}}';
export const WAIVER_PLACEHOLDER = '{{WAIVER_LINK}}';

/**
 * The branded template already renders "Hey <FirstName>," above the body and a
 * sign-off below it. The model writes its own anyway, so the customer sees
 * "Hey Michael," immediately followed by "Hi Michael," — and a sign-off from Serge
 * personally rather than from the business.
 *
 * Telling the model not to isn't sufficient; it will drift back. So the greeting
 * and sign-off are stripped here, in code, on every draft and every edit.
 */
export function stripGreetingAndSignoff(body: string): string {
  let lines = body.split('\n');

  // Leading greeting: "Hi Michael," / "Hey Michael!" / "Hello Michael" / "Dear ..."
  while (lines.length && lines[0].trim() === '') lines.shift();
  if (lines.length && /^\s*(hi|hey|hello|dear|good (morning|afternoon|evening))\b[^.!?]{0,40}[,!]?\s*$/i.test(lines[0])) {
    lines.shift();
  }

  // Trailing sign-off block: a closing line ("Thanks," / "— Serge" / "Best,") plus
  // any name / company / location lines that follow it.
  const SIGNOFF_START = /^\s*[—–-]{0,2}\s*(thanks|thank you|best|cheers|warmly|sincerely|regards|talk soon|see you (soon|out there|on the water)|serge)\b/i;
  const SIGNOFF_TAIL = /^\s*[—–-]{0,2}\s*(serge|blue skies|islamorada|the blue skies team|team)\b/i;

  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();

  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 6); i--) {
    if (SIGNOFF_START.test(lines[i])) {
      // Everything from the closing line down is the signature — drop it.
      lines = lines.slice(0, i);
      break;
    }
    if (!SIGNOFF_TAIL.test(lines[i]) && lines[i].trim() !== '') break;
  }

  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  return lines.join('\n').trim();
}

/**
 * The single source of truth for what may appear in an email body. Used both when
 * the AGENT drafts one and when SERGE edits one, so neither path can introduce a
 * fabricated payment link. Returns an error string, or null if the body is fine.
 */
export function checkEmailBody(body: string): string | null {
  if (FORBIDDEN_URL.test(body)) {
    return (
      'That body contains a payment or waiver URL typed out in full. Those links must be ' +
      `generated by the server, so use ${DEPOSIT_PLACEHOLDER} or ${WAIVER_PLACEHOLDER} instead — ` +
      'the real URL is inserted when you approve.'
    );
  }
  return null;
}

/**
 * A branded, tappable button — never a raw URL. A 200-character Stripe link
 * dumped into an email body looks like phishing and is unusable on a phone.
 */
export function linkButton(href: string, label: string): string {
  return (
    `<a href="${href}" style="display:inline-block;background:#0ea5e9;color:#ffffff;` +
    `padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;` +
    `font-size:15px;margin:8px 0;">${label}</a>`
  );
}

/** Replaces placeholders with REAL links. Called at send time, never before. */
async function resolveLinks(body: string, bookingRef: string | null): Promise<string> {
  let out = body;

  if (out.includes(WAIVER_PLACEHOLDER)) {
    if (!bookingRef) throw new Error('Cannot build a waiver link without a booking reference.');
    const appUrl = process.env.APP_URL || 'https://www.blueskiesboatrentals.com';
    out = out.replaceAll(
      WAIVER_PLACEHOLDER,
      linkButton(`${appUrl}/waiver/${bookingRef}?renter=1`, 'Sign Your Rental Agreement'),
    );
  }

  if (out.includes(DEPOSIT_PLACEHOLDER)) {
    if (!bookingRef) throw new Error('Cannot build a deposit link without a booking reference.');
    const [booking] = await db.select().from(schema.bookings)
      .where(eq(schema.bookings.bookingRef, bookingRef));
    if (!booking) throw new Error(`No booking ${bookingRef} to build a deposit link for.`);

    // A real Stripe session, minted here, at send time.
    const amount = booking.depositAmount ?? 1000;
    const link = await createDepositLink(booking.id, amount);
    out = out.replaceAll(
      DEPOSIT_PLACEHOLDER,
      linkButton(link.checkoutUrl, `Pay $${amount.toLocaleString()} Security Deposit`),
    );
  }

  return out;
}

// --- Read handlers -------------------------------------------------------

async function lookUpBooking(query: string) {
  const q = query.trim();

  // An empty or 1-char query would ILIKE-match every booking and hand the model
  // the whole customer list. Make it ask a real question.
  if (q.length < 2) {
    return { found: false, message: 'Search needs at least 2 characters (a booking ref or a name).' };
  }

  // Escape LIKE wildcards so a name containing % or _ is matched literally.
  const escaped = q.replace(/[\\%_]/g, ch => `\\${ch}`);

  const rows = await db.select().from(schema.bookings)
    .where(sql`upper(${schema.bookings.bookingRef}) = upper(${q})
               or ${schema.bookings.customerName} ilike ${'%' + escaped + '%'} escape '\\'`)
    .orderBy(desc(schema.bookings.charterDate))
    .limit(5);

  if (rows.length === 0) return { found: false, message: `No booking matches "${q}".` };

  const boats = await db.select().from(schema.boats);
  const boatName = (id: number) => boats.find(b => b.id === id)?.name ?? 'Unknown boat';

  return {
    found: true,
    bookings: rows.map(b => ({
      booking_id: b.id,
      booking_ref: b.bookingRef,
      customer_name: b.customerName,
      customer_email: b.customerEmail,
      customer_phone: b.customerPhone,
      boat: boatName(b.boatId),
      charter_date: b.charterDate,
      end_date: b.endDate,
      guests: b.guestCount,
      total: b.total,
      source: b.source,
      status: b.status,
      payment_status: b.paymentStatus,
      deposit_status: b.depositStatus,
      deposit_amount: b.depositAmount,
      agreement_signed: b.agreedToTerms,
    })),
  };
}

async function listBookings(args: { deposit_status?: string; upcoming_only?: boolean; limit?: number }) {
  const conditions = [];
  if (args.deposit_status) {
    conditions.push(eq(schema.bookings.depositStatus, args.deposit_status as never));
  }
  if (args.upcoming_only) {
    conditions.push(gte(schema.bookings.charterDate, new Date().toISOString().split('T')[0]));
  }

  const rows = await db.select().from(schema.bookings)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.bookings.charterDate))
    .limit(Math.min(args.limit ?? 20, 50));

  return {
    count: rows.length,
    bookings: rows.map(b => ({
      booking_id: b.id,
      booking_ref: b.bookingRef,
      customer_name: b.customerName,
      customer_email: b.customerEmail,
      charter_date: b.charterDate,
      total: b.total,
      status: b.status,
      deposit_status: b.depositStatus,
      deposit_amount: b.depositAmount,
    })),
  };
}

// --- Staging handlers ----------------------------------------------------
// These write a pending row and return. They never call Resend or Stripe.

async function stageAction(
  kind: 'send_email' | 'deposit_link',
  summary: string,
  payload: unknown,
  bookingRef?: string | null,
) {
  const [row] = await db.insert(schema.agentActions).values({
    kind,
    status: 'pending',
    summary,
    payload: JSON.stringify(payload),
    bookingRef: bookingRef ?? null,
  }).returning({ id: schema.agentActions.id });

  return {
    staged: true,
    action_id: row.id,
    status: 'pending_approval',
    note: 'NOT sent. This is queued and will only go out if Serge approves it in the admin panel.',
    summary,
  };
}

// --- Dispatch ------------------------------------------------------------

export async function runAgentTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'look_up_booking':
      return lookUpBooking(String(input.query ?? ''));

    case 'list_bookings':
      return listBookings(input as never);

    case 'draft_email': {
      const to = String(input.to ?? '');
      const subject = String(input.subject ?? '');
      // The template supplies the greeting and the sign-off — remove the model's.
      const body = stripGreetingAndSignoff(String(input.body ?? ''));
      const ref = input.booking_ref ? String(input.booking_ref) : null;

      // Hard block: the agent cannot know a real payment or waiver URL, so any it
      // writes is fabricated. Refuse and tell it to use the placeholders.
      if (FORBIDDEN_URL.test(body)) {
        return {
          error:
            'REJECTED: you wrote a payment or waiver URL into the email body. You cannot know a ' +
            'real one — those are generated by the server when the email is approved, and anything ' +
            'you invent will be a dead link for the customer. Rewrite the body using the exact ' +
            `placeholders ${DEPOSIT_PLACEHOLDER} and/or ${WAIVER_PLACEHOLDER} where the links should ` +
            'go, and pass booking_ref. The real links are substituted at send time.',
        };
      }

      if ((body.includes(DEPOSIT_PLACEHOLDER) || body.includes(WAIVER_PLACEHOLDER)) && !ref) {
        return { error: 'A booking_ref is required when the body uses a link placeholder.' };
      }

      return stageAction(
        'send_email',
        `Email to ${to} — "${subject}"`,
        { to, customerName: String(input.customer_name ?? ''), subject, body, bookingRef: ref },
        ref,
      );
    }

    case 'draft_deposit_link': {
      const bookingId = Number(input.booking_id);
      if (!Number.isInteger(bookingId)) {
        return { error: 'booking_id must be a numeric booking id from look_up_booking.' };
      }
      const [booking] = await db.select().from(schema.bookings)
        .where(eq(schema.bookings.id, bookingId));
      if (!booking) return { error: `No booking with id ${bookingId}.` };

      // Default to the booking's OWN deposit amount, never a hardcoded 1000.
      // Hardcoding it meant a booking with a $2,500 deposit would be charged
      // $1,000 and have its real amount overwritten, so the post-trip refund
      // would then settle against the wrong figure.
      const amount = typeof input.amount === 'number'
        ? input.amount
        : (booking.depositAmount ?? 1000);

      // The model supplies this number. Never let an implausible one reach Stripe.
      if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) {
        return {
          error: `Deposit amount $${amount} is not allowed. It must be between $1 and $10,000. ` +
                 `The booking's own deposit is $${booking.depositAmount ?? 1000}.`,
        };
      }

      return stageAction(
        'deposit_link',
        `$${amount.toLocaleString()} deposit link for ${booking.customerName} (${booking.bookingRef})`,
        {
          bookingId,
          amount,
          alsoEmail: input.also_email === true,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
        },
        booking.bookingRef,
      );
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// --- Execution (approval-gated) ------------------------------------------
// The ONLY place Resend and Stripe are actually called on the agent's behalf.
// Reachable exclusively from the approveAction mutation.

export async function executeAction(actionId: number): Promise<{ ok: boolean; result: unknown }> {
  // Atomically CLAIM the action: flip pending -> executing in a single conditional
  // UPDATE and only proceed if this call is the one that changed the row. A
  // read-then-write check would let two concurrent approvals (double-click, two
  // tabs, a retried request) both see 'pending' and both send.
  const claimed = await db.update(schema.agentActions)
    .set({ status: 'executing' })
    .where(and(
      eq(schema.agentActions.id, actionId),
      eq(schema.agentActions.status, 'pending'),
    ))
    .returning();

  if (claimed.length === 0) {
    const [existing] = await db.select().from(schema.agentActions)
      .where(eq(schema.agentActions.id, actionId));
    if (!existing) throw new Error(`Action ${actionId} not found.`);
    throw new Error(`Action ${actionId} is already ${existing.status} — it cannot be run again.`);
  }

  const action = claimed[0];
  const payload = JSON.parse(action.payload);
  const now = new Date().toISOString();

  const fail = async (message: string, partial?: Record<string, unknown>) => {
    await db.update(schema.agentActions).set({
      status: 'failed',
      result: JSON.stringify({ error: message, ...partial }),
      resolvedAt: now,
    }).where(eq(schema.agentActions.id, actionId));
    throw new Error(message);
  };

  if (action.kind === 'send_email') {
    // Single step. If it throws, nothing was delivered, so this is safe to retry
    // and the drafted body is preserved in payload for another attempt.
    try {
      // Swap {{DEPOSIT_LINK}} / {{WAIVER_LINK}} for real, server-generated URLs.
      // The customer can only ever receive a link the server actually made.
      const body = await resolveLinks(payload.body, payload.bookingRef ?? null);

      await sendMarketingEmail({
        to: payload.to,
        name: payload.customerName,
        subject: payload.subject,
        message: body,
        template: 'custom',
        bookingRef: payload.bookingRef ?? null,   // so it lands on the booking's timeline
      });
    } catch (err) {
      await fail(err instanceof Error ? err.message : String(err));
    }

    const result = { sent_to: payload.to, subject: payload.subject };
    await db.update(schema.agentActions).set({
      status: 'approved', result: JSON.stringify(result), resolvedAt: now,
    }).where(eq(schema.agentActions.id, actionId));
    return { ok: true, result };
  }

  if (action.kind === 'deposit_link') {
    let link;
    try {
      link = await createDepositLink(payload.bookingId, payload.amount);
    } catch (err) {
      // Stripe never created a session, so nothing is stranded. Retryable.
      await fail(err instanceof Error ? err.message : String(err));
      throw err; // unreachable; keeps TS narrowing happy
    }

    // Persist the checkout URL the INSTANT it exists, before attempting the
    // optional email. Previously a failing email discarded the whole result,
    // leaving a live Stripe session nobody could reach.
    const result: Record<string, unknown> = {
      checkoutUrl: link.checkoutUrl,
      amount: link.amount,
      bookingRef: link.bookingRef,
    };
    await db.update(schema.agentActions).set({
      status: 'approved', result: JSON.stringify(result), resolvedAt: now,
    }).where(eq(schema.agentActions.id, actionId));

    if (payload.alsoEmail) {
      try {
        await sendMarketingEmail({
          to: link.customerEmail,
          name: link.customerName,
          bookingRef: link.bookingRef,
          subject: `Security deposit for your Blue Skies charter (${link.bookingRef})`,
          message:
            `Your $${link.amount.toLocaleString()} refundable security deposit for trip ${link.bookingRef} ` +
            `can be paid here:\n\n` +
            linkButton(link.checkoutUrl, `Pay $${link.amount.toLocaleString()} Security Deposit`) +
            `\n\nThis is fully refunded after your post-trip inspection, minus any damage or fuel.\n\n` +
            `This link expires in 24 hours — let us know if you need a fresh one.`,
          template: 'custom',
        });
        result.emailed_to = link.customerEmail;
      } catch (err) {
        // The link is real and already saved — surface the email failure without
        // throwing it away. Serge can still copy the URL and text it.
        result.emailError = err instanceof Error ? err.message : String(err);
      }
      await db.update(schema.agentActions).set({
        result: JSON.stringify(result),
      }).where(eq(schema.agentActions.id, actionId));
    }

    return { ok: true, result };
  }

  await fail(`Unknown action kind: ${action.kind}`);
  throw new Error('unreachable');
}

// A failed action is safe to retry: send_email throws before delivering, and a
// failed deposit_link means Stripe never created a session. Puts it back in the
// queue rather than destroying the agent's drafted work.
export async function retryAction(actionId: number) {
  const restored = await db.update(schema.agentActions)
    .set({ status: 'pending', result: null, resolvedAt: null })
    .where(and(
      eq(schema.agentActions.id, actionId),
      eq(schema.agentActions.status, 'failed'),
    ))
    .returning();

  if (restored.length === 0) throw new Error('Only a failed action can be retried.');
  return executeAction(actionId);
}

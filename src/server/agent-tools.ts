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
      'Write the full final body; do not use placeholders like [name]. Tell Serge afterward that the ' +
      'draft is waiting for his approval.',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address.' },
        customer_name: { type: 'string', description: 'Recipient full name.' },
        subject: { type: 'string', description: 'Subject line.' },
        body: {
          type: 'string',
          description: 'Full plain-text body. Line breaks become paragraphs in the branded template.',
        },
        booking_ref: { type: 'string', description: 'Related booking reference, if any.' },
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
      const ref = input.booking_ref ? String(input.booking_ref) : null;
      return stageAction(
        'send_email',
        `Email to ${to} — "${subject}"`,
        {
          to,
          customerName: String(input.customer_name ?? ''),
          subject,
          body: String(input.body ?? ''),
          bookingRef: ref,
        },
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
      await sendMarketingEmail({
        to: payload.to,
        name: payload.customerName,
        subject: payload.subject,
        message: payload.body,
        template: 'custom',
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
          subject: `Security deposit for your Blue Skies charter (${link.bookingRef})`,
          message:
            `Your $${link.amount.toLocaleString()} refundable security deposit for trip ${link.bookingRef} ` +
            `can be paid here:\n\n${link.checkoutUrl}\n\n` +
            `This is fully refunded after your post-trip inspection, minus any damage or fuel.\n\n` +
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

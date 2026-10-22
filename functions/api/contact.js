// POST /api/contact
// 1. Verifies the Cloudflare Turnstile token.
// 2. Validates the submission and saves it to D1, so no lead is lost.
// 3. Queues an email job; the form-email-consumer Worker sends it to service@dakotahorizons.com.
// htmx requests get an HTML fragment back. Plain form posts (no JavaScript) get a redirect or an error page.

import {
  errorFragment,
  errorPage,
  isHtmxRequest,
  methodNotAllowedFragment,
  redirectResponse,
  successFragment
} from "../_lib/html-response.mjs";
import { buildContactEmailMessage, enqueueFormEmail } from "../_lib/form-email-queue.mjs";
import { isHoneypotFilled, validateContactSubmission } from "../_lib/form-validation.mjs";
import { verifyTurnstileToken } from "../_lib/turnstile.mjs";

const SUCCESS_MESSAGE = "Thanks, your message is on its way. We will get back to you within one business day.";
const SAVED_ONLY_MESSAGE = "Thanks, your message was received. We will get back to you within one business day.";
const FAILURE_MESSAGE = "We could not send your message right now. Please try again in a few minutes.";

export function onRequest() {
  return methodNotAllowedFragment();
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const htmx = isHtmxRequest(request);
  const fail = (message, status) => (htmx ? errorFragment(message, status) : errorPage(message, status));
  const succeed = (message) => (htmx ? successFragment(message) : redirectResponse(request, "/thanks/"));

  try {
    let formData;
    try {
      formData = await request.formData();
    } catch {
      return fail("Please submit the form from the website.", 400);
    }

    // Bots that fill the hidden field get a normal-looking success and nothing is stored or sent.
    if (isHoneypotFilled(formData)) {
      return succeed(SUCCESS_MESSAGE);
    }

    const turnstile = await verifyTurnstileToken(env, formData, request);
    if (!turnstile.success) {
      return fail(turnstile.message, 403);
    }

    const result = validateContactSubmission(formData);
    if (!result.ok) {
      return fail(result.message, 400);
    }

    const submissionId = await insertContactSubmission(env, request, result.value);

    try {
      await enqueueFormEmail(env, buildContactEmailMessage(submissionId, result.value));
    } catch (queueError) {
      console.error("contact email enqueue failed", { submissionId, error: String(queueError) });
      return succeed(SAVED_ONLY_MESSAGE);
    }

    return succeed(SUCCESS_MESSAGE);
  } catch (error) {
    console.error("contact submission failed", error);
    return fail(FAILURE_MESSAGE, 500);
  }
}

async function insertContactSubmission(env, request, submission) {
  if (!env?.DB) {
    throw new Error("DB binding is not configured");
  }

  const result = await env.DB.prepare(`
    INSERT INTO contact_submissions (
      name,
      email,
      phone,
      business,
      interest,
      message,
      user_agent,
      ip_address
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      submission.name,
      submission.email,
      submission.phone,
      submission.business,
      submission.interest,
      submission.message,
      request.headers.get("user-agent"),
      request.headers.get("cf-connecting-ip")
    )
    .run();

  return result.meta.last_row_id;
}

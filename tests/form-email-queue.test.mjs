import assert from "node:assert/strict";
import test from "node:test";

import { buildContactEmailMessage, enqueueFormEmail } from "../functions/_lib/form-email-queue.mjs";

const submission = {
  name: "Jane Owner",
  email: "jane@example.com",
  phone: null,
  business: "Jane's Bakery",
  interest: "Paid social",
  message: "We want more catering orders."
};

test("builds a contact queue message", () => {
  const message = buildContactEmailMessage(42, submission);
  assert.equal(message.type, "contact");
  assert.equal(message.submissionId, 42);
  assert.match(message.submittedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(message.payload, submission);
});

test("rejects an invalid submission id", () => {
  assert.throws(() => buildContactEmailMessage(0, submission));
});

test("enqueue fails loudly without a queue binding", async () => {
  await assert.rejects(() => enqueueFormEmail({}, { type: "contact" }), /FORM_EMAIL_QUEUE/);
});

test("enqueue sends to the queue binding", async () => {
  const sent = [];
  await enqueueFormEmail({ FORM_EMAIL_QUEUE: { send: async (m) => sent.push(m) } }, { type: "contact" });
  assert.deepEqual(sent, [{ type: "contact" }]);
});

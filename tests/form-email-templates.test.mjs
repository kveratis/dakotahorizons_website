import assert from "node:assert/strict";
import test from "node:test";

import { FROM_ADDRESS, TO_ADDRESS, renderEmail } from "../workers/form-email-consumer/src/email-templates.mjs";

const message = {
  type: "contact",
  submissionId: 7,
  submittedAt: "2026-10-22T15:00:00.000Z",
  payload: {
    name: "Jane <Owner>",
    email: "jane@example.com",
    phone: null,
    business: "Jane's Bakery",
    interest: "Paid social",
    message: "Line one\nLine two"
  }
};

test("renders a contact email to service@dakotahorizons.com", () => {
  const email = renderEmail(message);
  assert.equal(TO_ADDRESS, "service@dakotahorizons.com");
  assert.equal(email.to, TO_ADDRESS);
  assert.equal(email.from, FROM_ADDRESS);
  assert.equal(email.replyTo, "jane@example.com");
  assert.equal(email.subject, "New inquiry from Jane <Owner> (Jane's Bakery)");
  assert.match(email.text, /Phone: Not provided/);
  assert.match(email.html, /Jane &lt;Owner&gt;/);
  assert.match(email.html, /Line one<br>Line two/);
});

test("strips line breaks from the subject", () => {
  const email = renderEmail({ ...message, payload: { ...message.payload, name: "A\r\nBcc: x@y.z", business: null } });
  assert.doesNotMatch(email.subject, /[\r\n]/);
});

test("rejects unknown message types", () => {
  assert.throws(() => renderEmail({ type: "other" }));
});

import assert from "node:assert/strict";
import test from "node:test";

import { onRequestPost } from "../functions/api/contact.js";

function makeEnv({ queueFails = false } = {}) {
  const inserted = [];
  const queued = [];
  return {
    inserted,
    queued,
    TURNSTILE_SECRET_KEY: "test-secret",
    DB: {
      prepare: () => ({
        bind: (...values) => ({
          run: async () => {
            inserted.push(values);
            return { meta: { last_row_id: inserted.length } };
          }
        })
      })
    },
    FORM_EMAIL_QUEUE: {
      send: async (m) => {
        if (queueFails) throw new Error("queue down");
        queued.push(m);
      }
    }
  };
}

function makeRequest(fields, htmx = true) {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.append(k, v);
  const headers = htmx ? { "HX-Request": "true" } : {};
  return new Request("https://dakotahorizons.com/api/contact", { method: "POST", body, headers });
}

const valid = { name: "Jane", email: "jane@example.com", message: "Hello", "cf-turnstile-response": "token" };

function mockTurnstile(success) {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ success }));
  return () => { globalThis.fetch = original; };
}

test("saves, queues and returns a success fragment", async () => {
  const restore = mockTurnstile(true);
  const env = makeEnv();
  const res = await onRequestPost({ request: makeRequest(valid), env });
  restore();
  assert.equal(res.status, 200);
  assert.match(await res.text(), /form-success/);
  assert.equal(env.inserted.length, 1);
  assert.equal(env.queued.length, 1);
  assert.equal(env.queued[0].submissionId, 1);
});

test("redirects to /thanks/ for a plain form post", async () => {
  const restore = mockTurnstile(true);
  const res = await onRequestPost({ request: makeRequest(valid, false), env: makeEnv() });
  restore();
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("location"), "https://dakotahorizons.com/thanks/");
});

test("rejects a failed Turnstile check without saving", async () => {
  const restore = mockTurnstile(false);
  const env = makeEnv();
  const res = await onRequestPost({ request: makeRequest(valid), env });
  restore();
  assert.equal(res.status, 403);
  assert.equal(env.inserted.length, 0);
});

test("still reports the lead as saved when the queue fails", async () => {
  const restore = mockTurnstile(true);
  const env = makeEnv({ queueFails: true });
  const res = await onRequestPost({ request: makeRequest(valid), env });
  restore();
  assert.equal(res.status, 200);
  assert.match(await res.text(), /was saved/);
  assert.equal(env.inserted.length, 1);
});

test("silently drops honeypot submissions", async () => {
  const env = makeEnv();
  const res = await onRequestPost({ request: makeRequest({ ...valid, website: "spam" }), env });
  assert.equal(res.status, 200);
  assert.equal(env.inserted.length, 0);
});

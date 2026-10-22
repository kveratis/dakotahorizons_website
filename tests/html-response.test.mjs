import assert from "node:assert/strict";
import test from "node:test";

import { errorFragment, errorPage, isHtmxRequest, redirectResponse, successFragment } from "../functions/_lib/html-response.mjs";

test("fragments escape HTML", async () => {
  const res = errorFragment("<b>bad</b>", 400);
  assert.equal(res.status, 400);
  assert.equal(await res.text(), '<div class="form-error" role="alert">&lt;b&gt;bad&lt;/b&gt;</div>');
  assert.match(await successFragment("ok").text(), /form-success/);
});

test("error page is a full document", async () => {
  const html = await errorPage("Nope", 500).text();
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /Nope/);
});

test("redirects with 303 to an absolute URL", () => {
  const res = redirectResponse(new Request("https://dakotahorizons.com/api/contact"), "/thanks/");
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("location"), "https://dakotahorizons.com/thanks/");
});

test("detects htmx requests", () => {
  assert.equal(isHtmxRequest(new Request("https://x.test", { headers: { "HX-Request": "true" } })), true);
  assert.equal(isHtmxRequest(new Request("https://x.test")), false);
});

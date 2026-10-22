import assert from "node:assert/strict";
import test from "node:test";

import { isHoneypotFilled, readString, validateContactSubmission } from "../functions/_lib/form-validation.mjs";

function form(fields) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

test("accepts a complete submission and normalizes it", () => {
  const result = validateContactSubmission(form({
    name: "  Jane Owner ",
    email: "Jane@Example.com",
    phone: "605-555-1234",
    business: "Jane's Bakery",
    interest: "Paid social",
    message: "We want more catering orders."
  }));

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    name: "Jane Owner",
    email: "jane@example.com",
    phone: "605-555-1234",
    business: "Jane's Bakery",
    interest: "Paid social",
    message: "We want more catering orders."
  });
});

test("optional fields become null when empty", () => {
  const result = validateContactSubmission(form({ name: "Sam", email: "sam@example.com", message: "Hi" }));
  assert.equal(result.ok, true);
  assert.equal(result.value.phone, null);
  assert.equal(result.value.business, null);
  assert.equal(result.value.interest, null);
});

test("rejects an unknown interest value by storing null", () => {
  const result = validateContactSubmission(form({ name: "Sam", email: "sam@example.com", message: "Hi", interest: "<script>" }));
  assert.equal(result.value.interest, null);
});

test("requires name, valid email and message", () => {
  assert.equal(validateContactSubmission(form({ email: "a@b.co", message: "x" })).ok, false);
  assert.equal(validateContactSubmission(form({ name: "A", email: "not-an-email", message: "x" })).ok, false);
  assert.equal(validateContactSubmission(form({ name: "A", email: "a@b.co" })).ok, false);
});

test("truncates long values", () => {
  assert.equal(readString("x".repeat(300), 120).length, 120);
});

test("detects a filled honeypot", () => {
  assert.equal(isHoneypotFilled(form({ website: "spam.example" })), true);
  assert.equal(isHoneypotFilled(form({ website: "" })), false);
});

test("accepts the Privacy request topic", () => {
  const result = validateContactSubmission(form({ name: "Sam", email: "sam@example.com", message: "Please delete my data.", interest: "Privacy request" }));
  assert.equal(result.ok, true);
  assert.equal(result.value.interest, "Privacy request");
});

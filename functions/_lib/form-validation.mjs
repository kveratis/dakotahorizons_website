const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const INTEREST_OPTIONS = [
  "Not sure yet",
  "Strategy and planning",
  "Content creation",
  "Community management",
  "Paid social",
  "Full social media management"
];

export function readString(value, maxLength) {
  assertMaxLength(maxLength);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

export function readOptionalString(value, maxLength) {
  const text = readString(value, maxLength);
  return text.length > 0 ? text : null;
}

export function validateEmail(email) {
  return EMAIL_PATTERN.test(email);
}

export function isHoneypotFilled(formData) {
  return readString(formData.get("website"), 200).length > 0;
}

export function validateContactSubmission(formData) {
  const name = readString(formData.get("name"), 120);
  const email = readString(formData.get("email"), 200).toLowerCase();
  const message = readString(formData.get("message"), 5000);

  if (!name) {
    return { ok: false, message: "Please enter your name." };
  }

  if (!validateEmail(email)) {
    return { ok: false, message: "Please enter a valid email address." };
  }

  if (!message) {
    return { ok: false, message: "Please tell us a little about what you need." };
  }

  const interestRaw = readString(formData.get("interest"), 80);
  const interest = INTEREST_OPTIONS.includes(interestRaw) ? interestRaw : null;

  return {
    ok: true,
    value: {
      name,
      email,
      phone: readOptionalString(formData.get("phone"), 40),
      business: readOptionalString(formData.get("business"), 160),
      interest,
      message
    }
  };
}

function assertMaxLength(maxLength) {
  if (!Number.isInteger(maxLength) || maxLength < 1) {
    throw new Error("maxLength must be a positive integer");
  }
}

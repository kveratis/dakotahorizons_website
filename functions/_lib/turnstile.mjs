const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const FALLBACK = "Please email us directly at service@dakotahorizons.com.";

export async function verifyTurnstileToken(env, formData, request) {
  const secretKey = env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.error("TURNSTILE_SECRET_KEY is not configured");
    return { success: false, message: `Bot protection is misconfigured. ${FALLBACK}` };
  }

  const token = formData.get("cf-turnstile-response");
  if (!token) {
    return { success: false, message: "Bot verification failed. Please refresh the page and try again." };
  }

  const body = new URLSearchParams();
  body.append("secret", secretKey);
  body.append("response", token);
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) {
    body.append("remoteip", ip);
  }

  try {
    const result = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });
    const outcome = await result.json();

    if (!outcome.success) {
      console.warn("Turnstile verification failed", outcome["error-codes"]);
      return { success: false, message: "Bot verification failed. Please refresh the page and try again." };
    }

    return { success: true };
  } catch (error) {
    console.error("Turnstile verification request failed", error);
    return { success: false, message: `Bot verification is temporarily unavailable. ${FALLBACK}` };
  }
}

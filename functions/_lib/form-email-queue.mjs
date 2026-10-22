export function buildContactEmailMessage(submissionId, submission) {
  assertSubmissionId(submissionId);

  return {
    type: "contact",
    submissionId,
    submittedAt: new Date().toISOString(),
    payload: {
      name: submission.name,
      email: submission.email,
      phone: submission.phone,
      business: submission.business,
      interest: submission.interest,
      message: submission.message
    }
  };
}

export async function enqueueFormEmail(env, message) {
  if (!env?.FORM_EMAIL_QUEUE) {
    throw new Error("FORM_EMAIL_QUEUE binding is not configured");
  }

  await env.FORM_EMAIL_QUEUE.send(message);
}

function assertSubmissionId(submissionId) {
  if (!Number.isInteger(submissionId) || submissionId < 1) {
    throw new Error("submissionId must be a positive integer");
  }
}

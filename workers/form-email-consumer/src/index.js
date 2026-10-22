import { renderEmail } from "./email-templates.mjs";

export default {
  async queue(batch, env) {
    for (const message of batch.messages) {
      try {
        const email = renderEmail(message.body);
        await env.EMAIL.send({
          from: email.from,
          to: email.to,
          replyTo: email.replyTo,
          subject: email.subject,
          text: email.text,
          html: email.html
        });
        message.ack();
      } catch (error) {
        console.error("form email send failed", {
          submissionId: message.body?.submissionId,
          attempts: message.attempts,
          error: String(error)
        });
        // Retried up to max_retries, then moved to the dead letter queue.
        message.retry();
      }
    }
  }
};

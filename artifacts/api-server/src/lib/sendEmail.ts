import { Resend } from "resend";
import { logger } from "./logger";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM ?? "IA Labs <onboarding@resend.dev>";

/**
 * sendEmail — transactional email via Resend.
 * Intentionally non-fatal: a failure must never interrupt the caller's request.
 */
export async function sendEmail(params: {
  email: string;
  subject: string;
  body: string;
}): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[email] To: ${params.email}\nSubject: ${params.subject}\n${params.body}\n`);
  }

  if (!resend) {
    logger.warn("RESEND_API_KEY not configured — email not sent");
    return;
  }

  try {
    await resend.emails.send({
      from: FROM,
      to: params.email,
      subject: params.subject,
      text: params.body,
    });
  } catch (err) {
    logger.error({ err, email: params.email }, "Failed to send email");
  }
}

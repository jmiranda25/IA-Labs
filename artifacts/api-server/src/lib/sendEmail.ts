/**
 * sendEmail — stub for transactional email.
 *
 * Replace with a real provider (Resend, SendGrid, Nodemailer, etc.) by reading
 * SMTP_* or RESEND_API_KEY from env and sending via their SDK here.
 * The function is intentionally non-fatal: a failure must never interrupt a request.
 */
export async function sendEmail(params: {
  email: string;
  subject: string;
  body: string;
}): Promise<void> {
  // Log in development so devs can see what would be sent
  if (process.env.NODE_ENV !== "production") {
    console.log(`[email] To: ${params.email}\nSubject: ${params.subject}\n${params.body}\n`);
  }
  // In production, integrate a real email provider here.
}

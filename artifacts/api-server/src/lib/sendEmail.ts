const CLERK_API = "https://api.clerk.com/v1";

export async function sendEmail(params: {
  clerkId: string;
  subject: string;
  body: string;
}): Promise<void> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return;

  try {
    const userRes = await fetch(`${CLERK_API}/users/${params.clerkId}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    if (!userRes.ok) return;

    const u = (await userRes.json()) as {
      primary_email_address_id?: string | null;
    };
    if (!u.primary_email_address_id) return;

    await fetch(`${CLERK_API}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address_id: u.primary_email_address_id,
        from_email_name: "noreply",
        subject: params.subject,
        body: params.body,
      }),
    });
  } catch {
    // Non-fatal: email failure must not interrupt the request
  }
}

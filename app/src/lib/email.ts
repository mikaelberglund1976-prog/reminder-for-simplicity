import { Resend } from "resend";
import { format } from "date-fns";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const APP_URL = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Send reminder email
export async function sendReminderEmail({
  to,
  name,
  reminderName,
  date,
  amount,
  currency = "SEK",
  note,
  reminderId,
}: {
  to: string;
  name: string | null;
  reminderName: string;
  date: Date;
  amount?: number | null;
  currency?: string | null;
  note?: string | null;
  reminderId: string;
}) {
  const firstName = name?.split(" ")[0] ?? "there";
  const formattedDate = format(date, "d MMMM yyyy");
  const daysLeft = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const dashboardUrl = `${APP_URL}/dashboard/${reminderId}`;

  const daysLabel =
    daysLeft === 0 ? "today" :
    daysLeft === 1 ? "tomorrow" :
    `in ${daysLeft} days`;

  const amountRow = amount
    ? `<tr>
        <td style="padding: 10px 0; color: #7C7C8A; font-size: 14px; border-bottom: 1px solid #E4E3DE;">Amount</td>
        <td style="padding: 10px 0; color: #1C1C28; font-size: 14px; font-weight: 600; text-align: right; border-bottom: 1px solid #E4E3DE;">${amount.toLocaleString("en")} ${currency}</td>
      </tr>`
    : "";

  const noteSection = note
    ? `<p style="margin: 24px 0 0; color: #7C7C8A; font-size: 14px; line-height: 1.6; font-style: italic;">"${note}"</p>`
    : "";

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Reminder: ${reminderName} — ${daysLabel}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="margin: 0; padding: 0; background-color: #F5F4F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">

        <div style="max-width: 560px; margin: 40px auto; padding: 0 20px;">

          <!-- Header -->
          <div style="text-align: center; padding: 32px 0 24px;">
            <span style="font-size: 24px;">🔔</span>
            <span style="display: block; margin-top: 8px; font-size: 14px; font-weight: 600; color: #1C1C28; letter-spacing: 0.01em;">AssistIQ</span>
          </div>

          <!-- Card -->
          <div style="background: #FFFFFF; border-radius: 16px; border: 1px solid #E4E3DE; padding: 40px;">

            <p style="margin: 0 0 24px; color: #7C7C8A; font-size: 15px;">Hi ${firstName},</p>

            <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #1C1C28; line-height: 1.2;">${reminderName}</h1>
            <p style="margin: 0 0 32px; font-size: 15px; color: #4A5FD5; font-weight: 600;">Due ${daysLabel}</p>

            <!-- Details table -->
            <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #E4E3DE;">
              <tr>
                <td style="padding: 10px 0; color: #7C7C8A; font-size: 14px; border-bottom: 1px solid #E4E3DE;">Date</td>
                <td style="padding: 10px 0; color: #1C1C28; font-size: 14px; font-weight: 600; text-align: right; border-bottom: 1px solid #E4E3DE;">${formattedDate}</td>
              </tr>
              ${amountRow}
            </table>

            ${noteSection}

            <!-- CTA -->
            <div style="text-align: center; margin-top: 36px;">
              <a href="${dashboardUrl}"
                style="display: inline-block; background: #4A5FD5; color: white; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-size: 15px; font-weight: 600;">
                View reminder →
              </a>
            </div>

          </div>

          <!-- Footer -->
          <div style="text-align: center; padding: 24px 0 40px;">
            <p style="margin: 0; font-size: 12px; color: #7C7C8A; line-height: 1.8;">
              You're receiving this because you set up a reminder in AssistIQ.<br>
              <a href="${APP_URL}/dashboard" style="color: #7C7C8A;">Manage reminders</a>
              &nbsp;·&nbsp;
              by Berget &amp; Fredde
            </p>
          </div>

        </div>
      </body>
      </html>
    `,
  });

  if (error) {
    console.error("Resend error (reminder):", error);
    throw new Error(error.message);
  }
}

// Send welcome email
export async function sendWelcomeEmail({
  to,
  name,
}: {
  to: string;
  name: string | null;
}) {
  const firstName = name?.split(" ")[0] ?? "there";

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Welcome to AssistIQ`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; background-color: #F5F4F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
        <div style="max-width: 560px; margin: 40px auto; padding: 0 20px;">

          <div style="text-align: center; padding: 32px 0 24px;">
            <span style="font-size: 24px;">🔔</span>
            <span style="display: block; margin-top: 8px; font-size: 14px; font-weight: 600; color: #1C1C28;">AssistIQ</span>
          </div>

          <div style="background: #FFFFFF; border-radius: 16px; border: 1px solid #E4E3DE; padding: 40px;">
            <h1 style="margin: 0 0 16px; font-size: 22px; color: #1C1C28;">Hi ${firstName} 👋</h1>
            <p style="color: #7C7C8A; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
              Welcome to AssistIQ. You're all set to start remembering the things that matter.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${APP_URL}/dashboard"
                style="display: inline-block; background: #4A5FD5; color: white; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-size: 15px; font-weight: 600;">
                Go to your dashboard →
              </a>
            </div>
          </div>

          <div style="text-align: center; padding: 24px 0 40px;">
            <p style="margin: 0; font-size: 12px; color: #7C7C8A;">
              AssistIQ · by Berget &amp; Fredde
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

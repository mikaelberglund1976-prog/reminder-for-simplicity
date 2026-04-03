import { Resend } from "resend";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@reminderapp.se";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Skicka påminnelse-email
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
  const firstName = name?.split(" ")[0] ?? "där";
  const formattedDate = format(date, "d MMMM yyyy", { locale: sv });
  const unsubscribeUrl = `${APP_URL}/api/reminders/${reminderId}/unsubscribe`;

  const amountSection = amount
    ? `<p style="margin: 8px 0; color: #666;">💰 Kostnad: <strong>${amount} ${currency}</strong></p>`
    : "";

  const noteSection = note
    ? `<p style="margin: 8px 0; color: #666;">📝 ${note}</p>`
    : "";

  await resend.emails.send({
    from: FROM,
    to,
    subject: `🔔 Påminnelse: ${reminderName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        </style>
      </head>
      <body style="background: #F8F9FC; padding: 40px 20px; margin: 0;">
        <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

          <div style="text-align: center; margin-bottom: 32px;">
            <span style="font-size: 40px;">🔔</span>
            <h1 style="margin: 12px 0 4px; color: #1A1A2E; font-size: 22px;">Du ville bli påmind</h1>
            <p style="margin: 0; color: #666;">Reminder for Simplicity</p>
          </div>

          <div style="background: #F8F9FC; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 12px; color: #1A1A2E; font-size: 20px;">${reminderName}</h2>
            <p style="margin: 8px 0; color: #666;">📅 Datum: <strong>${formattedDate}</strong></p>
            ${amountSection}
            ${noteSection}
          </div>

          <p style="color: #666; font-size: 14px; text-align: center; margin-top: 32px;">
            Hoppas det hjälper!<br>
            <strong style="color: #1A1A2E;">Reminder for Simplicity</strong>
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">

          <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            Vill du inte ha fler påminnelser för denna händelse?
            <a href="${unsubscribeUrl}" style="color: #4F6EF7;">Avregistrera</a>
          </p>
        </div>
      </body>
      </html>
    `,
  });
}

// Skicka välkomstmail
export async function sendWelcomeEmail({
  to,
  name,
}: {
  to: string;
  name: string | null;
}) {
  const firstName = name?.split(" ")[0] ?? "där";

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Välkommen till Reminder for Simplicity 👋`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F8F9FC; padding: 40px 20px; margin: 0;">
        <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

          <h1 style="color: #1A1A2E; margin-top: 0;">Hej ${firstName}! 👋</h1>

          <p style="color: #444; line-height: 1.6;">
            Kul att du är med. Nu kan du börja samla allt du inte vill glömma på ett ställe.
          </p>

          <p style="color: #444; line-height: 1.6;"><strong>Vad kan du lägga in?</strong></p>
          <ul style="color: #444; line-height: 2;">
            <li>💳 Abonnemang som förnyas</li>
            <li>🛡️ Försäkringar och avtal</li>
            <li>🎂 Födelsedagar och jubileum</li>
            <li>📌 Allt annat viktigt</li>
          </ul>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${APP_URL}/dashboard" style="background: #4F6EF7; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Gå till din dashboard →
            </a>
          </div>

          <p style="color: #666; font-size: 14px;">
            Hör av dig om du har frågor!
          </p>
        </div>
      </body>
      </html>
    `,
  });
}

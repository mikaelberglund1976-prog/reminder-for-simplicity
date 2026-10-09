import { Resend } from "resend";
import { getLocaleForEmail } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { DATE_LOCALES, type Locale } from "@/lib/i18n/config";
import { isManagedEmail } from "@/lib/managedProfile";

const resendClient = new Resend(process.env.RESEND_API_KEY);

// 2026-10-09: never send to a managed child profile's placeholder address
// (lib/managedProfile.ts) — it can't receive mail and would only bounce.
type SendArgs = Parameters<typeof resendClient.emails.send>[0];
const resend = {
  emails: {
    send: async (args: SendArgs) => {
      const to = (Array.isArray(args.to) ? args.to : [args.to]).filter((a) => !isManagedEmail(a));
      if (to.length === 0) return { data: null, error: null };
      return resendClient.emails.send({ ...args, to } as SendArgs);
    },
  },
};

const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const APP_URL = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// 2026-10-04: emails are written in the recipient's family language (or the
// language of the request when they have no family yet). Pass `locale` to
// override. Admin-only emails to Mikael stay in English.
async function lang(to: string, locale?: Locale) {
  const l = locale ?? (await getLocaleForEmail(to));
  const m = getMessages(l);
  return {
    l,
    t: m.emails,
    d: (date: Date) => date.toLocaleDateString(DATE_LOCALES[l], { day: "numeric", month: "long", year: "numeric" }),
  };
}

const CATEGORY_ICONS: Record<string, string> = {
  SUBSCRIPTION: "💳",
  BIRTHDAY: "🎂",
  INSURANCE: "🛡️",
  CONTRACT: "📄",
  HEALTH: "❤️",
  OTHER: "📌",
};

// ─── Reminder email ───────────────────────────────────────────────────────────

export async function sendReminderEmail({
  to,
  name,
  reminderName,
  date,
  amount,
  currency = "SEK",
  note,
  reminderId,
  category,
  locale,
}: {
  locale?: Locale;
  to: string;
  name: string | null;
  reminderName: string;
  date: Date;
  amount?: number | null;
  currency?: string | null;
  note?: string | null;
  reminderId: string;
  category?: string;
}) {
  const { l, t, d } = await lang(to, locale);
  const firstName = name?.split(" ")[0] ?? t.there;
  const formattedDate = d(date);
  const daysLeft = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const dashboardUrl = `${APP_URL}/dashboard/${reminderId}`;
  const icon = category ? (CATEGORY_ICONS[category] ?? "🔔") : "🔔";

  const urgencyColor =
    daysLeft <= 0 ? "#e53e3e" :
    daysLeft <= 3 ? "#dd6b20" :
    daysLeft <= 7 ? "#d69e2e" :
    "#4A5FD5";

  const daysLabel =
    daysLeft <= 0 ? t.reminder.dueToday :
    daysLeft === 1 ? t.reminder.dueTomorrow :
    t.reminder.dueIn(daysLeft);

  const urgencyBadge =
    daysLeft <= 0 ? `<span style="background:#fff0f0;color:#e53e3e;border:1px solid #fed7d7;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">${t.reminder.badgeToday}</span>` :
    daysLeft <= 3 ? `<span style="background:#fff8f0;color:#dd6b20;border:1px solid #fbd38d;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">⚠️ ${t.reminder.badgeDaysLeft(daysLeft)}</span>` :
    daysLeft <= 7 ? `<span style="background:#fffff0;color:#b7791f;border:1px solid #faf089;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">📅 ${t.reminder.badgeDaysLeft(daysLeft)}</span>` :
    `<span style="background:#ebf4ff;color:#4A5FD5;border:1px solid #bee3f8;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">📅 ${t.reminder.badgeDaysLeft(daysLeft)}</span>`;

  const amountRow = amount
    ? `<tr>
        <td style="padding:12px 0;color:#718096;font-size:14px;border-bottom:1px solid #EDF2F7;">${t.reminder.amount}</td>
        <td style="padding:12px 0;color:#1A202C;font-size:15px;font-weight:700;text-align:right;border-bottom:1px solid #EDF2F7;">
          ${amount.toLocaleString(DATE_LOCALES[l])} ${currency}
        </td>
      </tr>` : "";

  const noteSection = note
    ? `<div style="margin-top:20px;background:#F7FAFC;border-left:3px solid #4A5FD5;border-radius:0 8px 8px 0;padding:12px 16px;">
        <p style="margin:0;color:#718096;font-size:13px;font-style:italic;line-height:1.6;">"${note}"</p>
      </div>` : "";

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `${icon} ${reminderName} — ${daysLabel}`,
    html: `
<!DOCTYPE html>
<html lang="${t.htmlLang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${t.reminder.title}</title>
</head>
<body style="margin:0;padding:0;background:#F0F4FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <div style="max-width:560px;margin:0 auto;padding:32px 16px 48px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e3f8a 0%,#2e5ec8 100%);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
      <div style="font-size:32px;margin-bottom:6px;">${icon}</div>
      <div style="color:rgba(255,255,255,0.6);font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">Reminder for Simplicity</div>
      <div style="color:rgba(255,255,255,0.35);font-size:11px;">${t.tagline}</div>
    </div>

    <!-- Card -->
    <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:32px;box-shadow:0 4px 24px rgba(30,63,138,0.12);">

      <p style="margin:0 0 20px;color:#718096;font-size:15px;">${t.hi(firstName)}</p>

      <!-- Reminder name + badge -->
      <div style="margin-bottom:24px;">
        <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#1A202C;line-height:1.2;">${reminderName}</h1>
        ${urgencyBadge}
      </div>

      <!-- Details table -->
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #EDF2F7;">
        <tr>
          <td style="padding:12px 0;color:#718096;font-size:14px;border-bottom:1px solid #EDF2F7;">${t.reminder.date}</td>
          <td style="padding:12px 0;color:#1A202C;font-size:15px;font-weight:600;text-align:right;border-bottom:1px solid #EDF2F7;">${formattedDate}</td>
        </tr>
        ${amountRow}
      </table>

      ${noteSection}

      <!-- CTA -->
      <div style="text-align:center;margin-top:32px;">
        <a href="${dashboardUrl}"
          style="display:inline-block;background:linear-gradient(135deg,#4a7ee0,#2e5ec8);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:700;letter-spacing:-0.2px;box-shadow:0 4px 14px rgba(46,94,200,0.4);">
          ${t.reminder.view}
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0 0;">
      <p style="margin:0 0 6px;font-size:12px;color:#A0AEC0;line-height:1.8;">
        ${t.reminder.why}<br>
        <a href="${APP_URL}/dashboard" style="color:#A0AEC0;text-decoration:underline;">${t.reminder.manage}</a>
        &nbsp;·&nbsp;
        <span>${t.footerBy.replace("Reminder for Simplicity · ", "")}</span>
      </p>
    </div>

  </div>

</body>
</html>`,
  });

  if (error) {
    console.error("Resend error (reminder):", error);
    throw new Error(error.message);
  }
}

// ─── Household invite email ───────────────────────────────────────────────────

export async function sendHouseholdInviteEmail({
  to, fromName, householdName, joinUrl, expiresText, asChild = false, locale,
}: { to: string; fromName: string; householdName: string; joinUrl: string; expiresText?: string; asChild?: boolean; locale?: Locale }) {
  const { t } = await lang(to, locale);
  // Callers pass "48 hours" / "7 days" (English) — shown in the email's language.
  const expires = expiresText === "7 days" ? t.invite.days7 : expiresText === "48 hours" || !expiresText ? t.invite.hours48 : expiresText;
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: t.invite.subject(fromName, householdName),
    html: `
<!DOCTYPE html><html lang="${t.htmlLang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F0F4FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px 48px;">
  <div style="background:linear-gradient(135deg,#1e3f8a 0%,#2e5ec8 100%);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
    <div style="font-size:32px;margin-bottom:6px;">🏠</div>
    <div style="color:rgba(255,255,255,0.6);font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Reminder for Simplicity</div>
  </div>
  <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:32px;box-shadow:0 4px 24px rgba(30,63,138,0.12);">
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#1A202C;">${t.invite.title}</h1>
    <p style="color:#718096;font-size:15px;line-height:1.7;margin:0 0 8px;">
      ${t.invite.body(fromName, householdName)}
    </p>
    <p style="color:#718096;font-size:15px;line-height:1.7;margin:0 0 28px;">
      ${asChild ? t.invite.childBody : t.invite.adultBody}
    </p>
    <div style="text-align:center;">
      <a href="${joinUrl}" style="display:inline-block;background:linear-gradient(135deg,#4a7ee0,#2e5ec8);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:700;box-shadow:0 4px 14px rgba(46,94,200,0.4);">
        ${t.invite.accept}
      </a>
    </div>
    <p style="color:#A0AEC0;font-size:12px;text-align:center;margin:24px 0 0;">${t.invite.expires(expires)}</p>
  </div>
</div>
</body></html>`,
  });
  if (error) {
    console.error("Resend error (household invite):", error);
    throw new Error(error.message);
  }
}

// ─── Handover request email ───────────────────────────────────────────────────

export async function sendHandoverRequestEmail({
  to, toName, fromName, reminderName, reminderDate, acceptUrl, locale,
}: { to: string; toName: string | null; fromName: string; reminderName: string; reminderDate: Date; acceptUrl: string; locale?: Locale }) {
  const { t, d } = await lang(to, locale);
  const firstName = toName?.split(" ")[0] ?? t.there;
  const formattedDate = d(reminderDate);

  await resend.emails.send({
    from: FROM,
    to,
    subject: t.handover.requestSubject(fromName, reminderName),
    html: `
<!DOCTYPE html><html lang="${t.htmlLang}"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F0F4FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px 48px;">
  <div style="background:linear-gradient(135deg,#1e3f8a 0%,#2e5ec8 100%);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
    <div style="font-size:32px;margin-bottom:6px;">🤝</div>
    <div style="color:rgba(255,255,255,0.6);font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">${t.handover.requestHeader}</div>
  </div>
  <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:32px;box-shadow:0 4px 24px rgba(30,63,138,0.12);">
    <p style="margin:0 0 20px;color:#718096;font-size:15px;">${t.hi(firstName)}</p>
    <div style="background:#FFF9E6;border:1.5px solid #F6E05E;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#B7791F;text-transform:uppercase;letter-spacing:0.05em;">${t.handover.pending}</p>
      <p style="margin:0;font-size:17px;font-weight:800;color:#1A202C;">${reminderName}</p>
      <p style="margin:4px 0 0;font-size:14px;color:#718096;">${t.handover.due(formattedDate)}</p>
    </div>
    <p style="color:#718096;font-size:15px;line-height:1.7;margin:0 0 28px;">
      ${t.handover.requestBody(fromName)}
    </p>
    <div style="text-align:center;">
      <a href="${acceptUrl}" style="display:inline-block;background:linear-gradient(135deg,#4a7ee0,#2e5ec8);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:700;box-shadow:0 4px 14px rgba(46,94,200,0.4);">
        ${t.handover.review}
      </a>
    </div>
  </div>
</div>
</body></html>`,
  });
}

// ─── Handover response email ──────────────────────────────────────────────────

export async function sendHandoverResponseEmail({
  to, toName, responderName, reminderName, action, dashboardUrl, locale,
}: { to: string; toName: string | null; responderName: string; reminderName: string; action: "accepted" | "rejected"; dashboardUrl: string; locale?: Locale }) {
  const { t } = await lang(to, locale);
  const firstName = toName?.split(" ")[0] ?? t.there;
  const isAccepted = action === "accepted";

  await resend.emails.send({
    from: FROM,
    to,
    subject: t.handover.responseSubject(responderName, isAccepted, reminderName),
    html: `
<!DOCTYPE html><html lang="${t.htmlLang}"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F0F4FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px 48px;">
  <div style="background:linear-gradient(135deg,${isAccepted ? "#1e7d52 0%,#2a9d6f" : "#8B0000 0%,#C44444"} 100%);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
    <div style="font-size:32px;margin-bottom:6px;">${isAccepted ? "✅" : "❌"}</div>
    <div style="color:rgba(255,255,255,0.7);font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">${t.handover.responseHeader(isAccepted)}</div>
  </div>
  <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:32px;box-shadow:0 4px 24px rgba(30,63,138,0.12);">
    <p style="margin:0 0 16px;color:#718096;font-size:15px;">${t.hi(firstName)}</p>
    <p style="color:#1A202C;font-size:16px;font-weight:600;margin:0 0 24px;line-height:1.5;">
      ${t.handover.responseBody(responderName, isAccepted, reminderName, isAccepted ? "#2A9D6F" : "#D94F4F")}
    </p>
    ${isAccepted
      ? `<p style="color:#718096;font-size:14px;line-height:1.6;margin:0 0 28px;">${t.handover.offTheHook(responderName)}</p>`
      : `<p style="color:#718096;font-size:14px;line-height:1.6;margin:0 0 28px;">${t.handover.stillOwner}</p>`
    }
    <div style="text-align:center;">
      <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#4a7ee0,#2e5ec8);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:700;box-shadow:0 4px 14px rgba(46,94,200,0.4);">
        ${t.handover.view}
      </a>
    </div>
  </div>
</div>
</body></html>`,
  });
}

// ─── Password reset email ──────────────────────────────────────────────────────

export async function sendPasswordResetEmail({
  to, name, resetUrl, locale,
}: { to: string; name: string | null; resetUrl: string; locale?: Locale }) {
  const { t } = await lang(to, locale);
  const firstName = name?.split(" ")[0] ?? t.there;

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: t.reset.subject,
    html: `
<!DOCTYPE html>
<html lang="${t.htmlLang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F0F4FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <div style="max-width:560px;margin:0 auto;padding:32px 16px 48px;">

    <div style="background:linear-gradient(135deg,#1e3f8a 0%,#2e5ec8 100%);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
      <div style="font-size:32px;margin-bottom:6px;">🔑</div>
      <div style="color:rgba(255,255,255,0.6);font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Reminder for Simplicity</div>
    </div>

    <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:32px;box-shadow:0 4px 24px rgba(30,63,138,0.12);">
      <p style="margin:0 0 20px;color:#718096;font-size:15px;">${t.hi(firstName)}</p>
      <p style="color:#1A202C;font-size:15px;line-height:1.7;margin:0 0 8px;">
        ${t.reset.body}
      </p>
      <p style="color:#718096;font-size:14px;line-height:1.7;margin:0 0 28px;">
        ${t.reset.ignore}
      </p>
      <div style="text-align:center;margin-bottom:8px;">
        <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#4a7ee0,#2e5ec8);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:700;box-shadow:0 4px 14px rgba(46,94,200,0.4);">
          ${t.reset.button}
        </a>
      </div>
      <p style="color:#A0AEC0;font-size:12px;text-align:center;margin:24px 0 0;">${t.reset.expires}</p>
    </div>

  </div>

</body>
</html>`,
  });

  if (error) {
    console.error("Resend error (password reset):", error);
    throw new Error(error.message);
  }
}

// ─── Welcome email ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail({ to, name, locale }: { to: string; name: string | null; locale?: Locale }) {
  const { t } = await lang(to, locale);
  const firstName = name?.split(" ")[0] ?? t.there;

  await resend.emails.send({
    from: FROM,
    to,
    subject: t.welcome.subject,
    html: `
<!DOCTYPE html>
<html lang="${t.htmlLang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F0F4FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <div style="max-width:560px;margin:0 auto;padding:32px 16px 48px;">

    <div style="background:linear-gradient(135deg,#1e3f8a 0%,#2e5ec8 100%);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
      <div style="font-size:36px;margin-bottom:6px;">🔔</div>
      <div style="color:rgba(255,255,255,0.6);font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Reminder for Simplicity</div>
    </div>

    <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:36px 32px;box-shadow:0 4px 24px rgba(30,63,138,0.12);">
      <h1 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#1A202C;">${t.welcome.title(firstName)}</h1>
      <p style="color:#718096;font-size:15px;line-height:1.7;margin:0 0 24px;">
        ${t.welcome.p1}
      </p>
      <p style="color:#718096;font-size:15px;line-height:1.7;margin:0 0 32px;">
        ${t.welcome.p2}
      </p>
      <div style="text-align:center;">
        <a href="${APP_URL}/dashboard/new"
          style="display:inline-block;background:linear-gradient(135deg,#4a7ee0,#2e5ec8);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:700;box-shadow:0 4px 14px rgba(46,94,200,0.4);">
          ${t.welcome.button}
        </a>
      </div>
    </div>

    <div style="text-align:center;padding:24px 0 0;">
      <p style="margin:0;font-size:12px;color:#A0AEC0;">${t.footerBy}</p>
    </div>

  </div>

</body>
</html>`,
  });
}

// ─── Broadcast (household update from an OWNER/PARENT) ────────────────────────

export async function sendBroadcastEmail({
  to,
  name,
  senderName,
  message,
  locale,
}: {
  to: string;
  name: string | null;
  senderName: string;
  message: string;
  locale?: Locale;
}) {
  const { t } = await lang(to, locale);
  const firstName = name?.split(" ")[0] ?? t.there;
  // Message is plain text from a form (see /api/family/broadcast) — escape it
  // before dropping into HTML, then turn newlines into <br> so paragraphs
  // survive.
  const safeMessage = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  await resend.emails.send({
    from: FROM,
    to,
    subject: t.broadcast.subject(senderName),
    html: `
<!DOCTYPE html>
<html lang="${t.htmlLang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F0F4FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <div style="max-width:560px;margin:0 auto;padding:32px 16px 48px;">

    <div style="background:linear-gradient(135deg,#1e3f8a 0%,#2e5ec8 100%);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
      <div style="font-size:36px;margin-bottom:6px;">📣</div>
      <div style="color:rgba(255,255,255,0.6);font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Reminder for Simplicity</div>
    </div>

    <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:36px 32px;box-shadow:0 4px 24px rgba(30,63,138,0.12);">
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#1A202C;">${t.hi(firstName)}</h1>
      <p style="color:#A0AEC0;font-size:13px;margin:0 0 20px;">${t.broadcast.sentUpdate(senderName)}</p>
      <div style="background:#F7FAFF;border:1px solid #E1E9FF;border-radius:12px;padding:20px;color:#2D3748;font-size:15px;line-height:1.7;margin:0 0 28px;">
        ${safeMessage}
      </div>
      <div style="text-align:center;">
        <a href="${APP_URL}/dashboard"
          style="display:inline-block;background:linear-gradient(135deg,#4a7ee0,#2e5ec8);color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:50px;font-size:14px;font-weight:700;box-shadow:0 4px 14px rgba(46,94,200,0.4);">
          ${t.broadcast.open}
        </a>
      </div>
    </div>

    <div style="text-align:center;padding:24px 0 0;">
      <p style="margin:0;font-size:12px;color:#A0AEC0;">${t.footerBy}</p>
    </div>

  </div>

</body>
</html>`,
  });
}

// ─── Approval gate (2026-07-28) ────────────────────────────────────────────
// While we're testing/building, every new top-level signup (email/password
// register + first Google sign-in) needs a manual admin approval before they
// can log in. Two emails: one to the new user ("we got your signup"), one to
// the admin ("someone's waiting"). A third fires once the admin approves.

export async function sendPendingApprovalEmail({ to, name, locale }: { to: string; name: string | null; locale?: Locale }) {
  const { t } = await lang(to, locale);
  const firstName = name?.split(" ")[0] ?? t.there;

  await resend.emails.send({
    from: FROM,
    to,
    subject: t.pending.subject,
    html: `
<!DOCTYPE html>
<html lang="${t.htmlLang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F0F4FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <div style="max-width:560px;margin:0 auto;padding:32px 16px 48px;">

    <div style="background:linear-gradient(135deg,#1e3f8a 0%,#2e5ec8 100%);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
      <div style="font-size:36px;margin-bottom:6px;">⏳</div>
      <div style="color:rgba(255,255,255,0.6);font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Reminder for Simplicity</div>
    </div>

    <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:36px 32px;box-shadow:0 4px 24px rgba(30,63,138,0.12);">
      <h1 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#1A202C;">${t.pending.title(firstName)}</h1>
      <p style="color:#718096;font-size:15px;line-height:1.7;margin:0 0 16px;">
        ${t.pending.p1}
      </p>
      <p style="color:#718096;font-size:15px;line-height:1.7;margin:0;">
        ${t.pending.p2}
      </p>
    </div>

    <div style="text-align:center;padding:24px 0 0;">
      <p style="margin:0;font-size:12px;color:#A0AEC0;">${t.footerBy}</p>
    </div>

  </div>

</body>
</html>`,
  });
}

export async function sendAdminApprovalRequestEmail({
  adminEmail,
  userEmail,
  userName,
  via,
}: {
  adminEmail: string;
  userEmail: string;
  userName: string | null;
  via: "email" | "google";
}) {
  await resend.emails.send({
    from: FROM,
    to: adminEmail,
    subject: `New signup waiting for approval: ${userEmail}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F0F4FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <div style="max-width:560px;margin:0 auto;padding:32px 16px 48px;">

    <div style="background:linear-gradient(135deg,#1e3f8a 0%,#2e5ec8 100%);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
      <div style="font-size:36px;margin-bottom:6px;">🔔</div>
      <div style="color:rgba(255,255,255,0.6);font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Reminder for Simplicity — Admin</div>
    </div>

    <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:36px 32px;box-shadow:0 4px 24px rgba(30,63,138,0.12);">
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#1A202C;">New signup waiting</h1>
      <p style="color:#2D3748;font-size:15px;line-height:1.7;margin:0 0 6px;">
        <strong>${userName ?? "No name given"}</strong> (${userEmail}) just signed up via ${via === "google" ? "Google" : "email/password"} and needs approval before they can log in.
      </p>
      <div style="text-align:center;margin-top:24px;">
        <a href="${APP_URL}/admin"
          style="display:inline-block;background:linear-gradient(135deg,#4a7ee0,#2e5ec8);color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:50px;font-size:14px;font-weight:700;box-shadow:0 4px 14px rgba(46,94,200,0.4);">
          Review in Admin →
        </a>
      </div>
    </div>

  </div>

</body>
</html>`,
  });
}

export async function sendAccountApprovedEmail({ to, name, locale }: { to: string; name: string | null; locale?: Locale }) {
  const { t } = await lang(to, locale);
  const firstName = name?.split(" ")[0] ?? t.there;

  await resend.emails.send({
    from: FROM,
    to,
    subject: t.approved.subject,
    html: `
<!DOCTYPE html>
<html lang="${t.htmlLang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F0F4FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <div style="max-width:560px;margin:0 auto;padding:32px 16px 48px;">

    <div style="background:linear-gradient(135deg,#1e3f8a 0%,#2e5ec8 100%);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
      <div style="font-size:36px;margin-bottom:6px;">✅</div>
      <div style="color:rgba(255,255,255,0.6);font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Reminder for Simplicity</div>
    </div>

    <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:36px 32px;box-shadow:0 4px 24px rgba(30,63,138,0.12);">
      <h1 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#1A202C;">${t.approved.title(firstName)}</h1>
      <p style="color:#718096;font-size:15px;line-height:1.7;margin:0 0 32px;">
        ${t.approved.body}
      </p>
      <div style="text-align:center;">
        <a href="${APP_URL}/login"
          style="display:inline-block;background:linear-gradient(135deg,#4a7ee0,#2e5ec8);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:700;box-shadow:0 4px 14px rgba(46,94,200,0.4);">
          ${t.approved.button}
        </a>
      </div>
    </div>

    <div style="text-align:center;padding:24px 0 0;">
      <p style="margin:0;font-size:12px;color:#A0AEC0;">${t.footerBy}</p>
    </div>

  </div>

</body>
</html>`,
  });
}

// ─── 2026-09-27: email verification, child account setup, deletion ─────────────

function simpleEmailHtml({ icon, greeting, lines, buttonText, buttonUrl, footer, htmlLang = "en" }: {
  icon: string; greeting: string; lines: string[]; buttonText?: string; buttonUrl?: string; footer?: string; htmlLang?: string;
}) {
  return `
<!DOCTYPE html>
<html lang="${htmlLang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F0F4FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px 48px;">
    <div style="background:linear-gradient(135deg,#1e3f8a 0%,#2e5ec8 100%);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
      <div style="font-size:32px;margin-bottom:6px;">${icon}</div>
      <div style="color:rgba(255,255,255,0.6);font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Reminder for Simplicity</div>
    </div>
    <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:32px;box-shadow:0 4px 24px rgba(30,63,138,0.12);">
      <p style="margin:0 0 20px;color:#718096;font-size:15px;">${greeting}</p>
      ${lines.map((l) => `<p style="color:#1A202C;font-size:15px;line-height:1.7;margin:0 0 14px;">${l}</p>`).join("")}
      ${buttonUrl ? `<div style="text-align:center;margin:24px 0 8px;">
        <a href="${buttonUrl}" style="display:inline-block;background:linear-gradient(135deg,#4a7ee0,#2e5ec8);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:700;box-shadow:0 4px 14px rgba(46,94,200,0.4);">${buttonText}</a>
      </div>` : ""}
      ${footer ? `<p style="color:#A0AEC0;font-size:12px;text-align:center;margin:24px 0 0;">${footer}</p>` : ""}
    </div>
  </div>
</body>
</html>`;
}

async function sendSimple(to: string, subject: string, html: string, tag: string) {
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) {
    console.error(`Resend error (${tag}):`, error);
    throw new Error(error.message);
  }
}

export async function sendVerifyEmail({ to, name, verifyUrl, locale }: { to: string; name: string | null; verifyUrl: string; locale?: Locale }) {
  const { t } = await lang(to, locale);
  const firstName = name?.split(" ")[0] ?? t.there;
  await sendSimple(to, t.verify.subject, simpleEmailHtml({
    htmlLang: t.htmlLang,
    icon: "✉️",
    greeting: t.hi(firstName),
    lines: [t.verify.body],
    buttonText: t.verify.button,
    buttonUrl: verifyUrl,
    footer: t.verify.footer,
  }), "verify email");
}

export async function sendAccountSetupEmail({ to, name, invitedBy, setupUrl, locale }: {
  to: string; name: string | null; invitedBy: string | null; setupUrl: string; locale?: Locale;
}) {
  const { t } = await lang(to, locale);
  const firstName = name?.split(" ")[0] ?? t.there;
  await sendSimple(to, t.setup.subject(invitedBy, firstName), simpleEmailHtml({
    htmlLang: t.htmlLang,
    icon: "👋",
    greeting: t.hi(firstName),
    lines: [t.setup.p1(invitedBy), t.setup.p2],
    buttonText: t.setup.button,
    buttonUrl: setupUrl,
    footer: t.setup.footer,
  }), "account setup");
}

export async function sendDeletionRequestEmail({ to, adminName, memberName, familyUrl, locale }: {
  to: string; adminName: string | null; memberName: string | null; familyUrl: string; locale?: Locale;
}) {
  const { t } = await lang(to, locale);
  await sendSimple(to, t.deletionRequest.subject(memberName), simpleEmailHtml({
    htmlLang: t.htmlLang,
    icon: "🗑️",
    greeting: t.hi(adminName?.split(" ")[0] ?? t.there),
    lines: [t.deletionRequest.p1(memberName), t.deletionRequest.p2],
    buttonText: t.deletionRequest.button,
    buttonUrl: familyUrl,
  }), "deletion request");
}

export async function sendAccountDeletedEmail({ to, name, purgeDate, locale }: { to: string; name: string | null; purgeDate: Date; locale?: Locale }) {
  const { t, d } = await lang(to, locale);
  await sendSimple(to, t.deleted.subject, simpleEmailHtml({
    htmlLang: t.htmlLang,
    icon: "👋",
    greeting: t.hi(name?.split(" ")[0] ?? t.there),
    lines: [t.deleted.p1, t.deleted.p2(d(purgeDate))],
  }), "account deleted");
}

// ─── 2026-09-28: plans ──────────────────────────────────────────────────────

export async function sendProRequestEmail({ to, familyName, requesterName, requesterEmail, adminUrl }: {
  to: string; familyName: string | null; requesterName: string | null; requesterEmail: string; adminUrl: string;
}) {
  await sendSimple(to, `Pro request: ${familyName ?? requesterEmail}`, simpleEmailHtml({
    icon: "⚡",
    greeting: "Hi Mikael,",
    lines: [
      `<strong>${requesterName ?? requesterEmail}</strong> (${requesterEmail}) wants Pro for the family <strong>${familyName ?? "—"}</strong>.`,
      "Open the family in admin and grant Pro for the number of days you want.",
    ],
    buttonText: "Open in admin →",
    buttonUrl: adminUrl,
  }), "pro request");
}

export async function sendProGrantedEmail({ to, name, until, locale }: { to: string; name: string | null; until: Date | null; locale?: Locale }) {
  const { t, d } = await lang(to, locale);
  await sendSimple(to, t.proGranted.subject, simpleEmailHtml({
    htmlLang: t.htmlLang,
    icon: "⚡",
    greeting: t.hi(name?.split(" ")[0] ?? t.there),
    lines: [until ? t.proGranted.until(d(until)) : t.proGranted.on, t.proGranted.unlocked],
  }), "pro granted");
}


// 2026-10-09 (persona review): heads-up 3 days before the trial ends.
export async function sendTrialEndingEmail({ to, name, expiresAt, daysLeft, locale }: { to: string; name: string | null; expiresAt: Date; daysLeft: number; locale?: Locale }) {
  const { t, d } = await lang(to, locale);
  const APP_URL = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://assistiq.se";
  await sendSimple(to, t.trialEnding.subject(daysLeft), simpleEmailHtml({
    htmlLang: t.htmlLang,
    icon: "⏳",
    greeting: t.hi(name?.split(" ")[0] ?? t.there),
    lines: [t.trialEnding.ends(d(expiresAt)), t.trialEnding.after, t.trialEnding.keeps],
    buttonText: t.trialEnding.button,
    buttonUrl: `${APP_URL}/upgrade`,
  }), "trial ending");
}

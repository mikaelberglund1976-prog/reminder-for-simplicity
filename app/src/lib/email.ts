import { Resend } from "resend";
import { format } from "date-fns";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const APP_URL = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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
}: {
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
  const firstName = name?.split(" ")[0] ?? "there";
  const formattedDate = format(date, "d MMMM yyyy");
  const daysLeft = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const dashboardUrl = `${APP_URL}/dashboard/${reminderId}`;
  const icon = category ? (CATEGORY_ICONS[category] ?? "🔔") : "🔔";

  const urgencyColor =
    daysLeft <= 0 ? "#e53e3e" :
    daysLeft <= 3 ? "#dd6b20" :
    daysLeft <= 7 ? "#d69e2e" :
    "#4A5FD5";

  const daysLabel =
    daysLeft <= 0 ? "due today" :
    daysLeft === 1 ? "due tomorrow" :
    `due in ${daysLeft} days`;

  const urgencyBadge =
    daysLeft <= 0 ? `<span style="background:#fff0f0;color:#e53e3e;border:1px solid #fed7d7;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">⚡ Due today</span>` :
    daysLeft <= 3 ? `<span style="background:#fff8f0;color:#dd6b20;border:1px solid #fbd38d;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">⚠️ ${daysLeft} days left</span>` :
    daysLeft <= 7 ? `<span style="background:#fffff0;color:#b7791f;border:1px solid #faf089;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">📅 ${daysLeft} days left</span>` :
    `<span style="background:#ebf4ff;color:#4A5FD5;border:1px solid #bee3f8;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">📅 ${daysLeft} days left</span>`;

  const amountRow = amount
    ? `<tr>
        <td style="padding:12px 0;color:#718096;font-size:14px;border-bottom:1px solid #EDF2F7;">Amount</td>
        <td style="padding:12px 0;color:#1A202C;font-size:15px;font-weight:700;text-align:right;border-bottom:1px solid #EDF2F7;">
          ${amount.toLocaleString("en")} ${currency}
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
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AssistIQ Reminder</title>
</head>
<body style="margin:0;padding:0;background:#F0F4FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <div style="max-width:560px;margin:0 auto;padding:32px 16px 48px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e3f8a 0%,#2e5ec8 100%);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
      <div style="font-size:32px;margin-bottom:6px;">${icon}</div>
      <div style="color:rgba(255,255,255,0.6);font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">AssistIQ</div>
      <div style="color:rgba(255,255,255,0.35);font-size:11px;">Never forget what matters</div>
    </div>

    <!-- Card -->
    <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:32px;box-shadow:0 4px 24px rgba(30,63,138,0.12);">

      <p style="margin:0 0 20px;color:#718096;font-size:15px;">Hi ${firstName},</p>

      <!-- Reminder name + badge -->
      <div style="margin-bottom:24px;">
        <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#1A202C;line-height:1.2;">${reminderName}</h1>
        ${urgencyBadge}
      </div>

      <!-- Details table -->
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #EDF2F7;">
        <tr>
          <td style="padding:12px 0;color:#718096;font-size:14px;border-bottom:1px solid #EDF2F7;">Date</td>
          <td style="padding:12px 0;color:#1A202C;font-size:15px;font-weight:600;text-align:right;border-bottom:1px solid #EDF2F7;">${formattedDate}</td>
        </tr>
        ${amountRow}
      </table>

      ${noteSection}

      <!-- CTA -->
      <div style="text-align:center;margin-top:32px;">
        <a href="${dashboardUrl}"
          style="display:inline-block;background:linear-gradient(135deg,#4a7ee0,#2e5ec8);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:700;letter-spacing:-0.2px;box-shadow:0 4px 14px rgba(46,94,200,0.4);">
          View reminder →
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0 0;">
      <p style="margin:0 0 6px;font-size:12px;color:#A0AEC0;line-height:1.8;">
        You're receiving this because you set up a reminder in AssistIQ.<br>
        <a href="${APP_URL}/dashboard" style="color:#A0AEC0;text-decoration:underline;">Manage reminders</a>
        &nbsp;·&nbsp;
        <span>by Berget &amp; Fredde</span>
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
  to, fromName, householdName, joinUrl,
}: { to: string; fromName: string; householdName: string; joinUrl: string }) {
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `${fromName} invited you to join ${householdName} on AssistIQ`,
    html: `
<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F0F4FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px 48px;">
  <div style="background:linear-gradient(135deg,#1e3f8a 0%,#2e5ec8 100%);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
    <div style="font-size:32px;margin-bottom:6px;">🏠</div>
    <div style="color:rgba(255,255,255,0.6);font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">AssistIQ</div>
  </div>
  <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:32px;box-shadow:0 4px 24px rgba(30,63,138,0.12);">
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#1A202C;">You've been invited! 🎉</h1>
    <p style="color:#718096;font-size:15px;line-height:1.7;margin:0 0 8px;">
      <strong style="color:#1A202C;">${fromName}</strong> has invited you to join <strong style="color:#1A202C;">${householdName}</strong> on AssistIQ.
    </p>
    <p style="color:#718096;font-size:15px;line-height:1.7;margin:0 0 28px;">
      Share reminders, assign tasks and make sure nothing falls between the cracks.
    </p>
    <div style="text-align:center;">
      <a href="${joinUrl}" style="display:inline-block;background:linear-gradient(135deg,#4a7ee0,#2e5ec8);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:700;box-shadow:0 4px 14px rgba(46,94,200,0.4);">
        Accept invitation →
      </a>
    </div>
    <p style="color:#A0AEC0;font-size:12px;text-align:center;margin:24px 0 0;">This invite expires in 48 hours.</p>
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
  to, toName, fromName, reminderName, reminderDate, acceptUrl,
}: { to: string; toName: string | null; fromName: string; reminderName: string; reminderDate: Date; acceptUrl: string }) {
  const firstName = toName?.split(" ")[0] ?? "there";
  const formattedDate = reminderDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  await resend.emails.send({
    from: FROM,
    to,
    subject: `${fromName} wants to hand over: ${reminderName}`,
    html: `
<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F0F4FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px 48px;">
  <div style="background:linear-gradient(135deg,#1e3f8a 0%,#2e5ec8 100%);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
    <div style="font-size:32px;margin-bottom:6px;">🤝</div>
    <div style="color:rgba(255,255,255,0.6);font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">AssistIQ · Handover Request</div>
  </div>
  <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:32px;box-shadow:0 4px 24px rgba(30,63,138,0.12);">
    <p style="margin:0 0 20px;color:#718096;font-size:15px;">Hi ${firstName},</p>
    <div style="background:#FFF9E6;border:1.5px solid #F6E05E;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#B7791F;text-transform:uppercase;letter-spacing:0.05em;">Pending handover</p>
      <p style="margin:0;font-size:17px;font-weight:800;color:#1A202C;">${reminderName}</p>
      <p style="margin:4px 0 0;font-size:14px;color:#718096;">Due ${formattedDate}</p>
    </div>
    <p style="color:#718096;font-size:15px;line-height:1.7;margin:0 0 28px;">
      <strong style="color:#1A202C;">${fromName}</strong> wants to transfer this reminder to you. Until you accept, <strong style="color:#1A202C;">${fromName}</strong> remains responsible.
    </p>
    <div style="text-align:center;">
      <a href="${acceptUrl}" style="display:inline-block;background:linear-gradient(135deg,#4a7ee0,#2e5ec8);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:700;box-shadow:0 4px 14px rgba(46,94,200,0.4);">
        Review handover →
      </a>
    </div>
  </div>
</div>
</body></html>`,
  });
}

// ─── Handover response email ──────────────────────────────────────────────────

export async function sendHandoverResponseEmail({
  to, toName, responderName, reminderName, action, dashboardUrl,
}: { to: string; toName: string | null; responderName: string; reminderName: string; action: "accepted" | "rejected"; dashboardUrl: string }) {
  const firstName = toName?.split(" ")[0] ?? "there";
  const isAccepted = action === "accepted";

  await resend.emails.send({
    from: FROM,
    to,
    subject: `${responderName} ${isAccepted ? "accepted" : "declined"} the handover: ${reminderName}`,
    html: `
<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F0F4FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px 48px;">
  <div style="background:linear-gradient(135deg,${isAccepted ? "#1e7d52 0%,#2a9d6f" : "#8B0000 0%,#C44444"} 100%);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
    <div style="font-size:32px;margin-bottom:6px;">${isAccepted ? "✅" : "❌"}</div>
    <div style="color:rgba(255,255,255,0.7);font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">AssistIQ · Handover ${isAccepted ? "Accepted" : "Declined"}</div>
  </div>
  <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:32px;box-shadow:0 4px 24px rgba(30,63,138,0.12);">
    <p style="margin:0 0 16px;color:#718096;font-size:15px;">Hi ${firstName},</p>
    <p style="color:#1A202C;font-size:16px;font-weight:600;margin:0 0 24px;line-height:1.5;">
      <strong>${responderName}</strong> has <strong style="color:${isAccepted ? "#2A9D6F" : "#D94F4F"};">${isAccepted ? "accepted" : "declined"}</strong> the handover for <strong>${reminderName}</strong>.
    </p>
    ${isAccepted
      ? `<p style="color:#718096;font-size:14px;line-height:1.6;margin:0 0 28px;">You're off the hook — ${responderName} is now responsible for this reminder.</p>`
      : `<p style="color:#718096;font-size:14px;line-height:1.6;margin:0 0 28px;">You are still the responsible owner of this reminder.</p>`
    }
    <div style="text-align:center;">
      <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#4a7ee0,#2e5ec8);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:700;box-shadow:0 4px 14px rgba(46,94,200,0.4);">
        View reminder →
      </a>
    </div>
  </div>
</div>
</body></html>`,
  });
}

// ─── Welcome email ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail({ to, name }: { to: string; name: string | null }) {
  const firstName = name?.split(" ")[0] ?? "there";

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Welcome to AssistIQ 🔔`,
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
      <div style="color:rgba(255,255,255,0.6);font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">AssistIQ</div>
    </div>

    <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:36px 32px;box-shadow:0 4px 24px rgba(30,63,138,0.12);">
      <h1 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#1A202C;">Welcome, ${firstName}! 👋</h1>
      <p style="color:#718096;font-size:15px;line-height:1.7;margin:0 0 24px;">
        You're all set up on AssistIQ — your personal reminder assistant for the things that are easy to miss but important to keep on top of.
      </p>
      <p style="color:#718096;font-size:15px;line-height:1.7;margin:0 0 32px;">
        Add your first reminder — subscriptions, birthdays, insurance renewals — and we'll make sure you never forget what matters.
      </p>
      <div style="text-align:center;">
        <a href="${APP_URL}/dashboard/new"
          style="display:inline-block;background:linear-gradient(135deg,#4a7ee0,#2e5ec8);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:700;box-shadow:0 4px 14px rgba(46,94,200,0.4);">
          Add your first reminder →
        </a>
      </div>
    </div>

    <div style="text-align:center;padding:24px 0 0;">
      <p style="margin:0;font-size:12px;color:#A0AEC0;">AssistIQ · by Berget &amp; Fredde</p>
    </div>

  </div>

</body>
</html>`,
  });
}

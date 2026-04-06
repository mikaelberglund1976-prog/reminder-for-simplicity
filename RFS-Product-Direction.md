# Reminder for Simplicity — Product Direction Document
*MVP Edition · April 2026*

---

## 1. Executive Summary

The product is in a strong position. The core logic works. What it needs now is a consistent visual identity, tighter UX decisions, and a clear product feel across every surface — homepage, dashboard, forms, profile, and email.

The recommendations in this document are opinionated and concrete. There are no alternatives to choose between. Each decision is made to serve the same goal: a product that feels calm, trustworthy, and genuinely useful — one that a real person would recommend to a friend.

The central design principle is: **simplicity is the product, not a limitation of it.** Every visual and UX decision should reinforce that.

---

## 2. Homepage Recommendations

### Visual Direction

Minimal and typographic. No illustrations, no hero images, no gradients. The page should feel like a well-designed editorial piece — confident enough to let the words do the work. The brand is built on trust and clarity, not excitement.

### Base Color

**#F5F4F0** — a warm off-white with a very slight cream tone. This is not pure white. It reads as intentional, calm, and premium without feeling corporate. It works perfectly as a base for a minimal, high-trust product.

### Full Color Palette

| Role | Hex | Usage |
|---|---|---|
| Background | `#F5F4F0` | Page base |
| Surface | `#FFFFFF` | Cards, inputs, elevated elements |
| Foreground | `#1C1C28` | Headlines, primary text |
| Muted text | `#7C7C8A` | Subtext, labels, meta info |
| Accent | `#4A5FD5` | Primary buttons, links, active states |
| Accent hover | `#3A4FC5` | Button hover |
| Border | `#E4E3DE` | Subtle separators |
| Success | `#2A9D6F` | Confirmation states |
| Warning | `#E5873A` | Soon/urgent states |

This is a four-color palette in practice: warm off-white, deep ink, muted gray, and one calm indigo accent. No red. No noise.

### Typography

**Font:** Inter (already likely available via Next.js Google Fonts — if not, add it)

| Element | Size | Weight |
|---|---|---|
| Headline | 48px / 3rem | 700 |
| Subheadline | 20px / 1.25rem | 400 |
| Body | 16px / 1rem | 400 |
| Label/meta | 13px / 0.8125rem | 500 |
| Button | 15px / 0.9375rem | 600 |

Line height: 1.5 for body, 1.15 for headlines. Letter spacing: slightly tight on headlines (-0.02em), normal on body.

### Mobile-First Visual Hierarchy

1. Logo + product name (top left, small and clean)
2. Log in link (top right, text only — no button)
3. —— large breathing room ——
4. Headline (large, centered, two lines max)
5. Subtext (one short paragraph, centered, max 480px wide)
6. —— spacing ——
7. Primary CTA button: **Get started free** (full-width on mobile, centered on desktop)
8. Secondary link: **Already a member? Log in** (text link below button, no button border)
9. —— large breathing room ——
10. Three feature strip icons (stacked vertically on mobile, horizontal row on desktop)
11. Footer: "by Berget & Fredde · 2026" (very small, muted, centered)

### Button Decision

**Yes, the buttons should be visually distinct.** There should be exactly one primary button (Get started free) and one secondary text link (Log in). Not two buttons. The secondary action should not compete visually with the primary. A second bordered button creates false equivalence — it suggests the two actions are equally important. They are not. Getting a new user to sign up is the primary conversion. Log in is a utility action.

Primary button: filled, `#4A5FD5`, rounded (10px), full-width on mobile, auto-width with generous padding on desktop.
Secondary: plain text link, muted color, placed directly below the primary button.

### Why This Is the Best Choice

This direction works because the product's core value proposition is simplicity. A homepage that tries to impress with gradients, animation, or visual complexity would directly contradict what the product stands for. The off-white background, strong typography, and single accent color create a product that looks considered and trustworthy — the two most important qualities for a product that handles personal data and sends emails on your behalf.

Users need to trust this product enough to hand it their email address and important dates. Visual calm builds that trust faster than visual excitement.

---

## 3. Dashboard Recommendations

### Overall Structure

```
[Header: Logo + Nav (Profile, Sign out)]
[Welcome, {First Name}]
[Overview: 4 stat blocks]
[Category filter strip]
[Reminder table]
[+ Add reminder button]
```

### Welcome Message

Simple, clean, one line:
> **Welcome, Sarah** — 4 active reminders

Place it at the top of the content area, below the header. Use the foreground color at 22–24px, font-weight 600. Do not add emoji or icons. Let the name do the work.

### Overview Section

Four stat blocks in a 2×2 grid on mobile, single row on desktop. Each block is a minimal card:

| Block | Value | Label |
|---|---|---|
| 1 | 4 | Active reminders |
| 2 | Netflix · 12 days | Next renewal |
| 3 | 450 SEK | Monthly cost |
| 4 | 5,400 SEK | Yearly cost |

Card style: white background, subtle border (`#E4E3DE`), 16px padding, 10px border radius. The value is displayed large (24px, 700). The label is small and muted below it. No icons — they add clutter without adding meaning here.

The "Next renewal" block should show the reminder name and days remaining, not a raw date. "Netflix · 12 days" is more useful than "2026-05-15".

Monthly and yearly cost are shown in the user's preferred currency (see section 5). If no costs are set, display "—" rather than "0 SEK".

### Category Filtering

Use a horizontal scrollable pill strip. On desktop, all pills fit in one row. On mobile, the strip scrolls horizontally.

Default state: `All` is selected.

**Interaction pattern:** Clicking a pill filters the table immediately. No page reload. Selected state changes visually (see below). Only one category can be active at a time. Clicking the active category again deselects it and returns to All.

**Selected state:** The active pill gets the accent background (`#4A5FD5`), white text, no border. Unselected pills have a white background, muted text, and a light border. The visual difference must be unmistakable — not subtle.

Categories: All · Subscriptions · Birthdays · Insurance · Contracts · Health · Other

### Reminder Table

Do not use stacked cards. Use a proper table.

**Columns (left to right):**

| Column | Notes |
|---|---|
| Category icon | Small emoji icon, no label |
| Name | Bold, primary text |
| Date | Formatted as "May 15" or "May 15, 2026" if different year |
| Days left | Number with color coding (see below) |
| Recurring | "Yearly" / "Monthly" / "Once" — muted text |
| Amount | Right-aligned, in preferred currency |

**Sort order:** Days remaining, ascending (soonest first). Overdue items appear at the top, in red.

**Color coding for days remaining:**
- Overdue (< 0): red text `#D94F4F`
- Urgent (0–7 days): orange `#E5873A`
- Soon (8–30 days): normal foreground
- OK (31+ days): muted gray

**Row interaction:** The entire row is clickable and leads to the reminder detail page. Subtle hover background (`#F0EFE9`).

**Empty state:** When no reminders exist in a category, show:
> No reminders in this category yet.
> [+ Add one]

### Mobile Considerations

On mobile, the table collapses. Show only: icon, name, days remaining. The amount and recurrence are hidden to reduce clutter. Tapping a row still goes to the detail page where full info is shown.

The "+ Add reminder" button should be a fixed floating button at the bottom right on mobile (FAB pattern). On desktop, it's a normal button at the top right of the reminder section.

---

## 4. Create Reminder Flow Recommendations

### Interaction Pattern for Selectable Options

All toggle-style choices (Category, Recurrence, Reminder days before) should use **segmented button groups** — a row of adjacent buttons where only one can be selected at a time. This is cleaner than individual checkbox-style buttons scattered in a grid.

For category, keep the 2×3 grid layout but make the selected state visually clear and unambiguous.

### Selected State

**Selected:** accent background (`#4A5FD5`), white text, no border, slight shadow.
**Unselected:** white background, muted foreground text (`#7C7C8A`), light border.

The contrast between selected and unselected must be strong. This is a recurring problem in MVPs — developers style both states similarly and users cannot tell what they've selected. The accent fill is the only acceptable solution here.

Do not use outline-only or underline-only for the selected state. Fill is required.

### Form Structure (Mobile-First)

The form fields stack vertically with clear labels above each field. No two-column layouts on mobile. Each field gets its own full-width row.

Field order (optimized for completion rate):
1. Name *(text input, required)*
2. Category *(button grid, required)*
3. Date *(date picker, required)*
4. Recurrence *(3-option strip: Once / Monthly / Yearly)*
5. Remind me *(5-option strip: 1d / 3d / 7d / 14d / 30d)*
6. Amount *(number input, optional — sits naturally after recurrence)*
7. Note *(textarea, optional — always last)*

**Amount + Currency:** On mobile, amount and currency are stacked (full width each). On desktop they sit side by side.

**Labels:** Clear, 13px, font-weight 500, placed directly above the field with 6px gap. No floating labels. No placeholders as labels.

**Submit button:** Full-width on mobile. Labeled "Save reminder" — not "Submit" or "Create." This language matches what the user is doing.

**Validation:** Inline, below the specific field that has an error. Red text, no full-page error states.

---

## 5. Currency Logic Recommendations

### MVP Logic

The user sets one preferred currency in My Profile. This is a display preference, not a conversion setting. It controls how currency values appear across the product — in the dashboard overview and in the Create Reminder form. It does not affect stored values.

### Internal Storage

Each reminder stores its own amount and its own currency internally. This is the correct approach. If a user has a Netflix subscription in USD and a gym in SEK, those amounts are stored as-is. The preferred currency is a UI layer on top, not a data transformation.

### How Totals Are Shown

The dashboard shows monthly and yearly totals in the preferred currency, with a short disclosure label:

> **Monthly cost** · 450 SEK
> *Amounts in your preferred currency — not converted*

This is honest and clear. Users who have reminders in multiple currencies will see the total in their preferred currency but understand that these are not exchange-rate-converted sums. The disclosure is necessary. It should be displayed as a small muted note below or beside the total values — visible but not alarming.

If all reminders share the same currency as the preferred currency, omit the disclosure note.

### In Create Reminder

The currency field defaults to the user's preferred currency when they open the form. They can still change it per reminder if needed. This is the right UX — default to preferred, allow override.

### UI Language

Do not say "display currency." Say "preferred currency." Users understand "preferred" intuitively. "Display" sounds technical.

---

## 6. My Profile Page Recommendations

### Page Structure

Three clear sections, separated by subtle dividers — not cards or panels. Clean whitespace between sections.

```
SECTION 1 — Personal
Full name           [text input]
Email address       [text input, may be read-only if using NextAuth email]

SECTION 2 — Preferences
Preferred currency  [select: SEK / EUR / USD]
Time zone           [select dropdown]

SECTION 3 — Account
Current plan        [badge + short description]
Member since        [read-only, subtle]
Change password     [link or button, secondary style]

[Save changes]      ← clear primary button
[Sign out]          ← text link, below save, muted
```

### Section Grouping and Prominence

Personal is most prominent — name and email are top, in a natural reading flow. Preferences follow because they affect how the product behaves. Account is last — it's informational and occasional, not something the user visits regularly.

### Current Plan

Display as a small pill/badge inline with a label:

> **Current plan** → `Free` *(muted pill, `#E4E3DE` background, dark text)*
> Free plan includes unlimited reminders to your inbox.

If a paid plan exists later, the pill changes to: `Pro` with the accent color. Keep it simple — one line of description below the badge is enough.

### Change Password

Present it as a single text button: "Change password →" in muted accent color. This opens either an inline form (preferred on mobile) or sends a reset link to their email. Do not put a password change form inline on the same page as all other profile fields — it adds visual weight where none is needed. Recommendation: send a reset email and confirm with a toast message.

### Member Since

Display subtly at the bottom of the Account section:

> Member since March 2026

Use the muted text color (`#7C7C8A`), 13px, no label. Just the sentence. It's informative and gives a sense of history — not a data point that needs emphasis.

### Save Changes Button

Full-width on mobile. On desktop, left-aligned under the form fields, standard width. Label: "Save changes." Green confirmation toast on success. Do not reload the page.

### Sign Out

Plain text link, below the save button, centered or left-aligned. Label: "Sign out." No icon, no color, no button shape. It should be clearly visible but clearly secondary.

### Mobile

All sections stack naturally. The form fields are already full-width. The page requires no horizontal scrolling, no tabs, no accordion. It's a long but clean scroll on mobile — which is fine for a settings page that's visited occasionally.

### Keeping It Minimal Without Feeling Empty

Use generous vertical spacing (32–48px between sections). Add a thin horizontal rule (`1px, #E4E3DE`) between sections. Let the whitespace do the work. Do not add icons to every field or decorative elements to fill space. This page should feel like a calm, quiet form — not a dashboard.

---

## 7. Reminder Email Recommendations

### Subject Lines

The subject line should feel like it comes from a real person or a tool you trust — not a marketing automation system.

Recommended subject line formula:
> **Reminder: {Reminder Title} — {Days Left} days left**

Examples:
- `Reminder: Netflix — 3 days left`
- `Reminder: Mom's birthday — 7 days left`
- `Reminder: Car insurance renewal — 14 days left`
- `Reminder: Office lease — 1 day left`

For same-day reminders: `Reminder: Netflix — renews today`
For birthday: `Reminder: Mom's birthday — this week`

Avoid: exclamation points, emoji in subject lines, urgency language like "Don't miss!" or "Action required."

### Email Structure

```
[Header: Logo + Product Name]

Hi {first_name},

[One-line opener]

[Reminder block: the key details]

[Single CTA button: View reminder]

[Footer: unsubscribe · about · branding]
```

### Full Email Copy (Universal Template)

---

**Subject:** Reminder: {reminder_title} — {days_left} days left

---

Hi {first_name},

This is your reminder for **{reminder_title}**.

---

| | |
|---|---|
| **Category** | {category} |
| **Date** | {renewal_date} |
| **Days left** | {days_left} |
| **Amount** | {cost} {currency} |

---

{conditional_note}
*(If days_left = 1: "This is due tomorrow.")*
*(If days_left = 0: "This is due today.")*
*(If it's a birthday: "Don't forget to reach out.")*
*(Otherwise: omit this line)*

[View reminder →]({dashboard_url})

---

*You're receiving this because you set up a reminder in Reminder for Simplicity.*
*To manage your reminders, visit your dashboard.*
*Unsubscribe · Reminder for Simplicity by Berget & Fredde*

---

### Conditional Content by Category

| Category | Adjusted copy |
|---|---|
| SUBSCRIPTION | "Your {reminder_title} subscription is coming up for renewal." |
| CONTRACT | "Your contract for {reminder_title} is due for renewal." |
| BIRTHDAY | "You have a birthday reminder set for {reminder_title}." |
| INSURANCE | "Your {reminder_title} insurance is up for renewal." |
| HEALTH | "You have a health reminder: {reminder_title}." |
| OTHER | "You have an upcoming reminder: {reminder_title}." |

### Visual Style

Plain HTML email, minimal layout. No background images. No heavy graphics.

- Background: `#F5F4F0` (same as product background)
- Content width: 560px max, centered
- Content area: white card with 32px padding, 10px border radius
- Logo: text-based (not an image) — "🔔 Reminder for Simplicity" in the header
- Font: system font stack (Arial, Helvetica, sans-serif) — email clients do not load custom fonts reliably
- CTA button: `#4A5FD5`, white text, 14px padding horizontal, 10px vertical, 8px border radius
- No shadows. No gradients.

### Footer

Small, muted text. Three lines:

1. "You're receiving this because you set up a reminder in Reminder for Simplicity."
2. "Unsubscribe · Manage reminders"
3. "Reminder for Simplicity by Berget & Fredde"

Unsubscribe must be a real link — this is legally required in most jurisdictions.

### What to Avoid in the Email

- Do not add promotional content ("Upgrade to Pro!")
- Do not use urgency language ("ACT NOW")
- Do not send from a no-reply address — use something like hello@reminderfor.simplicity.com or a forwarded address
- Do not include images that might be blocked
- Do not use more than one CTA button
- Do not include the user's password, full account details, or sensitive personal data

---

## 8. Reminder Delivery Reliability Checklist

### Product Logic

- [ ] Every reminder has a `date`, a `reminderDaysBefore` value, and an `isActive` flag
- [ ] The cron job calculates the send date as `date - reminderDaysBefore days`
- [ ] Only reminders where `isActive = true` are processed
- [ ] Recurring reminders (MONTHLY, YEARLY) generate the next occurrence correctly after each trigger
- [ ] A reminder that has been sent is not re-sent the same day (idempotency check)
- [ ] Deleted/deactivated reminders are excluded before the email is sent

### Scheduling

- [ ] The cron job runs once per day, at a fixed time (e.g. 07:00 in the user's time zone, or UTC if time zones aren't supported yet)
- [ ] The Vercel cron job is configured correctly in `vercel.json`
- [ ] The cron endpoint is protected by a secret (`CRON_SECRET` header check)
- [ ] Vercel logs confirm the cron job is running on schedule
- [ ] If using Vercel Hobby plan, confirm cron frequency limits (Hobby allows daily minimum)

### Email Sending (Resend)

- [ ] The Resend API key is set in Vercel environment variables
- [ ] The sender domain is verified in Resend
- [ ] Test emails are sending and landing in inbox (not spam)
- [ ] The `from` address is set correctly and matches the verified domain
- [ ] Email content passes a basic spam score check (avoid spam trigger words)

### Edge Cases

- [ ] What happens if a user has no email address stored? → skip silently, log warning
- [ ] What happens if Resend returns an error? → log the error, do not mark reminder as sent
- [ ] What happens if a reminder date has already passed? → send if within a reasonable window (e.g. same day), skip if older
- [ ] What happens if the cron job runs twice in one day? → each reminder should only send once (check by storing `lastSentAt`)
- [ ] What happens on February 29 for yearly reminders? → handle gracefully (send on Feb 28 in non-leap years)

### Testing

- [ ] Manually trigger the cron endpoint and verify an email is received
- [ ] Create a test reminder with `reminderDaysBefore = 0` (due today) and confirm it triggers
- [ ] Check that a deactivated reminder does not trigger
- [ ] Verify the email renders correctly on mobile (use a mail preview tool or send to a mobile device)
- [ ] Check that the dashboard_url link in the email resolves to the correct reminder detail page
- [ ] Confirm the unsubscribe link works

### Confirmation That It's Working

The simplest and most practical monitoring approach for MVP:
1. Add a log line every time an email is sent: `console.log("Email sent to {userId} for reminder {reminderId}")`
2. Check Vercel function logs after each cron run
3. Set up a test account with a reminder set for tomorrow — verify it arrives
4. Optionally, use Resend's built-in delivery logs to confirm open/delivery status

---

## 9. Recommended Next-Step Priorities for Implementation

These are ordered by impact and dependency.

### Priority 1 — Homepage redesign (visual identity foundation)
Update `globals.css` with the new palette. Update `page.tsx` to match the new homepage direction. This sets the visual standard for everything that follows.

### Priority 2 — Dashboard improvements
Update the dashboard with the welcome message, overview blocks, and table layout. This is the core product surface — users spend most of their time here.

### Priority 3 — My Profile page + preferred currency
Create the profile page. Add `preferredCurrency` and `timezone` fields to the user model in Prisma. Wire the preferred currency to the dashboard overview and Create Reminder form.

### Priority 4 — Create Reminder form polish
Tighten the selected states and form structure. This is relatively quick but meaningfully improves the experience.

### Priority 5 — Email template
Update the Resend email template to match the new design and copy direction. Test delivery.

### Priority 6 — Delivery reliability audit
Go through the checklist above. Add `lastSentAt` to the reminder model. Add logging. Test end-to-end with a real reminder.

---

*Reminder for Simplicity · Product Direction Document · MVP Edition*
*Prepared for Mikael Berglund & Fredde · April 2026*

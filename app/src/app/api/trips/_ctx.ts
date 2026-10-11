import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLocaleForUser } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { memberCtx } from "@/lib/trips";
import { DATE_LOCALES } from "@/lib/i18n/config";

export async function tripCtx() {
  const session = await getServerSession(authOptions);
  const uid = session?.user?.id;
  if (!uid) return null;
  const m = await memberCtx(uid);
  if (!m) return null;
  const locale = await getLocaleForUser(uid);
  const t = getMessages(locale).trips;
  const fmt = (ymd: string) => new Date(ymd + "T12:00:00Z").toLocaleDateString(DATE_LOCALES[locale], { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return { uid, ...m, t, fmt };
}

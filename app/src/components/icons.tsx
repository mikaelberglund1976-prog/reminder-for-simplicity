// 2026-10-25 (masterbrief §31–32): ONE icon set for the app's areas, so the
// same thing looks the same everywhere (emoji stay as an emotional accent in
// texts, not as the system). Line icons, 24×24 grid, stroke 2, round caps —
// the style the bottom nav and the More sheet already use. Always decorative
// (aria-hidden): the text next to an icon carries the meaning (§37).
import type { CSSProperties } from "react";

export type IconName =
  | "home" | "calendar" | "reminder" | "school" | "test" | "homework" | "activity" | "chores" | "shopping"
  | "birthday" | "gift" | "trip" | "family" | "settings" | "help" | "alert" | "link" | "car" | "clock"
  | "moved" | "cancelled" | "plus" | "refresh" | "check" | "user";

const P: Record<IconName, JSX.Element> = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
  reminder: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
  school: <><path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12.5V17c0 1.5 2.5 3 6 3s6-1.5 6-3v-4.5" /></>,
  test: <><path d="M9 3h6v4H9z" /><path d="M7 5H5v16h14V5h-2" /><path d="m9 14 2 2 4-4" /></>,
  homework: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14Z" /><path d="M20 17v4H6.5A2.5 2.5 0 0 1 4 18.5" /></>,
  activity: <><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 0 0 18M3 12h18" /></>,
  chores: <><path d="M9 6h11" /><path d="M9 12h11" /><path d="M9 18h11" /><path d="m4 6 1 1 2-2" /><path d="m4 12 1 1 2-2" /><path d="m4 18 1 1 2-2" /></>,
  shopping: <><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /><path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 6H5.6" /></>,
  birthday: <><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" /><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" /><path d="M2 21h20" /><path d="M7 8v3M12 8v3M17 8v3" /></>,
  gift: <><rect x="3" y="8" width="18" height="4" /><rect x="4" y="12" width="16" height="9" /><path d="M12 8v13M12 8c-1.5-3-5-3-5-1s2 1 5 1zM12 8c1.5-3 5-3 5-1s-2 1-5 1z" /></>,
  trip: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
  family: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
  help: <><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
  alert: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
  link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>,
  car: <><path d="M5 17h14M5 17a2 2 0 1 0 4 0M15 17a2 2 0 1 0 4 0" /><path d="M3 17v-5l2-5h14l2 5v5" /><path d="M3 12h18" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  moved: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><path d="m10 14 3 3-3 3" transform="translate(0 -2)" /></>,
  cancelled: <><circle cx="12" cy="12" r="9" /><path d="m15 9-6 6M9 9l6 6" /></>,
  plus: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>,
  refresh: <><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" /><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" /><path d="M21 3v5h-5M3 21v-5h5" /></>,
  check: <polyline points="20 6 9 17 4 12" />,
  user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
};

export function Icon({ name, size = 20, color = "currentColor", style }: { name: IconName; size?: number; color?: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false" style={{ flexShrink: 0, ...style }}>
      {P[name]}
    </svg>
  );
}

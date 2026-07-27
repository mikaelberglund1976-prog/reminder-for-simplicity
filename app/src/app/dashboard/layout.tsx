import BottomNav from "@/components/BottomNav";

// Wraps every /dashboard/* route with the persistent bottom tab bar
// (Reminders / Shopping list / Wishlist) required by P0.4 in the
// 2026-07-27 order — one tap to switch, visible from anywhere in the app.
// Individual pages already pad their scrollable content so it doesn't
// end up hidden behind the fixed nav (see Screen components' paddingBottom).
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Extra bottom space so the fixed nav never permanently covers the
          last bit of any page's content, regardless of that page's own
          padding (pages were written before the nav existed). */}
      <div style={{ paddingBottom: 70 }}>{children}</div>
      <BottomNav />
    </>
  );
}

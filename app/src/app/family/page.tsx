import { redirect } from "next/navigation";

// 2026-09-27: this used to be the public family PIN switcher (/family?h=...).
// PIN login was retired for security, so old bookmarks/home-screen links now
// land on the normal login page with an explanation.
export default function FamilyPinRetired() {
  redirect("/login?info=pin-retired");
}

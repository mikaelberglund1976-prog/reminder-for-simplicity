// 2026-10-23 (row 52): shared custody — prepared, behind FEATURE_CUSTODY (components/CustodyCard.tsx).
export const custody = {
  title: "Shared custody",
  preview: "Preview",
  intro: "Which home each child is at, week by week. Coming: reminders and rides follow the parent the child is with.",
  notSet: "Not set",
  pattern: "Pattern",
  patterns: { weekly: "Every other week (7/7)", "2-2-3": "2-2-3", "2-2-5-5": "2-2-5-5" } as Record<string, string>,
  parentA: "Parent A",
  parentB: "Parent B",
  someoneElse: "Someone else…",
  namePlaceholder: "e.g. Mum",
  startDay: "First day with A",
  handover: "Handover time",
  handoverAt: (time: string) => `handover ${time}`,
  save: "Save",
  remove: "Remove",
};

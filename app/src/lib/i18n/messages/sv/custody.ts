import type { Messages } from "../en";

export const custody: Messages["custody"] = {
  title: "Växelvis boende",
  preview: "Förhandsvisning",
  intro: "Var barnet bor, vecka för vecka. Kommer: påminnelser och skjuts följer föräldern barnet är hos.",
  notSet: "Inte inlagt",
  pattern: "Schema",
  patterns: { weekly: "Varannan vecka (7/7)", "2-2-3": "2-2-3", "2-2-5-5": "2-2-5-5" },
  parentA: "Förälder A",
  parentB: "Förälder B",
  someoneElse: "Någon annan…",
  namePlaceholder: "t.ex. Mamma",
  startDay: "Första dagen hos A",
  handover: "Byte kl",
  handoverAt: (time) => `byte ${time}`,
  save: "Spara",
  remove: "Ta bort",
};

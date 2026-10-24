import type { Messages } from "../en";

export const home3: Messages["home3"] = {
  attentionTitle: "Behöver din uppmärksamhet",
  attSeen: "OK",
  attClash: (text) => text,
  attNoRide: (title, who) => `Ingen skjuts än: ${title}${who ? ` (${who})` : ""}`,
  attTestSoon: (who, title, when) => `${who}: ${title} ${when}`,
  attUnassigned: (n) => (n === 1 ? "1 aktivitet saknar person" : `${n} aktiviteter saknar person`),
  attFix: "Fixa",
  startsAt: (day, time) => `Börjar ${day} ${time}`,
  offDay: (day) => `${day} · ledig från skolan`,
  nextLabel: "Nästa:",
  more: (n) => `+${n}`,
  openChild: (name) => `Öppna ${gen(name)} dag`,
  showCalendar: "Visa kalender",
  showAll: "Visa alla",
  comingUp: "Kommande",
  nextLesson: "Nästa lektion",
  testsHomework: "Prov & läxor",
  activities: "Aktiviteter",
  chores: "Sysslor",
  nothing: "Inget",
  noneToday: "Inga i dag",
  allClear: "Inget på gång",
  choresLeft: (n) => `${n} kvar`,
  choresDone: "Allt klart",
  noChoresRow: "Inga sysslor den här veckan",
  today: "I dag",
  todayNothing: "Inget mer i dag",
  childsDay: (name) => `${gen(name)} dag`,
  viewing: (name) => `Du tittar på ${gen(name)} dag – här kan du bocka av, lägga till och ändra.`,
  backHome: "Tillbaka till Hem",
  aboutMe: "Om mig",
  aboutMeTitle: "Vad sparar appen om mig?",
};

// Swedish genitive: "Tyras", but "Elias" stays "Elias".
function gen(n: string) { return /[sxz]$/i.test(n) ? n : `${n}s`; }

import type { Messages } from "../en";

export const timetable: Messages["timetable"] = {
  today: "I dag",
  tomorrow: "I morgon",
  firstLesson: "Första lektion",
  week: "Schema",
  weekOf: (from) => `Vecka från ${from}`,
  thisWeek: "Den här veckan",
  nextWeek: "Nästa vecka",
  noLessons: "Inga lektioner den här dagen",
  noTimetable: "Inget schema än. Slå på \"Schema\" i skolplattformens kalenderexport och synka.",
  close: "Stäng",
  open: (name) => `Öppna ${name}s schema`,
  room: (r) => `sal ${r}`,
};

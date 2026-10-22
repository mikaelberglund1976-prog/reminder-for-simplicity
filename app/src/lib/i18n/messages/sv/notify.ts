import type { Messages } from "../en";

export const notify: Messages["notify"] = {
  cardTitle: "Notiser och mejl",
  intro: "Välj vad du får som mejl och som notis i telefonen. Alla i familjen väljer själva.",
  email: "Mejl",
  push: "Notis",
  kinds: {
    reminders: "Påminnelser",
    school: "Läxor och prov",
    activities: "Aktiviteter",
    birthdays: "Födelsedagar",
    tomorrow: "Kvällsnotis",
    changes: "Ändringar",
  },
  hints: {
    reminders: "Räkningar, tider, resor, sysslor",
    school: "Dagen före ett prov eller en läxa",
    activities: "Träningar och matcher du lagt in själv",
    birthdays: "En vecka före, och på dagen",
    tomorrow: "Morgondagens prov, läxor och aktiviteter kl. 19",
    changes: "En match flyttad, ett nytt prov, en träning inställd",
  },
  pushOffHint: "Notiser behöver slås på för den här telefonen ovan.",
  saved: "Sparat",
  emailOff: (kind) => `Stäng av mejl om ${kind.toLowerCase()}`,
  emailSettings: "Alla inställningar för notiser",
  offTitle: (kind) => `Stänga av mejl om ${kind.toLowerCase()}?`,
  offBody: "Du kan slå på dem igen när du vill under Inställningar → Notiser.",
  offButton: "Stäng av de här mejlen",
  offDone: (kind) => `Klart – inga fler mejl om ${kind.toLowerCase()}.`,
  offInvalid: "Länken gäller inte längre. Ändra i stället under Inställningar → Notiser.",
  toSettings: "Öppna Inställningar",
};

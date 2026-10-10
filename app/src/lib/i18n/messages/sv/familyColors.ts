import type { Messages } from "../en";

export const familyColors: Messages["familyColors"] = {
  cardTitle: "Färger",
  intro: "Välj familjens egna färger – för varje barn och för varje typ. Gäller alla i familjen, i kalendern och på startsidan.",
  peopleTitle: "Personer",
  kindsTitle: "Typer",
  kinds: { reminder: "Påminnelser", chore: "Sysslor", training: "Aktiviteter", homework: "Läxor", test: "Prov" },
  reminderHint: "Standard: varje påminnelsekategori har sin egen färg.",
  calendarByTitle: "Kalenderns färger efter",
  byKind: "Typ",
  byPerson: "Person",
  byPersonHint: "Varje sak får färgen hos den den tillhör.",
  custom: "Egen färg",
  defaultColor: "Standard",
  saved: "Sparat",
  reset: "Återställ alla färger",
  featureName: "Egna färger",
  featureDescription: "Ge varje barn och varje typ (prov, aktiviteter, läxor …) en egen färg i kalendern och på startsidan.",
  onlyAdults: "En vuxen i familjen kan ändra färgerna.",
  choose: (what) => `Välj färg för ${what}`,
};

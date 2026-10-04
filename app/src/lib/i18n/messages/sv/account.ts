import type { Messages } from "../en";

export const account: Messages["account"] = {
  deletionRequested: "Radering begärd",
  waitingFor: (names) => `Väntar på att ${names} godkänner. Kontot fungerar som vanligt tills dess.`,
  theFamilyAdmin: "familjens administratör",
  or: " eller ",
  cancelRequest: "Ångra begäran",
  deleteAccount: "Radera konto",
  cantDelete: "Kan inte raderas än",
  askDelete: "Be om att få kontot raderat?",
  askDeleteBody: (names, days) => `Familjens administratör (${names}) behöver godkänna det. När det är godkänt tas du bort ur familjen och kan inte logga in. Dina uppgifter sparas i ${days} dagar ifall du ångrar dig och raderas sedan för gott.`,
  sendRequest: "Skicka begäran",
  sureTitle: "Är du säker?",
  sureBody: (days) => `Du loggas ut och kan inte logga in igen. Dina uppgifter sparas i ${days} dagar – kontakta oss inom den tiden om du vill ha tillbaka dem – och raderas sedan för gott.`,
  willBecomeAdmin: (name) => ` ${name} blir familjens administratör.`,
  yesDelete: "Ja, radera mitt konto",
  countryCode: "Landsnummer",
  tooShort: (country, n) => `För kort för ${country} – minst ${n} siffror`,
  tooLong: (country, n) => `För långt för ${country} – högst ${n} siffror`,
};

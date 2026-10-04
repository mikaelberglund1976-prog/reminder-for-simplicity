import type { Messages } from "../en";

export const components: Messages["components"] = {
  theme: { appearance: "Utseende", auto: "Auto", light: "Ljust", dark: "Mörkt" },
  ad: { sponsored: "Sponsrat", removeAds: "Ta bort reklam", readMore: "Läs mer" },
  impersonation: {
    viewingAs: (name) => `👁 Visar som ${name}`,
    switchPerson: "Byt person",
    switch: "Byt…",
    child: " (barn)",
    backToMe: "Tillbaka till mig",
  },
  deletionRequests: {
    title: "Begäran om att radera konto",
    body: "Godkänner du tas personen bort ur familjen direkt. Uppgifterna sparas i 60 dagar (kan återställas på begäran) och raderas sedan för gott.",
    asked: (date) => `Bad om det ${date}`,
    decline: "Neka",
    approve: "Godkänn",
    confirm: (name) => `Radera kontot för ${name}?`,
  },
  avatar: { change: "Byt din bild", add: "Lägg till din bild", uploadFailed: "Uppladdningen misslyckades", remove: "Ta bort" },
  listAccess: {
    listName: "Listans namn",
    whoCanSee: "Vem kan se listan",
    everyoneInFamily: "Alla i familjen.",
    onlySome: "Bara vissa i familjen – be en ägare eller förälder ändra det.",
    everyoneCheckbox: "Alla i familjen",
  },
  upgradeGate: {
    trialEnded: "Din gratisperiod är slut",
    isPartOfPro: (feature) => `${feature} ingår i Pro`,
    askParent: "Be en förälder att slå på Pro för familjen.",
    keepUsing: (feature) => `Uppgradera till Pro för att fortsätta använda ${feature.toLowerCase()} – allt ni lagt in finns kvar.`,
    tryFree: "Testa allt gratis i 14 dagar – inget kort behövs.",
    starting: "Startar…",
    startTrial: "Starta 14 dagar gratis",
    requested: "Pro efterfrågat – se status",
    upgrade: "Uppgradera till Pro",
    whatsIncluded: "Det här ingår i Pro →",
    couldNotStart: "Kunde inte starta provperioden",
  },
};

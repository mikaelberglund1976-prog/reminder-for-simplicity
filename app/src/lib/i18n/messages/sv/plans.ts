import type { Messages } from "../en";

export const plans: Messages["plans"] = {
  rows: {
    reminders: { label: "Påminnelser", detail: "Räkningar, abonnemang, födelsedagar, försäkringar – mejl innan det är dags." },
    family: { label: "Delad familj", detail: "Bjud in de andra vuxna. Välj vad som är privat och vad som delas." },
    shopping: { label: "Delad inköpslista", detail: "Alla lägger till, bockar av i butiken. Dela en länk med vem som helst." },
    calendar: { label: "Kalender + synk till telefonen", detail: "Allt med ett datum i en kalender, även i Google Kalender, Outlook eller Apples Kalender." },
    children: { label: "Barnkonton", detail: "Varje barn får en egen inloggning och en egen vecka." },
    chores: { label: "Sysslor", detail: "Återkommande sysslor per barn, som barnet bockar av och du godkänner." },
    school: { label: "Läxor & prov", detail: "Per barn, på Hem och i kalendern. Import från SchoolSoft." },
    activities: { label: "Aktiviteter", detail: "Fotboll på tisdagar, musik på torsdagar – per barn." },
    wishlists: { label: "Önskelistor", detail: "Barnen önskar sig saker; vuxna reserverar utan att avslöja överraskningen." },
    noAds: { label: "Ingen reklam", detail: "Gratisversionen visar ett litet sponsrat kort för vuxna. Barn ser aldrig reklam." },
  },
  cellValues: { oneList: "1 lista", unlimited: "Obegränsat" },
  priceText: (month, year) => `${month} kr/mån eller ${year} kr/år`,
  trialText: (days) => `${days} dagar gratis`,
  included: "Ingår",
  notIncluded: "Ingår inte",
  free: "Gratis",
  pro: "Pro",
};

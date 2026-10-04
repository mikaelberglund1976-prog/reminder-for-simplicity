import type { Messages } from "../en";

export const activities: Messages["activities"] = {
  every: (day) => `Varje ${day.toLowerCase()}`,
  everyDay: "Varje dag",
  weekly: "Varje vecka",
  oneOff: "En gång",
  loading: "Laddar aktiviteter…",
  setUpHousehold: "Skapa din familj först",
  needsHousehold: "Aktiviteter behöver en familj med minst ett barn.",
  goToChores: "Gå till Sysslor →",
  feature: "Aktiviteter",
  gateDescription: "Återkommande aktiviteter som fotboll, scouter eller musik – synkade till familjens kalender. Testa gratis i 14 dagar.",
  notAssigned: "Inte tilldelade någon i familjen",
  intro: "Återkommande aktiviteter för vem som helst i familjen – sport, scouter, teater, musik, möten – synkas till kalendern automatiskt. Välj flera personer så syns den för var och en.",
  add: "Lägg till aktivitet",
  noneYet1: "Inga aktiviteter än. Tryck på ",
  noneYet2: " ovan.",
  noneBooked: "Inga aktiviteter bokade än.",
  title: "🎯 Aktiviteter",
};

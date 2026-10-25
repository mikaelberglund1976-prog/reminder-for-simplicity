import type { Messages } from "../en";

export const sources: Messages["sources"] = {
  title: "Kalendrar & integrationer",
  intro: "Alla skol- och klubbkalendrar som familjen har kopplat. De uppdateras av sig själva en eller två gånger om dagen – du behöver bara titta här om något är fel.",
  adultsOnly: "Bara vuxna i familjen ser kalenderlänkarna.",
  none: "Inga kalendrar kopplade än. Koppla skolplattformen eller en klubbkalender så kommer läxor, prov, träningar och matcher in av sig själva.",
  lastSync: (when) => `synkad ${when}`,
  notYet: "inte än",
  items: (n) => (n === 1 ? "1 post" : `${n} poster`),
  failed: "Synkar inte",
  stale: "Har inte synkat på ett tag",
  syncNow: "Synka nu",
  syncing: "Synkar…",
  synced: "✓ Synkad",
  manage: "Hantera →",
  addSchool: "+ Koppla skola",
  addActivity: "+ Koppla klubbkalender",
  settingsRow: "Kalendrar & integrationer",
  settingsHint: "Skol- och klubbkalendrar, synkstatus",
};

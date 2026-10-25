import type { Messages } from "../en";

export const language: Messages["language"] = {
  title: "Språk",
  familyHint: "Språket för hela familjen – appen, mejl och påminnelser. Bara familjens administratörer kan ändra det.",
  onlyAdmins: "Bara familjens administratörer kan ändra språket.",
  changed: "Språket är ändrat",
  thisDevice: "Språk på den här enheten",
  label: "Språk",
  mine: "Mitt språk",
  mineHint: "Bara för dig – appen, dina mejl och dina notiser. Resten av familjen behåller sitt.",
  followFamily: (name) => `Familjens (${name})`,
  familyDefault: "Familjens standardspråk",
  familyDefaultHint: "Gäller alla som inte valt ett eget. Bara familjens administratörer kan ändra det.",
};

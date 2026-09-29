# Att göra – pausat arbete (2026-09-27)

> ✅ **AVKLARAT 2026-09-28.** (Läge 29/9: senare arbete i `RELEASE_2026-09-28b.md` och `RELEASE_2026-09-29.md`.) Allt nedan är live. Se `RELEASE_2026-09-28.md` och `TODO.md` punkt 32. Enda kvarvarande steget för Mikael: skicka ny inbjudan till barnkontot (Profile → Child accounts → Resend invite). Öppna frågorna är besvarade: Läxor & prov = Pro; saker tilldelade en raderad person blir "Unassigned" direkt.

Kodat men **inte committat, inte deployat**. Pausat för att Mikael först gör en review av gränssnittet.
Detaljer: `TODO.md` punkt 31 · Checklista: `LAUNCH_CHECKLIST.md`.

## Vad som ligger och väntar
- PIN borttaget – alla konton: verifierad e-post + lösenord, eller Google
- Barnkonton skapas med namn + e-post, barnet väljer lösenord via mail
- Mjuk radering: familjeadmin godkänner, 60 dagars återställning i `/admin` → Deleted
- Läxor & prov: typ, ämne, avbockning, överst för barnet, visa/dölj i kalender, mail dagen före

## ⚠️ Under UI-reviewen
- [ ] **Pusha inte till `master` med de här ändringarna i arbetsträdet.** De kräver databasändringar – pushas de innan `db push` slutar inloggningen fungera i produktion.
- [ ] Enklast: lägg ändringarna på en egen gren först (VS Code → Source Control → `...` → Branch → Create Branch → `feature/konton-radering-laxor` → commit där), byt sedan tillbaka till `master` och gör UI-reviewen där.

## När vi återupptar – i ordning
1. [ ] Verifiera egen avsändardomän i Resend + sätt `RESEND_FROM_EMAIL` i Vercel (annars når verifierings-/inbjudningsmail inte fram)
2. [ ] Slå ihop UI-review-ändringarna med grenen `feature/konton-radering-laxor` (lös ev. krockar – framför allt `profile/page.tsx`, `dashboard/family/page.tsx`, `dashboard/school/page.tsx`, `family/child/page.tsx`)
3. [ ] I `app/`: `npx prisma generate && npm run db:push`
4. [ ] I `app/`: `node scripts/migrate-2026-09-retire-pin.js`
5. [ ] Push → kontrollera Vercel READY
6. [ ] Skicka inbjudningar till barnkonton (Profile → Child accounts → Resend invite)
7. [ ] Klicktesta:
   - [ ] Registrera → mail → bekräfta → logga in
   - [ ] "Resend confirmation email" på login-sidan
   - [ ] Skapa barn → mail → välj lösenord → barnet hamnar i barnvyn med läxor överst
   - [ ] Radera som medlem (begäran → admin godkänner/nekar), som admin, och ett barnkonto
   - [ ] Återställ ett raderat konto i `/admin` → Deleted
   - [ ] Läxa/prov: lägg till, bocka av, dölj/visa i kalendern, ICS-flödet
8. [ ] Uppdatera `LAUNCH_CHECKLIST.md` + `TODO.md` med resultat

## Öppna frågor att ta ställning till
- [ ] Ska Läxor & prov vara gratis? Idag Pro/trial-låst – utan trial ser barnet en låst ruta.
- [ ] Saker tilldelade en raderad person (t.ex. barnets önskelista) syns för familjen under de 60 dagarna – ok?

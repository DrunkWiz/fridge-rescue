@AGENTS.md

## Repo notes (deviations from the brief below)

- Code lives under `src/` (Expo SDK 57 template default): `src/app`, `src/components`, `src/lib/{rules,storage,api,purchases}`, `src/store`. Same shape as section 7, one level down.
- Rules tests use Node's built-in runner (`npm test`), so rules files import siblings with explicit `.ts` extensions and only `import type` from outside `src/lib`.
- `@types/node` is a devDependency purely so the test file typechecks.
- Extra deps beyond section 5: `@anthropic-ai/sdk` (the one recipe call) and `react-native-purchases-ui` (RevenueCat Paywalls, required by section 6).
- Testing happens in the browser preview (Expo web target) — keep it working. Native-only modules need a web path: RevenueCat uses its browser mode with a Test Store key; expo-camera and expo-location have web implementations.
- Pro = RevenueCat `pro` entitlement OR admin mode (password `Admin-demo`, `ADMIN_CODE` in `src/lib/purchases`; linked from the Impact tab and long-press on the Pro pill). Admin mode works in every build (judges use it) and also unlocks every outfit.

---

# Project Brief — Fridge Rescue (RevenueCat Shipaton 2026, Next Gen Award)

> Drop this file in the repo root as `CLAUDE.md`. It is the persistent context for this project.
> Read it fully before writing code. Ask before deviating from the scope in section 4.

---

## 1. The competition (why the constraints exist)

**Event:** RevenueCat Shipaton 2026 — a global mobile app hackathon.
**Track:** Next Gen Award — the student-only category, new for 2026.
**Hard deadline:** Wednesday **30 September 2026, 11:45pm PDT**. Submissions go through Devpost.
**Today is 23 September 2026.** That leaves roughly **4 days of build + 1 day for video and submission.** This is the single most important constraint in this document. Scope is the enemy.

### Why Next Gen changes everything
Next Gen is judged on a **video submission and open-source source code**, not an App Store listing. There is **no paid Apple or Google developer account required** and **no app review wait**. So:

- We never ship to a store. We never touch App Store Connect or Play Console.
- The **public GitHub repo is a judged artifact**, equal in weight to the app itself. Code quality, README, and commit history all count.
- Purchases must still be demonstrably working, but via RevenueCat's **Test Store** mode (see section 6).

### Judging criteria (build against these literally)
1. **Idea** — is it clear, useful or original, and does it solve a real problem?
2. **Working core** — do the video and code show meaningful progress toward a working app?
3. **Monetization** — does the project thoughtfully use RevenueCat (subscriptions, IAP, web purchases, ads, or another flow)?
4. **Craft** — good technical choices, product thinking, and care in how it is built and presented.

Every decision below traces back to one of these four. When trading off, ask which criterion the work serves.

---

## 2. What must be submitted

| Item | Requirement | Notes |
|---|---|---|
| Public GitHub repo | Open source **license file, visible in the repo's About section** | Add MIT at repo creation. Not day 5. |
| Demo video | **Under 2 minutes**, publicly viewable (YouTube unlisted/public) | Shows problem → app on device → purchase flow → one line on tech |
| App icon | 1024 × 1024 px | |
| Screenshot | 1179 × 2556 px, **no device frame** | |
| Text description | Devpost submission form, written per category | |
| Student eligibility | Academic email on Devpost (domain-checked via JetBrains/swot) | Verify the domain *now*, not on the 30th |
| Guardian consent | Required if under the age of majority where the entrant lives | Separate Google Form. Note: age of majority is 21 in some jurisdictions, not 18. |

**Verify every row above against the live Devpost rules page before submitting.** These were read on 23 Sep 2026 and details can change.

Also worth doing (free upside, low cost): post daily build updates tagged **#Shipaton** — there is a separate build-in-public award.

---

## 3. The app — Fridge Rescue

### One-line pitch
A food-waste app where the food you save feeds a creature that visibly thrives or wilts — and when you have bought too much, it routes the surplus to a nearby food bank instead of the bin.

### Why this and not another expiry tracker
The App Store is saturated with expiry trackers (Fridgi, EatSpoiler, FreshSave, FridgeUp, Use By, FridgeSmart). **Every one of them is a utility**: alerts, inventory, money saved. None has a game layer, and none routes surplus to donation. Those two things are the entire differentiator. **Do not let either get cut or buried.**

### The core intellectual insight (this is what makes it not a clone)
**Expiring soon and surplus are two different problems with two different answers.** Food banks generally cannot accept food about to expire — donated food needs sorting, storage and distribution, which takes weeks. So the app branches:

- **Perishable + expiring soon → RESCUE.** Generate a recipe using exactly those items. The user cooks it.
- **Shelf-stable + surplus + long-dated → DONATE.** Group into a donation box, find a nearby drop-off point.

If the app ever suggests donating yoghurt that expires Thursday, the product is wrong.

### Surplus detection rules
Flag an item as a **donation candidate** only when ALL hold:
1. Category is shelf-stable (tinned, dried, jarred, packaged, UHT).
2. Unopened.
3. Days-to-expiry **> 60** (below that a food bank likely cannot use it). Make this a named constant, not a magic number.
4. At least one surplus signal:
   - quantity > 2, OR
   - added > 30 days ago and never marked used ("stale"), OR
   - duplicate of an item already owned.

Present candidates **grouped, not individually**. The prompt is never "donate this tin" — it is *"You have 7 items you'll probably never eat. That's about 5 meals for someone."*

### The creature
Two food sources, which is better game design than one:
- **Rescues** (weekly-ish) keep it fed day to day.
- **Donations** (monthly-ish) are the rare event — badge, accessory, visible glow.

Lifetime counter with two numbers: **meals rescued** and **meals donated**. That counter is the shareable card and the closing shot of the video.

**Implementation:** do NOT build an animation rig. Use 4–5 static illustrations (thriving / content / hungry / wilting / celebrating), cross-faded with a small scale bounce via Reanimated. One hour, looks deliberate. A half-finished Lottie rig takes a day and looks broken. The creature lives on the **home screen**, not in a tab, and its state must change **visibly within the demo video**.

---

## 4. Scope — build in this order, cut in reverse

### Day 1 — Foundation
- Expo dev build running on a real device (see section 5 gotcha — do this FIRST).
- Data model + persistence.
- Add-item flow (manual first, barcode second).
- Home screen: items sorted by urgency, creature on top.

### Day 2 — The two branches
- Rescue view: perishables expiring within N days → one AI call → recipe from selected items.
- Donation box: surplus rules → grouped candidates.

### Day 3 — Donation loop + creature
- Overpass lookup for nearby food banks, list view (map optional).
- "I dropped these off" confirmation, optional photo.
- Impact counter.
- Creature states, visibly distinct.

### Day 4 — Monetization + polish
- RevenueCat SDK, entitlement gating, paywall.
- Visual polish.
- README (leave the evening for this).

### Day 5 — Ship
- Record video, capture icon + screenshot, write Devpost description, submit.
- **Submit in the morning, not at 11:45pm PDT.** Devpost gets slow near deadline.

### Cut order if running late
1. Rewarded ads
2. Barcode scanning (manual entry is fine)
3. Map (a list of food banks works)
4. Cosmetics

**Never cut:** the creature, or the donation flow. Those are the differentiator.

---

## 5. Stack and technical decisions

**React Native + Expo (TypeScript).** Chosen for speed: JS/TS not Swift/Kotlin, one codebase, no Mac required, first-class RevenueCat SDK.

```bash
npx create-expo-app@latest fridge-rescue --template
cd fridge-rescue
npx expo install expo-dev-client expo-camera expo-location \
  expo-notifications @react-native-async-storage/async-storage
npm install react-native-purchases zustand
```

### THE GOTCHA — handle on day 1
`react-native-purchases` contains native code and **will not run in Expo Go**. A development build is required:
- `npx expo run:android` (needs Android Studio), or
- `eas build --profile development --platform android` (free tier).

Discovering this on day 3 costs hours that do not exist.

### Storage — keep it dumb
**No SQLite.** AsyncStorage holding a JSON array, Zustand for state. The dataset is ~50 items; a database buys nothing and costs a day. Load array on launch, write back on every change.

### Data model
```ts
type Item = {
  id: string;
  name: string;
  category: Category;          // drives shelfStable
  shelfStable: boolean;
  quantity: number;
  addedAt: string;             // ISO
  expiresAt: string;           // ISO
  opened: boolean;
  status: 'active' | 'used' | 'donated' | 'wasted';
};
```
`status` matters: `used`, `donated` and `wasted` all feed the creature and the impact counter differently. Wasted food should have a visible, gentle consequence — not a guilt trip.

### External APIs — all free, all keyless (except AI)
| Need | Service | Notes |
|---|---|---|
| Barcode → product | Open Food Facts: `https://world.openfoodfacts.org/api/v2/product/{barcode}.json` | No key, no signup. Read name + category. |
| Nearby food banks | Overpass API (OpenStreetMap) | Query `social_facility=food_bank` and `amenity=social_facility` within radius. No key. |
| Recipe from expiring items | One AI API call | Key in `.env`, `.env` in `.gitignore`, commit `.env.example`. |

Barcode scanning is built into `expo-camera` — no separate scanner package.

**Known limitations to handle honestly:** OSM food-bank coverage is patchy in some regions and opening hours are often missing. Ship a fallback — a bundled JSON of a few real, verified local drop-off points — plus manual location entry. **Document this in the README.** A clearly understood limitation reads as maturity.

**Do not attempt to verify donations.** Trust-based "I dropped these off" tap. State this in the README along with how it would be verified later (partner check-in codes). Judges respect a named known-unknown far more than a hand-wave.

**Never commit the AI key.** A leaked key in a public judged repo is an ugly thing for a judge to find.

---

## 6. RevenueCat integration

### Demoing purchases with no developer account
Use RevenueCat's **Test Store** mode, built for exactly this case — exercises purchase flows without App Store Connect or Play Console. **Check current docs for the minimum SDK version**, it is a recent addition.

### Configuration
- One entitlement: `pro`
- One offering with monthly + annual packages
- Gate on `customerInfo.entitlements.active['pro']`

### Paywall
Use **RevenueCat's own Paywalls component**, remotely configured from the dashboard, not a hand-rolled screen. Better default appearance, and "I configured the paywall remotely through RevenueCat" is a stronger answer to the monetization criterion.

### The monetization rule that keeps this defensible
**Never paywall the rescuing or the donating.** Charge for convenience and vanity only. A judge will notice if the social good is behind the paywall, and it would be indefensible.

| Tier | Includes |
|---|---|
| **Free** | 25 tracked items, expiry alerts, basic recipes, **full donation flow**, base creature |
| **Pro** | Unlimited items, receipt scanning, AI recipes from leftovers, household/flatmate sharing, impact history + export, cosmetics |
| **Earned (not bought)** | Some cosmetics unlock only via donation milestones — gives free users a reason to stay, makes the paywall feel generous |
| **Optional** | Rewarded ad unlocks a cosmetic, via RevenueCat Ads. Two monetization methods scores well on criterion 3. **Cut first if time is tight.** |

### Store-policy note for the README
**Do not collect monetary charitable donations via IAP.** Apple requires nonprofit monetary donations to go through Apple Pay or a web flow, not IAP; Google has similar rules. This app moves **food, not money**, which sidesteps the issue entirely. One sentence in the README on this shows store-rules awareness.

If a philanthropy angle is wanted: pledge a percentage of subscription revenue to a named food bank and say so on the paywall. That is a copy change, not an engineering problem.

---

## 7. The repo (this is judged — treat it as a deliverable)

```
/                   README.md, LICENSE (MIT), .env.example, CLAUDE.md
/app                screens (expo-router)
/components         UI, incl. Creature/
/lib
  /storage          AsyncStorage persistence
  /rules            surplus detection — pure functions, THIS IS THE INTERESTING CODE
  /api              openfoodfacts.ts, overpass.ts, recipes.ts
  /purchases        RevenueCat wiring
/store              zustand
/assets             creature states, icon
```

### README structure — map it to the judging criteria
1. **What it is** — one paragraph, one screenshot.
2. **The problem** — food waste, and the rescue-vs-donate distinction. This is the "Idea" criterion; make the reasoning explicit.
3. **Demo** — video link + 3–4 screenshots.
4. **How it works** — surplus rules with the actual thresholds, creature states, donation flow.
5. **Monetization** — the tier table and *why* the social good is free. This is criterion 3; spell out the reasoning rather than just listing features.
6. **Tech** — stack, architecture, why Expo, why no database.
7. **Limitations & what's next** — OSM coverage, trust-based donations, how verification would work.
8. **Setup** — clone, install, `.env.example`, dev build. Must actually work for a judge who tries it.
9. **License.**

**Commit history is visible.** Small, descriptive commits throughout, not one "initial commit" dump on day 4. Put the surplus rules in pure, testable functions — if there is any spare time at all, a small test file for `/lib/rules` is high-value signal for the Craft criterion.

---

## 8. The video (under 2 minutes)

| Time | Content |
|---|---|
| 0:00–0:15 | The problem, stated personally. Not statistics. |
| 0:15–0:50 | Add items → an item goes urgent → rescue flow → recipe → creature perks up |
| 0:50–1:20 | Donation box → surplus explained → nearby food bank → dropped off → creature celebrates |
| 1:20–1:40 | Paywall + purchase unlocking a feature (**must be on camera**) |
| 1:40–2:00 | Impact counter, one line on tech, done |

Real Android device over USB looks better than an emulator. Either is acceptable.

---

## 9. Working agreement for Claude Code

- **Time is the binding constraint.** When a choice is between elegant and shippable, pick shippable and note the tradeoff in the README's limitations section.
- Do not add dependencies beyond section 5 without flagging why.
- Do not expand scope. If something in section 4 is finished early, polish what exists — do not start a feature not listed.
- Flag immediately if the dev build, Test Store, or Overpass hits a wall, since each has a documented fallback.
- Keep the creature and the donation branch working at all times. They are the differentiator; a broken one is worse than an absent feature.

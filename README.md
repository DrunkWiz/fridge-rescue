# Fridge Rescue 🌱

**A food-waste app where the food you save feeds a creature that visibly thrives or wilts — and when you've bought too much, it routes the surplus to a nearby food bank instead of the bin.**

Built with React Native + Expo for the RevenueCat Shipaton 2026 (Next Gen Award).

<!-- TODO: hero screenshot (1179 × 2556, no device frame) -->

---

## The problem

Most household food waste isn't one big mistake. It's the yoghurt found three days late and the fourth tin of chickpeas bought because you forgot about the other three.

Those are **two different problems with two different answers**, and the expiry trackers on the app stores treat them as one:

| | Expiring soon | Surplus |
|---|---|---|
| **Example** | Spinach, chicken, yoghurt due this week | Five tins of chickpeas, pasta untouched for two months |
| **Can a food bank take it?** | **No.** Donations take weeks to sort, store and distribute. | **Yes.** Long-dated, unopened, shelf-stable food is exactly what they need. |
| **Right answer** | **Rescue**: cook it tonight | **Donate**: box it up, drop it off |

So Fridge Rescue branches. Perishables close to their date go to a recipe built from exactly those items. Long-life surplus goes into a donation box, with the nearest drop-off point. The app will never suggest donating yoghurt that expires on Thursday.

Existing trackers (Fridgi, EatSpoiler, FreshSave, FridgeUp, Use By, FridgeSmart…) are utilities: alerts, inventory, money saved. None has a reason to come back other than guilt, and none routes surplus to people who need it. Fridge Rescue adds both.

## Demo

<!-- TODO: YouTube link (under 2 minutes) -->
<!-- TODO: 3–4 screenshots: home with creature · rescue recipe · donation box · paywall -->

## How it works

### Rescue: expiring perishables → one recipe

Perishables within **3 days** of their date (`RESCUE_WINDOW_DAYS`) appear on the Rescue card. Pick what you want to use and get one recipe that uses all of it. Expired food is never included; the app doesn't tell you to eat something past its date.

- **Free:** a simple built-in recipe that works offline.
- **Pro:** a recipe written by Claude from exactly those ingredients plus pantry staples, returned as structured JSON so it renders cleanly.

### Donate: surplus → the nearest food bank

An item is a donation candidate only when **all** of these hold ([`src/lib/rules/surplus.ts`](src/lib/rules/surplus.ts)):

1. Shelf-stable category: tinned, dried, jarred, packaged, UHT
2. Unopened
3. More than **60 days** to expiry (`DONATION_MIN_DAYS_TO_EXPIRY`)
4. At least one surplus signal:
   - quantity **> 2** (`SURPLUS_QUANTITY_THRESHOLD`), in which case it suggests donating the extras and keeping 2
   - added more than **30 days** ago and never used (`STALE_AFTER_DAYS`)
   - a **duplicate** of something you already own (the newer entry is flagged, not the original)

Candidates are presented as one box, never item by item: *"You have 7 items you'll probably never eat. That's about 5 meals for someone."*

Drop-off points come from OpenStreetMap via the Overpass API (`social_facility=food_bank` and `amenity=food_bank`), sorted by distance from your location or a town/postcode you type. You can also add any drop-off point yourself. "I dropped these off" moves only the donated units out of your fridge.

### The creature

Sprout lives on the home screen and reacts to what you do:

| Mood | When |
|---|---|
| 🎉 Celebrating | You donated in the last 2 days (rare, big event) |
| 🌿 Thriving | 3+ rescues this week, nothing waiting |
| 🙂 Content | Nothing urgent |
| 😮 Hungry | Something needs rescuing |
| 🥀 Wilting | More binned than rescued this week, or 2+ expired items left in the fridge |

Rescues feed it day to day; donations are the rare celebration. Waste has a visible, gentle consequence, not a guilt trip. Five static poses cross-fade with a small Reanimated bounce; there's deliberately no animation rig.

Lifetime counters (**meals rescued** and **meals donated**) sit under the creature and on the shareable Impact card.

### Look and feel

Sprout is 1-bit-style **pixel art** (a 16×20 grid, [`sprites.ts`](src/components/creature/sprites.ts)): each mood has its own face and colour, each growth stage adds foliage, and every accessory is a pixel overlay. The rest of the UI follows: ink on white, typewriter numbers, a bracketed pixel XP bar `[■■■■■   ]`, square bordered cards, and a deadpan status line ("sprout is hungry."). Design inspiration came from pixel-pet habit apps like Walking Charlie.

### Designed to be quick

Home opens on **what needs doing today**: food past its date ("did you eat it?"), then what to use soon, then the rest of the fridge. **Swipe right = ate it, swipe left = binned it**, both with undo. Tap an item for **froze it ❄** (adds 60 days and counts as a save), opened, or remove. Cooking a rescue recipe can **add the leftovers** with a 3-day date. Photo scanning gives free users **3 scans a month**, so the easiest way to add food isn't paywalled.

### Stopping waste before it starts

- **Before you shop**: paste your shopping list and the app flags what's already at home ("chickpeas: you already have 5, 17 months left"). Surplus is cheapest to prevent at the shop.
- **Type or paste to add**: "2 x milk, eggs x6, 3 tins black beans" or an online order becomes a reviewable list with categories and dates guessed. No AI or network needed ([`lists.ts`](src/lib/rules/lists.ts)).
- **Partial use**: "ate 1" on multi-packs, so the fridge matches reality.

### Why people keep coming back

The app is only useful if it's opened *before* food goes off, so the game layer is built around that one habit:

| Mechanic | What it does | Rule |
|---|---|---|
| **Growth** | Sprout grows from Seed to Ancient Tree: bigger, leafier, then blossoming | +10 XP per item rescued, +25 per item donated ([`progress.ts`](src/lib/rules/progress.ts)) |
| **Waste-free streak** 🔥 | Days in a row without wasting food | Resets on binned food. Expired food isn't assumed wasted: the app asks **"did you eat it?"** first, and only counts it after `EXPIRED_GRACE_DAYS` (2) unanswered. Counts from when you started, so backdated items can't grant an unearned streak |
| **Badges → wardrobe** 🏅 | 8 badges, each unlocking a pixel accessory for Sprout (cap, scarf, crown, sunglasses…) | Cosmetics are **earned, not bought**; two extra are Pro |
| **Seeds + shop** 🌱 | In-game currency spent on pixel outfits in the Shop tab | +2 per item rescued, +5 per item donated, +1 per daily fridge check, +10 per badge, plus weekly challenge rewards. **Seeds can't be bought with money** |
| **Daily stars** ⭐ | Opening your fridge each day counts automatically (no fake "check-in" tap); the last 7 days show as ⭐ opened / 🌟 saved food | The habit that actually prevents waste, made visible |
| **Weekly challenge** 🎯 | The one weekly goal: a new challenge every Monday ("rescue 3 fruit & veg", "make a donation"…) for bonus seeds | Same challenge for everyone each week, so it could become social later |
| **Meal diary** 📸 | Every rescue lands in a diary on the Impact tab, with an optional photo of what you cooked | A scrapbook of meals that would have been waste; photos are copied into app storage so they survive |
| **Seasonal outfits** 🎃 | Limited-time shop items: a pumpkin hat for harvest season (15 Sep–1 Nov), a Santa hat in December | Bought once, kept forever; buying takes two taps so a stray tap never spends seeds |
| **Weekly recap** 🔔 | Sunday 6pm: "this week: 5 rescued, 2 donated, 0 binned. pip is proud of you 🌱" | Worded from the fridge and rescheduled on every change; never scolds |
| **Money saved** 💰 | "≈ $20 saved": food eaten, donated or frozen, valued with rough per-category prices ([`money.ts`](src/lib/rules/money.ts)) | Money motivates more than meals; always shown as an estimate |
| **Celebrations** 🎉 | Everyday saves get a quick toast with **undo**; level-ups, badges and completed challenges get veggie confetti. Haptics on device | Diffed before/after each action, so any new action gets it for free; keeping confetti for milestones keeps it special |
| **Talk to Sprout** 💬 | Tap it: it jumps and tells you something you can act on now ("the spinach expires tomorrow…") | Always actionable, never trivia-only |
| **Reminders** 🔔 | A local notification the evening before perishables expire, in Sprout's voice | One per day, grouped; rescheduled whenever the fridge changes |
| **Gentle consequences** 🥀 | Binning food shows the streak it ended, and Sprout wilts until your next rescue | No guilt trips, just a visible reason to do better next time |

## Monetization

Built on RevenueCat: one `pro` entitlement, one offering (monthly and annual), and **RevenueCat's own Paywall component, configured remotely from the dashboard**. No prices or paywall copy are hard-coded in the app.

| Free | Pro | 
|---|---|
| 25 tracked items | Unlimited items |
| Add by hand or barcode, plus 3 photo scans a month | **Unlimited** receipt / shopping photo scans |
| Expiry tracking + basic recipes | AI recipes from exactly what's expiring |
| **Full donation flow** | Month-by-month impact history + CSV export |
| The creature + shareable impact counters | |

**Why the social good is free.** Rescuing and donating are the point of the app, so they're never behind the paywall. Pro charges for convenience (more items, better recipes) and for looking back at your record (history, export). Putting "donate to a food bank" behind a subscription would be indefensible, and it would shrink the number of people doing it.

**Store rules.** The app moves **food, not money**. Monetary charitable donations can't go through in-app purchase on either store (Apple requires Apple Pay or a web flow for nonprofit donations), so the donation flow deliberately involves no payment at all.

**No developer account needed.** Purchases run against RevenueCat's **Test Store**, so the full purchase flow works on a development build and in the browser preview, without App Store Connect or Play Console.

## Tech

- **Expo SDK 57 / React Native 0.86, TypeScript, Expo Router.** One codebase, no Mac required, and a first-class RevenueCat SDK. The browser preview is used for fast iteration; the app itself is a mobile app built with EAS.
- **Zustand + AsyncStorage, no database.** The whole fridge is roughly 50 items. It's one JSON blob loaded on launch and written on every change. SQLite would cost a day and buy nothing.
- **Business rules are pure functions** in [`src/lib/rules/`](src/lib/rules): urgency, surplus detection, creature mood, impact history. They take `now` as a parameter and are covered by tests on Node's built-in test runner (`npm test`, no test framework dependency).
- **Keyless APIs** for everything except AI: Open Food Facts (barcode → product), Overpass (food banks), Nominatim (typed location → coordinates).
- **Claude** (`claude-opus-5`, JSON-schema structured output) for two Pro features: recipes from expiring items (with a built-in fallback recipe) and **receipt / grocery photo scanning**. Scanning is one vision call that returns name, category, quantity and estimated shelf life per item. The output then goes through a pure, tested sanitizer ([`scan.ts`](src/lib/rules/scan.ts)) that drops non-food lines like carrier bags and totals, merges duplicate receipt lines, clamps values, and fixes SHOUTY receipt names, before the user reviews and edits the list. Without a key, a labelled sample receipt demonstrates the same review flow.

```
src/
  app/          screens (expo-router): home, add-item, rescue, donate, impact, paywall, admin
  components/   UI, incl. creature/
  lib/
    rules/      surplus detection, urgency, creature mood, impact — pure + tested
    api/        openfoodfacts.ts, overpass.ts, recipes.ts
    purchases/  RevenueCat wiring + Pro state
    storage/    AsyncStorage persistence
  store/        zustand
  data/         bundled fallback drop-off points
```

## Limitations & what's next

- **OpenStreetMap coverage is patchy.** Some areas have no food banks tagged, and opening hours are often missing. The app says so, falls back to a bundled list of verified drop-off points, and lets you add your own. Next: partner directly with regional food bank networks for a maintained list.
- **Donations are trust-based.** "I dropped these off" is a tap, not a verification. Next: partner food banks show a rotating check-in code at the drop-off point; entering it confirms the donation and could unlock verified badges.
- **The AI key is in the app bundle.** Fine for a demo, not for production. Next: proxy the recipe call through a small backend that holds the key and rate-limits per user.
- **Meals are an estimate.** One donated item ≈ 0.7 meals (`MEALS_PER_DONATED_ITEM`). It's a rough, conservative heuristic, not a nutritional calculation.
- **Scanned shelf lives are estimates.** Receipts rarely print use-by dates, so Claude estimates typical shelf life; the review screen shows every date before anything is saved.
- **Not yet built:** household sharing.

## Setup

Requires Node 20+.

```bash
git clone <this repo>
cd fridge-rescue
npm install
cp .env.example .env    # all keys optional — see below
```

**Run in the browser** (fastest way to try it; purchases work with a Test Store key):

```bash
npm run web
```

Tap **"Load a demo fridge"** on the empty home screen to get a fridge that exercises both branches.

**Run on an Android device.** RevenueCat has native code, so this needs a development build, not Expo Go:

```bash
npx eas-cli@latest login
npm run build:dev        # cloud build → installable APK
npx expo start           # then open the dev build on the phone
```

**Run on an Android emulator (local build).** Needs the Android SDK and JDK 17. Android Studio provides both; or install just the SDK command-line tools plus a JDK.

```bash
# once: create an emulator (API 36, Pixel)
avdmanager create avd -n Pixel_API_36 -k "system-images;android-36;google_apis;x86_64" -d pixel_7
emulator -avd Pixel_API_36 &
# build, install and launch the dev build on it
npm run android
```

Requires `ANDROID_HOME` (e.g. `%LOCALAPPDATA%AndroidSdk`) and `JAVA_HOME` pointing at JDK 17.

**Environment variables** (`.env`, never committed):

| Variable | Needed for | Without it |
|---|---|---|
| `EXPO_PUBLIC_REVENUECAT_API_KEY` | Paywall + purchases (use a Test Store key, prefix `test_`) | "Go Pro" explains purchases aren't set up |
| `EXPO_PUBLIC_ANTHROPIC_API_KEY` | AI recipes (Pro) | Built-in recipes only |
| `EXPO_PUBLIC_ADMIN_PRO_KEY` | Testing Pro without a purchase: long-press the Pro pill on Home and enter it. **Development builds only**; release builds ignore it. | No admin bypass |

**Tests, lint, types:**

```bash
npm test
npm run lint
npm run typecheck
```

## License

[MIT](LICENSE)

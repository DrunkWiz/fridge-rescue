# Shipaton 2026 submission kit

Working copy for the Devpost form and the demo video. Keep every claim here true to what the app does today.

## Devpost

**Name:** Fridge Rescue

**Tagline (short):** The food you save feeds a pixel pet, and the food you'll never eat goes to a food bank.

### Inspiration

Most household food waste isn't one big mistake. It's the yoghurt found three days late and the fourth tin of chickpeas bought because you forgot the other three. Every expiry-tracker app treats those as the same problem, and every one of them is a utility you stop opening after a week.

They're two different problems. Food that's about to expire can't go to a food bank: donations take weeks to sort and hand out. It has to be eaten tonight. Long-life surplus is the opposite: it's exactly what food banks need. So we built an app that knows the difference, and gave people a reason to open it every day.

### What it does

- **Rescue:** perishables within 3 days of their date surface on the home screen. Pick them and get one recipe that uses all of them (a built-in recipe for everyone; a Claude-written one for Pro).
- **Donate:** shelf-stable, unopened, long-dated food that you have too much of (more than 2, untouched for a month, or a duplicate) goes into a donation box: *"You have 8 items you'll probably never eat. That's about 6 meals for someone."* It finds the nearest food bank from OpenStreetMap. The app never suggests donating food that's about to expire.
- **Sprout, the pixel pet:** it thrives when you rescue food, celebrates when you donate, and wilts (gently) when food is binned. It grows through six stages, earns badges, keeps a waste-free streak, and wears outfits bought with seeds earned by saving food: 48 items, from a chef hat to a full T-rex costume with its own volcano backdrop.
- **Stopping waste at the shop:** a shopping list that warns "you already have 5 chickpeas, 17 months left", sends straight to the family chat as text, and moves ticked items into the fridge.
- **Quick to use:** swipe right for "ate it", left for "binned it", both with undo. Add by barcode, receipt photo, pasting a list, or a scroll-wheel date picker.

### How we built it

- React Native + Expo SDK 57 (TypeScript, Expo Router), Zustand + AsyncStorage. No database: a fridge is ~50 items.
- **All the business rules are pure, tested functions** (`src/lib/rules`): urgency, surplus detection, creature mood, XP and seeds, badges, weekly challenges, shopping-list matching. 68 tests on Node's built-in runner.
- Keyless APIs: Open Food Facts (barcodes), Overpass/OpenStreetMap (food banks), Nominatim (typed locations).
- Claude (`claude-opus-5`, JSON-schema output) for Pro recipes and receipt scanning, behind a sanitiser that drops carrier bags and totals.
- Sprout is drawn as a 16×20 pixel grid in code, with every accessory, outfit and backdrop as a pixel map. There's no image asset or animation rig.

### How we use RevenueCat

- **Subscriptions:** one `pro` entitlement, one offering (monthly $9.99 / annual $79.99), running on **RevenueCat's Test Store**, so the whole purchase flow works without App Store Connect or Play Console.
- **Paywall:** RevenueCat's own Paywall component, **configured remotely in the dashboard**. No prices or copy are hard-coded.
- **Second revenue stream: opt-in rewarded ads.** In the shop, free users can watch an AdMob rewarded ad for +10 seeds, up to 3 a day. Every ad event (loaded, shown, clicked, paid) is reported to **RevenueCat's ad tracker**, so ad and subscription revenue sit in one dashboard. Pro users collect the same bonus without the ad.
- **The social good is never paywalled.** Rescuing and donating are free for everyone. Pro pays for convenience (unlimited items and scans, AI recipes, history and CSV export) and vanity (Pro-only outfits). Seeds can't be bought with money. The app moves food, not money, so it avoids the store rules on in-app charitable donations entirely.

### Challenges we ran into

- The rescue-versus-donate line: getting the surplus rules right so the app never suggests donating yoghurt that expires Thursday.
- Making a game layer that rewards the habit that actually prevents waste (opening the fridge before food goes off) rather than grinding. Expired food isn't counted as waste straight away: the app asks "did you eat it?" first.
- RevenueCat's Test Store only runs in debuggable builds, which shaped how we ship the demo APK.

### Accomplishments we're proud of

- A clear idea with a real insight behind it: expiring food and surplus food need opposite answers.
- A pet people want to come back to, with rewards tied to saving food rather than tapping.
- A clean, tested rules layer and a README that explains every threshold.

### What we learned

Retention in a utility app comes from a reason to open it, not more alerts. Monetisation is easier to defend when the paywall only ever charges for convenience.

### What's next

- Household sharing (a shared fridge and shopping list for flatmates and families), which needs accounts and sync.
- Verified donations via partner check-in codes at food banks (today, "I dropped these off" is trust-based).
- Better food-bank coverage where OpenStreetMap is thin.

### Try it

- **Repo:** https://github.com/DrunkWiz/fridge-rescue
- **Judges:** open the Impact tab → "judges & testing: admin mode →" → password `admin` to unlock every Pro feature and outfit without buying anything. Turn it off to see the real Test Store purchase.

**Built with:** react-native, expo, typescript, revenuecat, admob, zustand, claude, openstreetmap, open-food-facts

## Demo video (under 2 minutes)

Record on the emulator or a phone with admin mode **off**, a fresh demo fridge, and Sprout in a simple outfit.

| Time | Show | Say (roughly) |
|---|---|---|
| 0:00–0:12 | Home screen, Sprout hungry | "I kept finding yoghurt three days late, and buying chickpeas I already had. Those are two different problems." |
| 0:12–0:40 | Tap **rescue** → pick items → quick recipe → **ate it** → toast, XP, Sprout perks up | "Food that's about to go off can't be donated. It needs eating tonight, so Fridge Rescue turns exactly those items into one recipe." |
| 0:40–1:05 | Tap **donate** → "8 items ≈ 6 meals" → find a drop-off point → **I dropped these off** → celebration | "Long-life surplus is the opposite: it's what food banks need. The app groups it into one box and finds the nearest food bank." |
| 1:05–1:20 | Sprout tab (growth, streak, stars) → Shop → put on the T-rex with its volcano | "Every save earns seeds for Sprout. Seeds can't be bought." |
| 1:20–1:40 | GO PRO → RevenueCat paywall → **Test valid purchase** → PRO ✓ → history unlocks. Then Shop → **watch** ad → +10 seeds | "Pro is a RevenueCat subscription with a remotely configured paywall. Free users can also opt in to rewarded ads, tracked in RevenueCat. Rescuing and donating are always free." |
| 1:40–1:55 | Impact card: meals rescued / donated, money saved, Share | "Expo, React Native, pure tested rules, and RevenueCat for both revenue streams. Fridge Rescue." |

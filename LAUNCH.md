# Kite Rush — Launch Checklist

Everything that can be built is built. The steps below need **your accounts or decisions**, in order. Items marked ⏱ have review or wait times, so start them first.

## 0. Decide the publisher (today)
- [ ] **Publisher:** choose an individual account (your own name), Apothèque LLP, or the new Pte Ltd. Store accounts are tied to it and hard to move later.
  - **Individual — Apple:** US$99 a year, no D-U-N-S needed, enrolment usually within days. The seller name shown is your legal name. Tax form is W-8BEN, not W-8BEN-E.
  - **Individual — Google:** US$25. Before production you must run a **closed test with 12+ testers opted in for 14 consecutive days**.
  - **Personal address shown publicly:** Google shows your full address once the app sells IAP. Apple shows your address, phone and email in the EU if you declare trader status (likely with IAP).
  - **Organization:** needs a D-U-N-S number (up to ~5 business days). It shows the company name and business address instead, and Google's 12-tester rule doesn't apply.
- [ ] ⏱ **D-U-N-S number (organization only):** get one for that company (free; Apple links the request). It takes up to about 5 business days.
- [ ] **Support email:** pick one, e.g. support@yourdomain.
- [ ] **Bundle ID:** confirm it. The project uses **`app.kiterush.game`**. To change it, edit `native/capacitor.config.json` → `appId`, then Xcode → target → Bundle Identifier, and `android/app/build.gradle` → `applicationId`. Do this before the first upload; it can't change after release.

## 1. Accounts ⏱
- [ ] **Apple Developer Program** (organization): US$99 a year. Approval takes 1–3 days after the D-U-N-S number.
- [ ] **Google Play Console** (organization): US$25 one-time. Identity verification takes a few days. New *personal* accounts must run a 14-day closed test with 12 testers; organization accounts are exempt.
- [ ] **Google AdMob:** create the app for iOS and for Android, and create a Rewarded unit and an Interstitial unit for each.
- [ ] **(Optional) Supabase:** free tier, for web and cross-platform leaderboards.

## 1b. Paid features (Kite Rush Pro) ⏱
In-app purchases (Pro, Remove Ads, coin packs, Starter Pack) **can't be sold** until these are done:
- [ ] **App Store Connect → Business → Paid Apps Agreement:** accept it, then add a bank account and the tax forms. A Singapore company files **W-8BEN-E** (US tax form). Status must be *Active*.
- [ ] **Apple Small Business Program:** enroll (free) to pay a **15%** commission instead of 30%.
- [ ] **Play Console → Setup → Payments profile:** link a merchant account and bank. Google charges 15% on the first US$1M a year automatically.
- [x] **Pro price: US$4.99.** In App Store Connect pick the US$4.99 price point with the United States as base country; in Play Console set US$4.99 and let it convert. The game shows whatever localized price the store returns, so no code change is needed.
- [ ] Create `kr_pro` as **Non-consumable** in both stores (name and description are in STORE_LISTING.md). Attach `store/iap_review_pro.png` as Apple's review screenshot.
- [ ] Testers: add **Sandbox testers** (App Store Connect → Users and Access) and **License testers** (Play Console → Settings).
- [ ] Optional: change the free Zen flights before the paywall (`KR_CONFIG.zenFreeFlights`, default 3).

Already done in code:
- Paywall
- Restore purchases
- Receipt de-duplication
- Pro perks
- Shop card and Settings row
- A "Go Pro" link on results (every 4th run from run 5)
- `paywall_view` / `purchase` analytics
- Save codes can no longer grant paid items, and tampered codes are rejected

Web/portal builds show no Pro UI, and Zen stays free there.

## 2. Put in your IDs
| Where | What |
|---|---|
| `index.html` → `KR_CONFIG.admob` | 4 AdMob ad unit IDs (iOS/Android × rewarded/interstitial) |
| `native/ios/App/App/Info.plist` → `GADApplicationIdentifier` | iOS AdMob **app** ID. The current value is Google's TEST ID. |
| `native/android/app/src/main/AndroidManifest.xml` → `APPLICATION_ID` | Android AdMob **app** ID. The current value is Google's TEST ID. |
| `index.html` → `KR_CONFIG.lbUrl / lbKey` | Supabase URL + anon key (optional). Run `backend/supabase.sql` first. **Already ran the v2.1 version? Run it again.** It's idempotent and adds the v2.2 `ghost` column. |
| `index.html` → `KR_CONFIG.analyticsUrl` | Optional endpoint for gameplay analytics |
| `privacy.html`, `terms.html` | Replace every `{{…}}` placeholder, then host both pages (Netlify etc.) and put the URLs in `KR_CONFIG.privacyUrl/termsUrl` |
| AdMob → Privacy & messaging | Publish a GDPR consent message and an IDFA explainer (the game already shows them via the SDK) |

Keep the test IDs until your builds work on devices. Clicking your own **live** ads can get your AdMob account banned.

## 3. Build (on your Mac)
Needs Xcode (App Store) and Android Studio (free).
```bash
cd ~/Documents/Codespace/kiterush/native
npm install
npm run ios        # copies the game into www/, syncs plugins, opens Xcode
npm run android    # same, opens Android Studio
```
**Xcode:**
- Select your Team (Signing & Capabilities).
- Check that the **Game Center** capability shows. The entitlement is already set.
- Product → Archive → Distribute.

**Android Studio:**
- Build → Generate Signed App Bundle (.aab).
- Keep the keystore file and password safe forever.

**Before archiving, run `npm run preflight`** (in `native/`). It fails on unfilled privacy/terms placeholders, test AdMob IDs paired with real ad units, or a Release build with debug on.

Bump the version numbers for every upload:
- **iOS:** `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION`
- **Android:** `versionName` / `versionCode` in `android/app/build.gradle`

## 4. Store setup (details in `STORE_LISTING.md`)
- [ ] App Store Connect: create the app, and paste the name, subtitle, description, keywords, privacy answers and age rating.
- [ ] Create the 5 in-app products (including `kr_pro`) with the exact IDs listed, and submit them **with** the first build.
- [ ] Game Center: create `kr_best_alltime` (classic) and `kr_daily` (recurring, 1 day).
- [ ] Upload the screenshots in `store/ios69` (and `ios65`) and in `store/play`, plus the feature graphic.
- [ ] Play Console:
  - Data safety form.
  - Content rating questionnaire.
  - Target audience 13+.
  - Ads declaration: Yes.
  - Create the same 4 products under Monetize.
- [ ] ⏱ TestFlight / Play internal testing: install on real phones and run the device checklist below.
- [ ] ⏱ Submit for review. Apple usually takes 1–3 days; Google usually takes a few days for a new app.

## 5. Device test checklist (can't be done in the lab)
- [ ] Sound plays after the first tap; the silent switch mutes the game; your own music keeps playing.
- [ ] Haptics on the ring/cut/death feel right.
- [ ] Rewarded ad: *continue* and *double coins* each grant their reward exactly once. Closing the ad early grants nothing.
- [ ] An interstitial appears at most once every 3 runs, never in the first 3 runs, and never after buying Remove Ads.
- [ ] In-app purchases in Sandbox / license-testing: each product grants once; **Restore purchases** brings back Remove Ads and Phoenix on a fresh install.
- [ ] Pro in Sandbox:
  - Buying it removes ads and makes Second Wind free.
  - Run coins show "×2 PRO".
  - Zen is unlocked after the 3 free flights.
  - The Aurora kite appears.
  - Delete and reinstall, then **Restore purchases** brings Pro back.
- [ ] Game Center sign-in banner appears; scores show in both leaderboards.
- [ ] Reminder permission prompt appears after run 3; the daily gift notification arrives the next evening.
- [ ] Kill the app mid-run, then reopen: the save is intact. Delete and reinstall: the Export/Import save code restores progress.
- [ ] Low-end Android (2–3 years old) holds a smooth frame rate in the Orbit zone.
- [ ] Notch and Dynamic Island phones: nothing is hidden under the camera.
- [ ] Updraft banners are readable but don't distract mid-run; warning markers for planes, lightning and meteors are noticeable without dotted lines.
- [ ] Daily ghost: share a daily result to a second phone, open the link, and race the ghost on the same day.
- [ ] Zen flight: bonks feel soft rather than punishing, and "End Zen flight" returns to the title.
- [ ] Settings → Reduced motion / Hazard outlines / Left-handed all work on device; VoiceOver reads the toggle labels.

## 6. Web / portals (can go live before the app stores)
- [ ] Host the root folder (index.html + assets) on Netlify or Cloudflare Pages over https.
- [ ] Submit to Poki (poki.com/developers), CrazyGames (developer.crazygames.com) and itch.io. Their SDKs are already wired in; ads, analytics and retention reporting come from the portal.

## 7. After launch — what to watch
- **Retention:**
  - D1 (share of players back the next day). Around 35%+ is healthy for this genre.
  - D7 (back after a week). Aim for 10%+.
- **Updrafts:** the `updraft_pick` and `fusion_discovered` analytics events show which upgrades players end up with and how often fusions happen.
- **Median run length:** about 30–60 s is healthy. Much shorter means it's too hard; tune `DMAX` and `CH` in index.html.
- **Monetisation:**
  - Rewarded ads watched per daily player, and the share of players who buy anything.
  - Pro conversion: `purchase{item:pro}` ÷ `paywall_view`, split by `from` (zen / results / shop / settings).
- **Store reviews:** ask for a rating only after a new best (native in-app review is wired in).

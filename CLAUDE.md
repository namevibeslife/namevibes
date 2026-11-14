# NameVibes project handoff

Updated: 14 November 2026 (Asia/Calcutta).

## Green logo rollout - 13 November 2026

- Approved master `public/brand/namevibes-green-transparent.png` (2149 x 732 RGBA, SHA-256 6bdd770a...ccad4) is untouched. Derivatives are proportional resizes only, new names so caches refresh: `logo-green.png` (800 x 272), `logo-green-hires.png` (1600 x 545), `logo-green-dark.png` / `logo-green-dark-hires.png` (same logo on a discreet ivory rounded backing for midnight surfaces), `icon-green-192/512.png` and `favicon-green-32.png` and `apple-touch-icon-green.png` (atom cropped from the original), `maskable-green-192/512.png` (atom at 56% on ivory, inside the safe zone), `og-image-green.png` (1200 x 630, logo on ivory with gold border).
- Changed: `src/components/Logo.jsx` (new sources, intrinsic 800 x 272, dark 800 x 315), `src/utils/posterImage.js`, `familyPosterImage.js`, `posterReport.js` (new logo files; PDF logo now sized proportionally instead of a fixed 68 x 23 box), `index.html` (icons, og/twitter image `?v=3`), `public/manifest.webmanifest` (icons and shortcuts), `public/sw.js` (cache VERSION v3, new icon paths).
- Old `public/brand/logo*.png`, `icon-*.png`, `og-image.png` and `public/icons/` are left in place but no longer referenced. Repo-wide search confirmed no other active code still references the old paths.
- Validation completed: master hash and dimensions reverified bit-for-bit unchanged. `npm run build` passed cleanly. Headless Chromium (Playwright, mock mode) checked homepage, sign-in and dashboard at 1440px and 390px: no stretched logos, no horizontal overflow, no console/page errors. Generated individual (Golden/Dark) and full two-member family (Golden/Dark) posters as PNG and PDF: logo kept its proportions in every case, the dark variant's logo stayed readable on its ivory backing, and the PDF logo was centred, proportional and did not overlap text. Confirmed the Individual plan shows image sharing but no PDF button, the Family plan shows both, family exports included all members plus shared-element meanings, and `dist/manifest.webmanifest` plus every icon/og-image path resolved with the new `-green` filenames and service worker `VERSION = 'v3'`.
- Committed as `6d5b697` ("Roll out the approved green NameVibes logo across icons, manifest and posters") and pushed straight to `main` on https://github.com/namevibeslife/namevibes (no rebase was needed; origin/main had not moved since the prior session). `package-lock.json`, `artifacts/`, `docs/` and `public/icons/` were excluded from this commit as instructed.
- Live verification at https://namevibes.life after deployment: HTTP 200 and byte-identical content for `/brand/logo-green.png`, `/brand/og-image-green.png`, `/brand/icon-green-192.png` and `/manifest.webmanifest`; `sw.js` serves `VERSION = 'v3'`; homepage `<head>` now points at `icon-green-192.png`, `favicon-green-32.png`, `apple-touch-icon-green.png` and `og-image-green.png?v=3` for both `og:image` and `twitter:image`; a headless-Chromium load of the live homepage showed the correctly proportioned logo (800x272 natural, no stretching) and no console/page errors. GitHub's commit-status API only reported two unrelated Vercel project deployments (no Cloudflare check posted there), so Cloudflare Pages deployment was confirmed directly against the live site instead.

## Ambassador referral code overhaul - 14 November 2026

- Replaced sequential "CC SS NNNNN" referral codes (e.g. `IN TN 00003`) with random `NV-XXXXXX` codes: 6 characters from a 31-symbol unambiguous alphabet (`ABCDEFGHJKMNPQRSTUVWXYZ23456789` - no 0/O/1/I/L), generated with `crypto.getRandomValues` and rejection-sampled (31 isn't a power of two, so a plain `byte % 31` would be slightly biased) for a uniform distribution. No codes had ever been shared with customers, so every existing ambassador code was eligible for migration.
- New files: `src/utils/referralCode.js` (pure - generation, normalization, format validation, share link/message builders, `?ref=` capture/read/clear via 30-day localStorage; safe to unit-test in plain Node, no Firebase import), `src/utils/referralCodeAdmin.js` (Firestore-dependent - atomic code reservation via `runTransaction` with up to 10 collision retries, active/inactive toggling, and the migration preview/run functions), `src/components/ReferralShareCard.jsx` (the sharing widget).
- Atomicity: a new code is reserved by creating `referralCodes/{code}` inside a transaction that first checks the doc doesn't exist; collisions (astronomically unlikely at 31^6 ~= 887M codes) just retry with a fresh random code. `src/mock/firestore.js` gained a `runTransaction` implementation so this works in `npm run dev:mock` too.
- Firestore rules (`firestore.rules`): `referralCodes/{code}` can now only be `create`d by an admin, never deleted, and `update` is restricted to the `active`/`updatedAt` fields only - `ambassadorId`/`code` are immutable once set. `ambassadors/{id}` update now blocks any further change to `referralCode` once `legacyCode` is set (i.e. once that ambassador has been through the migration), so a code can't be changed again after that point even by an admin through the client SDK.
- Migration tool: Admin -> Ambassadors -> "Referral Code Migration" (super-admin only, `src/pages/AdminPanel.jsx`/`AdminDashboard.jsx`). Eligibility is based on the code's format, not just the presence of `legacyCode` - `ambassadorsNeedingMigration()` only targets ambassadors whose current code ISN'T already well-formed `NV-XXXXXX`, so a freshly-approved ambassador's brand-new code is correctly left alone instead of being re-migrated. "Dry Run" shows an old-code -> new-code preview table (and `console.table`s it) without writing anything; "Run Migration For Real" is disabled until a dry run has been done, requires a confirm dialog, and then reserves a real new code per ambassador and sets `referralCode` (new), `legacyCode` (old) and `codeMigratedAt` on each ambassador record. The old `referralCodes` doc is left exactly as it was (still active) - nothing is deleted or deactivated, so a legacy code still resolves at lookup if anyone ever had it; commission tracking is keyed off `ambassadorEmail`, not the code string, so it's unaffected either way.
- Admin approval (`AdminPanel.jsx` `handleApprove`) now calls `reserveReferralCode()` instead of building a sequential `${countryCode} ${stateCode} ${number}` code; the approval modal no longer asks for country/state/number, just payout frequency.
- Sign-up (`ProfileComplete.jsx`): the referral code field is no longer forced into a rigid 2-2-5 masked format - it's free text, uppercased as typed, looked up by normalized (trimmed/uppercased/whitespace-stripped) value, which transparently accepts both current and legacy-format codes since the lookup just checks whatever doc id actually exists. A code arriving via a `?ref=` link prefills the field with a "Applied from your invite link" hint; picking/clearing it manually is still allowed.
- `?ref=` capture: `LandingPage.jsx` captures `?ref=` into `localStorage` (30-day expiry) on mount; `ProfileComplete.jsx` prefills from it and clears it once the profile is successfully saved, so attribution rides the existing `ambassadorEmail`-on-signup -> `Pricing.jsx` -> `PaymentPage.jsx` -> `payments` doc pipeline unchanged.
- Sharing UI (`ReferralShareCard.jsx`, used by `AmbassadorDashboard.jsx`'s "Your Referral Code" card): large monospace code with a Copy button (clipboard + "Copied!" toast), native Share as the primary action when `navigator.share` exists, plus WhatsApp/Email/Facebook/Instagram/Telegram/X buttons. Facebook and Instagram have no way to prefill text through their share intents, so both copy the message to the clipboard first and show a toast telling the person to paste it. Icons are hand-written inline SVGs for the brand marks (lucide-react doesn't have them) in a mobile-first grid with 44px+ minimum tap targets.
- Removed the dead, unused `generateReferralCode` export from `src/data/countries.js` (the old sequential-code builder; it had no callers even before this change).
- Swept the codebase for anything still assuming the old format (regexes, splitting, fixed lengths) - found and fixed the `9`-char/`CC SS NNNNN` checks in `ProfileComplete.jsx` and the sequential generator in `AdminPanel.jsx`/`AdminDashboard.jsx`; everywhere else (`PayoutManagement.jsx`, `AccountsDashboard.jsx`, `AdminDashboard.jsx`'s payout views, `functions/api/test-activate.js`) only ever treats `referralCode` as an opaque display/grouping string, so nothing else needed to change. No PDFs or emails reference referral codes anywhere in this app.
- Validation (`npm run dev:mock`, Playwright): approved a pending ambassador and confirmed the alert showed a well-formed `NV-XXXXXX` code; ran Dry Run (correctly scoped to only the one ambassador with a legacy code, not the one just freshly approved - this caught and fixed a real bug where the eligibility check originally matched on `!legacyCode` alone) then Run Migration For Real, and confirmed the ambassador record updated with `NV-XXXXXX` (new) / `IN KL 00001` (old, shown as "was ...") and the admin result table showed `OK`; signed in as that ambassador and confirmed the dashboard showed the new code, Copy correctly wrote it to the clipboard and showed "Copied!", and all 6 share buttons (native Share omitted since headless Chromium has no Web Share API) worked with no horizontal overflow and 44px+(80x72 actual) tap targets at 360px; visited `/?ref=<code>`, confirmed it was captured into `localStorage` with a ~30-day expiry, signed up as a brand-new account, confirmed the field was prefilled with the hint, completed the form, confirmed it navigated to `/pricing`, that `nv_referral_ref` was cleared afterward, and that the new user's Firestore record had `ambassadorEmail` correctly set to the referring ambassador's email - full end-to-end attribution. Confirmed the pre-existing legacy `referralCodes/INKL00001` doc was untouched and still `active: true` after migration. Zero console/page errors across the whole flow. A standalone Node script generated 1,000 codes: 1000 unique, 0 malformed, 0 containing `0/O/1/I/L`; a 100,000-code run showed collisions consistent with the expected birthday-paradox rate for a ~887M-code space (confirming the space size/distribution, not a bug); and a forced-collision simulation confirmed the retry loop produces a fresh code.
- `npm run build` passed. Committed as `70ad146` ("Replace sequential ambassador referral codes with random NV-XXXXXX codes") and pushed to `main` on https://github.com/namevibeslife/namevibes; `origin/main` hadn't moved, plain fast-forward, no rebase needed. `package-lock.json`, `artifacts/`, `docs/` and `public/icons/` were excluded. Cloudflare Pages check run for `70ad146` completed with conclusion `success`; the live homepage's served JS bundle filename matches the local build exactly (`index-2397ac5b.js`), `/?ref=NV-K7M4Q2` returns 200 with no console errors.
- **Not deployed: `firestore.rules`.** The Firebase CLI in this environment (`firebase projects:list`) is only authenticated to an unrelated project (`local1st`), not `namevibes-life`, so the updated rules exist locally/in this commit but have not been pushed to production. To deploy them: `firebase login` with the account that owns `namevibes-life`, then `firebase deploy --only firestore:rules` from this repo root - or paste the contents of `firestore.rules` into Firebase Console -> Firestore Database -> Rules directly. Until that's done, the old (looser) rules remain live: referral code generation/lookup still works correctly either way (the app code doesn't depend on the new rules to function), but the stricter write protections described above aren't yet enforced in production.

## Country auto-detection - 14 November 2026

- Sign-up (`/profile-complete`) now pre-selects the visitor's country instead of leaving it blank, and only offers countries an admin has activated under Admin -> Country Pricing (`countrySettings` docs with `isActive: true`); if none are active yet it falls back to the full static list so sign-up never blocks.
- Detection order: `functions/api/geo.js` (new Cloudflare Pages Function, same `onRequestGet` pattern as the existing `functions/api/payment-mode.js`) reads Cloudflare's edge geolocation (`request.cf.country`) and returns `{ country }` as JSON with `Cache-Control: no-store` so it's never cached across visitors. `src/utils/countryDetect.js` calls it and falls back to the browser's locale region (e.g. `en-US` -> `US`) if the endpoint is unreachable or returns non-JSON (such as the SPA's `index.html`). The detected country only pre-fills the field when it matches one of the activated countries; the user can still change it, a small "Detected automatically..." hint shows only while the pre-fill is untouched, and picking a country manually clears that hint.
- This only works against the deployed Cloudflare Pages Function. Under `npm run dev` / `npm run dev:mock` there is no Functions runtime, so `/api/geo` isn't served and the code always falls through to the browser-locale guess - that's expected, not a bug.
- Currency/symbol fallback: `getPricing` and `loadCountryPricing` (and the new `getActiveCountries` helper) now fall back to `USD`/`$` whenever a country's `currency`/`symbol` is unset or blank, instead of passing through `undefined`/`''`.
- Files changed: `functions/api/geo.js` (new), `src/utils/countryDetect.js` (new), `src/data/countries.js` (`getActiveCountries`, USD/$ fallbacks in `getPricing`), `src/utils/pricing.js` (USD/$ fallbacks in `loadCountryPricing`), `src/pages/ProfileComplete.jsx` (activated-country dropdown, auto-detect pre-select with the hint, clearing it on manual selection).
- Checked before shipping: Firestore rules already let any signed-in user (not just admins) read `countrySettings` (`allow read: if signedIn()`), so no rule change was needed or made. Confirmed live that `functions/api/payment-mode.js` already returns JSON (not the SPA's `index.html`) on this same Cloudflare Pages project, proving Functions are routed ahead of the `/* -> /index.html 200` catch-all in `public/_redirects`.
- Validation: `npm run build` passed. In `npm run dev:mock`, a Playwright run activated India/USA/UAE as a super-admin test account, then signed in as a brand-new test account (`mock-new`) at 1440px and 390px: the country picker listed exactly those three activated countries, auto-detect (locale fallback, since no Functions runtime in dev) correctly pre-filled "United States" with the hint visible, picking India manually cleared the hint, and there was no horizontal overflow or console/page errors at either width. Unit checks in the same mock session confirmed `getPricing`, `getActiveCountries`, and `loadCountryPricing` all resolve to `USD`/`$` when a country or its Firestore settings doc has a missing or blank currency/symbol, without breaking India's existing INR pricing.
- Committed as `f244864` ("Add country auto-detection and restrict sign-up to admin-activated countries") and pushed to `main` on https://github.com/namevibeslife/namevibes; `origin/main` hadn't moved, so this was a plain fast-forward push, no rebase needed. `package-lock.json`, `artifacts/`, `docs/` and `public/icons/` were excluded, as instructed.
- Live verification: Cloudflare Pages check run for `f244864` completed with conclusion `success`. `GET https://namevibes.life/api/geo` returns `{"country":"IN"}` as JSON with `Cache-Control: no-store` (not the SPA fallback). The homepage and `/login` loaded with no console/page errors, and `/brand/logo-green.png` still returns 200 with the logo rendering at its correct 800x272 proportions, confirming the prior green-logo rollout (commit `6d5b697`) is untouched. The authenticated sign-up-picker check on the live site (listing only the activated countries, pre-selecting the detected one) was intentionally skipped: it would have required either real Google OAuth credentials or creating a persistent real test account in production Firebase, and the user chose to rely on the mock-mode verification of the same shipped code instead rather than create one.

## Hora & Muhurat - 14 November 2026

- Added a new daily Hora & Muhurat page at `/hora-muhurat` (route gated the same as the other Knowledge Base pages, behind `requiresPlan`), linked from a fourth Dashboard Knowledge Base card ("Today's Hora & Muhurat").
- Files: `src/utils/panchangEngine.js` (new - the Panchang engine: sunrise/sunset via NOAA solar-position formulas, 24 planetary horas, 16 Choghadiya slots, Abhijit/Brahma Muhurta, Rahu Kalam/Yamagandam/Gulika Kalam, and the `DUR_MUHURTA_SLOTS` weekday table), `src/data/panchangCities.js` (new - the city/location list used by the page's location picker), `src/pages/HoraMuhurat.jsx` (new - the page itself), `src/App.jsx` (new lazy route), `src/pages/Dashboard.jsx` (fourth Knowledge Base card, grid widened to 4 columns on `xl`).
- No external API or network calculation: every timing (sunrise/sunset, horas, Choghadiya, Rahu Kalam and the rest) is computed in `panchangEngine.js` from the chosen location's latitude/longitude and the system clock, entirely client-side.
- The Dur Muhurat weekday table in `panchangEngine.js` is explicitly marked "Validated 14 Nov 2026" against two published daily almanacs (hindu-blog.com's daily panchang and the Deccan Chronicle Astroguide), with every weekday's window agreeing to within 3 minutes; a code comment warns not to change a row without a published almanac timing to compare against, since some regional almanacs use a different table.
- Validation: `npm run build` passed, including a new `HoraMuhurat` chunk. In `npm run dev:mock`, signed in as the Individual test account and checked `/hora-muhurat` at 1440px and 390px: logo and golden background render, no horizontal overflow or console/page errors, the current hora is highlighted, all 24 hora rows and all 16 Choghadiya rows list, Rahu Kalam/Yamagandam/Gulika Kalam/Dur Muhurat are all shown, the dashboard card opens the page, and the Zodiac/Numerology/Element pages still load.
- Committed as `89c561d` ("Add daily Hora & Muhurat page with self-contained Panchang engine") and pushed to `main` on https://github.com/namevibeslife/namevibes; `origin/main` hadn't moved, plain fast-forward, no rebase needed. `package-lock.json`, `artifacts/`, `docs/` and `public/icons/` were excluded.
- Live verification: Cloudflare Pages check run for `89c561d` completed with conclusion `success`. The homepage's served JS bundle filename matches the local build exactly (`index-dcf2ab87.js`), the new `HoraMuhurat` chunk returns 200 from the CDN, and a live homepage load produced no console/page errors.

## Latest changes - 14 November 2026

- Unified fresh family, saved family and saved single results with /analyze: one selectable Golden/Dark poster, save/share controls, then Element Colors & Meanings.
- Removed duplicate posters, standalone element-tile grids, redundant saved-family member cards and extra harmony tiles. Shared elements and significance remain inside the family poster; the optional harmony interpretation flow remains below the meaning tables.
- Added src/components/ElementMeanings.jsx to share the member-by-member meaning tables, atomic numbers, colour swatches and unmatched-letter notices across result pages. Family detail pagination is retained.
- PosterDownload defaults to no second prepared-image preview. Saved results remain viewable and theme-selectable without an active plan, but export controls retain their active-plan/PDF restrictions.
- Build passed. Mobile browser checks verified exactly one poster and zero duplicate element-card grids on fresh/saved family and saved single routes; family exports still use NameVibes_Family_Poster.png and include shared meanings; no extra preview after preparation; no mobile overflow or runtime errors. Individual PDF restriction remains intact.

## Previous changes - 13 November 2026

- /analyze results now render only the selectable Golden/Dark poster inside PosterDownload, followed by Element Colors & Meanings. Removed the preceding dark poster and separate duplicate element tiles. Unmatched-letter information remains in the meanings section. This route passes showPreparedPreview=false so Save & Share reveals controls without adding another image preview; other routes retain their existing preview behavior. Browser validation confirmed one poster before/after preparation, four meaning rows for Vibes, both theme options, successful PNG download, and no mobile overflow/runtime errors.

- Homepage hero tagline readability: dark navy text on a solid warm-ivory panel with a gold border, 14px semibold sentence-case lettering and reduced tracking. This prevents the text blending into the golden molecular background.

- Preserved Claude Code's new Logo component, transparent brand assets, homepage sign-in/sign-out controls, and revised hero copy. The existing uncommitted package-lock.json change is unrelated and must not be included in this feature commit.
- Homepage now renders a real ChemistryPoster for Vibes using parseNameToElements. It includes the four element tiles and full existing meanings, replacing the raster sample/full-size link.
- Save & Share Poster is the primary image action on new and saved analyses. It prepares a PNG, then offers Save Image and, where supported, Share to Apps using the actual image file. Removed the older text-only WhatsApp links and Instagram copy-text alert.
- Image saving/sharing is available on active plans; PDF downloads remain restricted by pdfDownload. Expired/inactive accounts do not see export controls.
- Family preview and shared PNG contain ALL family members and their tiles, followed by shared elements, member counts and meanings. No individual-member selector remains in family sharing.
- findSharedElements counts each symbol at most once per member and returns elements present in two or more members. Labels distinguish shared-by-all from shared-by-some. Existing findCommonElements keeps its all-members intersection for the separate harmony interpretation flow.
- Family posters explicitly explain no-overlap and one-member cases. Family PDFs retain each member's elemental page and append shared-element meanings. Individual PDFs remain minimal.
- New src/utils/familyPosterImage.js draws the complete family in one responsive-height PNG and preserves the selected Golden/Dark theme and current logo. Very large families scale to a maximum 14,000px height to stay within practical canvas limits.
- Verification: production build passed; mobile homepage shows Vibes and four meanings; a three-member family exports all names plus all/partial shared meanings in both styles; native share stub received NameVibes_Family_Poster.png as image/png; PDF text checks found all members/shared meanings with no out-of-page text; active Individual plan has image sharing but no PDF button. No runtime errors or mobile overflow in tested flows.

## Previous changes - 12 November 2026

- Homepage sample is now the supplied infographic edited to the neutral name Vibes. Asset: public/theme/vibes-sample.png. Its correct elemental split is V + I + Be + S (23, 53, 4, 16). The earlier Radhe Krishna sample is superseded.
- The user's full introductory copy remains on the homepage. The sample can be opened full size for readable mobile viewing.
- Website backgrounds use champagne/gold shading and dimensional chemical structures from public/theme/golden-chemistry.svg.
- Download panels offer Golden and Dark styles with a live, minimal poster preview. The selected style applies to both PDF and PNG, including family-member images. Changing the name or style invalidates an already-prepared share image.
- Exported posters show only the name and elemental split, plus decorative branding. Interpretation tables, counts, and harmony reports remain out of exports. On-screen analysis details remain available.
- PNG export uses 1080 x 1350 for typical names; long names expand. Native file sharing is available only when navigator.canShare supports the file; otherwise users save the PNG and upload it to Instagram/Facebook. The app does not auto-post to social accounts.
- Existing active-plan download restrictions are unchanged.
- Validation: both selected styles rendered and downloaded as one-page PDFs and 1080 x 1350 PNGs for Vibes; background pixels matched the selected palette; export details were absent; simulated native share received one image/png file; tested mobile flows had no overflow or JavaScript errors.

## Project

- React 18 + Vite + Tailwind application. Firebase provides authentication and Firestore.
- Repository: https://github.com/namevibeslife/namevibes
- Production: https://namevibes.life (Cloudflare Pages; older Vercel integrations also report deployment statuses).
- Local checkout now has Git initialized, with `origin` pointing to the repository and local branch `main` based on remote `main`.
- `npm run dev:mock` uses local test accounts/data without accessing the production database. `npm run dev` uses real Firebase. `npm run build` creates the production bundle in `dist/`.

## User-approved theme

The user requested a consistent theme across every page and generated posters, based on the images in `vibes templates/`. They approved using complementary website colours to avoid overwhelming repetition.

- Everyday pages: warm ivory, antique gold, muted teal, subtle molecule/atom patterns, serif headings.
- Sign-in and selected access screens: midnight background with gold molecule details.
- Individual posters: midnight and gold.
- Family posters: ivory and gold.
- Poster tiles use jewel colours inspired by the supplied references. Scientific CPK swatches and element parsing remain separate and unchanged.
- New and saved individual/family analyses display the shared poster component.
- PDF reports use matching colours, borders, typography and tiles, with continuation pages for large inputs.
- Individual poster PDF downloads remain restricted to accounts whose active plan permits downloads. Existing family download access is retained.

## Implementation map

- `tailwind.config.js`: shared `brand`, `ocean`, and `paper` palette and shadows.
- `src/index.css`: shared backgrounds, typography, responsive poster layout, tile styling and reduced-motion handling.
- `public/theme/molecules.svg`: lightweight local background artwork.
- `src/components/ChemistryPoster.jsx`: reusable live-data individual/family poster.
- `src/components/PosterDownload.jsx`: plan-aware individual PDF download control; loads the PDF generator on demand.
- `src/utils/posterPalette.js`: presentation-only tile colours.
- `src/utils/posterReport.js`: vector PDF generator with pagination and wrapped names.
- `src/utils/commonElements.js`: common-element calculation shared by display and reports.
- `src/utils/familyReport.js`: existing prompt/report interface delegates PDF creation to the shared generator.
- Route components and custom account/insights CSS use the updated theme. Insights table styles are scoped to that page, and tables scroll within their containers on mobile.
- `index.html` and `public/manifest.webmanifest`: updated browser/PWA theme colours.

## Validation completed

- Production build passed (`npm run build`). Existing bundle-size and Browserslist-age notices are non-blocking.
- Headless Chromium checks at desktop and 390px mobile widths found no runtime errors in tested flows.
- Checked landing, dashboard, pricing, settings, insights, numerology, zodiac, analysis/family forms, and supporting sign-in/access pages.
- Generated individual and family results, downloaded PDFs, and verified saved individual/family poster rendering in mock mode.
- Verified the Individual plan does not show the poster PDF download button.
- Fixed and rechecked mobile document overflow on the insights page.
- PDF validation: sample individual poster fits one page; sample two-person report uses two pages; long-name stress case uses six pages. Text bounding boxes stayed inside the pages.
- Screenshots and sample PDFs are under `artifacts/` and are local verification artifacts, not deployment source.

## Current deployment - 13 November 2026

- Feature commit 72b53aa is pushed to GitHub main and successfully deployed by Cloudflare Pages (check conclusion: success).
- Verified production HTTP 200, live Vibes name and four element meanings, absence of the old full-size image link, and no JavaScript runtime errors or horizontal overflow at 390px.
- Integrated the six newer upstream commits through 259f505, preserving the user's payment-page and Cloudflare hosting changes.
- Also checked saved-family no-overlap messaging, prepared-image reset after style changes, share cancellation retaining Save Image, and a 50-member family image export (1080 x 11170).
- This documentation update records that verified release.

## Earlier deployment history

The user explicitly authorized pushing to GitHub and deploying the existing production site.

- Theme implementation commit: `9b2286d` (Apply gold and ivory theme across pages and chemistry posters).
- Implementation and initial handoff were pushed to GitHub `main` through `aa4919b` after successful Git Credential Manager browser authentication as `namevibeslife`.
- Repository-local Git credential username is now `namevibeslife` so future pushes select the correct saved account.
- Vercel automatically started deployments for the connected `namevibes` and `namevibes-whi6` projects.
- Production verified at https://namevibes.life: HTTP 200, gold browser theme colour, new midnight poster with live rendered sample name, and HTTP 200 for `/theme/molecules.svg`.
- Production headless Chromium mobile check at 390px found no horizontal overflow or JavaScript runtime errors.
- Earlier HTTP 403 errors and the failed device-login attempt are resolved. No further authentication action is required for this deployment.
- This handoff update is a documentation-only follow-up to the verified implementation release.
- No database rules, payments, production data, or hosting configuration were changed as part of this work.

## Preserve local work

- `public/icons/` contains pre-existing local modifications relative to the remote repository; these were left intact and excluded from the theme commit.
- `Claude outputs/`, `vibes templates/`, and `artifacts/` contain local reference/verification assets. Do not add them indiscriminately to a deployment commit.
- An untracked `push-to-github.bat` appeared during this session. It was inspected but not run or modified. It copies broad folder contents and deletes a temporary checkout; prefer pushing this Git checkout directly.
- Never print or commit credentials, `.env` files, or tokens. Do not reset or overwrite unrelated local changes when completing deployment.

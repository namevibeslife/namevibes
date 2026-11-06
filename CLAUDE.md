# NameVibes project handoff

Updated: 6 November 2026 (Asia/Calcutta).

## Project

- React 18 + Vite + Tailwind application. Firebase provides authentication and Firestore.
- Repository: https://github.com/namevibeslife/namevibes
- Production: https://namevibes.life (Vercel).
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

## Git and deployment status - live

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

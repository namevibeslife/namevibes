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

## Git and deployment status — unfinished

The user explicitly authorized pushing to GitHub and deploying the existing production site.

- Theme implementation is committed locally as `9b2286d` (`Apply gold and ivory theme across pages and chemistry posters`).
- GitHub `main` was last verified at `8ab02779db2404764808e0b01efa61496ec4579d`.
- Push attempts failed with HTTP 403. Read-only permission checks confirmed none of the GitHub accounts currently saved in Git Credential Manager has push permission on this repository.
- Attempted device login for `namevibeslife`; it failed because the host aborted the network connection. No successful authorization was established.
- The remote commit and production homepage still showed the previous release at the last verification. Do not claim the new theme is live.
- Next required step: authenticate Git with `namevibeslife` or another account that has write access, then push the local commits using `git push -u origin main`.
- After pushing, inspect GitHub/Vercel deployment status and verify that production serves the gold theme, `/theme/molecules.svg`, and the new poster interface. The expected Git-connected Vercel deployment must be verified rather than assumed.
- No database rules, payments, production data, or hosting configuration were changed as part of this work.

## Preserve local work

- `public/icons/` contains pre-existing local modifications relative to the remote repository; these were left intact and excluded from the theme commit.
- `Claude outputs/`, `vibes templates/`, and `artifacts/` contain local reference/verification assets. Do not add them indiscriminately to a deployment commit.
- An untracked `push-to-github.bat` appeared during this session. It was inspected but not run or modified. It copies broad folder contents and deletes a temporary checkout; prefer pushing the prepared Git checkout directly once authentication is fixed.
- Never print or commit credentials, `.env` files, or tokens. Do not reset or overwrite unrelated local changes when completing deployment.

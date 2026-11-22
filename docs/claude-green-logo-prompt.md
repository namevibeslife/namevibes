# Prompt for Claude Code: install the green NameVibes logo and deploy

Work in `C:\Users\sresq\Documents\namevibes`.

Replace the existing NameVibes logo everywhere with this approved master asset:

`public/brand/namevibes-green-transparent.png`

This is an unchanged copy of `C:\Users\sresq\Downloads\Glossy NameVibes Green Logo.png`. It is a 2149 x 732 RGBA PNG with genuine transparency, verified against the original by SHA-256. Preserve its exact glossy blue-and-green colours, texture, highlights, lettering, atom motif and swoosh. Do not regenerate, redraw, recolour, flatten, stretch, or remove highlights from it. Keep the master untouched; use proportional resizing and transparent padding for derivatives. For dark surfaces, ensure readability using a discreet light backing if needed rather than recolouring the logo.

Inspect current source and Git status first; preserve all newer Claude/user changes and unrelated uncommitted work. Update every active logo reference, including:

- `src/components/Logo.jsx`, used across headers, navigation, sign-in pages, dashboards and poster previews. Update intrinsic dimensions to the new aspect ratio and keep responsive sizing.
- `src/utils/posterImage.js`, `src/utils/familyPosterImage.js`, and `src/utils/posterReport.js`: both Golden and Dark image/PDF exports, including high-resolution logo loading. Preserve full-family sharing, common-element meanings, and current plan restrictions.
- Existing light/dark and high-resolution logo assets under `public/brand/`, or replace their references with clearly named derivatives of the new master.
- Favicon, Apple touch icon, PWA normal/maskable icons, manifest shortcuts, and social-preview artwork. Where square icons need a compact mark, crop the atom from the approved original rather than inventing a new symbol. Respect maskable safe zones. Social cards can place the unchanged logo on the existing theme background.
- `index.html`, `public/manifest.webmanifest`, and `public/sw.js` references/cache version as necessary so returning users receive updated branding.

Search the entire repository for other active logo references, including old `/brand/` and `/icons/` paths. Do not modify reference images or verification artifacts just because they contain the previous logo. Keep the established golden chemistry website theme and existing functionality.

Verify desktop/mobile layouts and logo contrast in both poster styles. Generate individual and full-family PNGs and PDFs to confirm that the new logo renders correctly and retains its proportions. Check PWA and social-preview asset paths, run `npm run build`, and update `CLAUDE.md` with the changed files and validation results.

Commit only relevant changes, integrate newer upstream changes without overwriting them, and push to `main` at `https://github.com/namevibeslife/namevibes`. Deployment is authorized. Verify the Cloudflare Pages deployment and the actual live site at `https://namevibes.life`, including the new logo asset and cache refresh. Report the commit, live URL, and checks completed. Do not claim deployment succeeded until verified; report any genuine blocker accurately.

// The single place the public domain is set. Every public link and every place the domain is
// shown reads from here. (Firebase authDomain, the support email and the Cloudflare project name
// are deliberately separate.)
export const SITE_URL = 'https://namasutra.life';
// One switch for the language picker. true = the picker and all language logic are active for users (the picker is still hidden on staff
// routes, see src/config/staffRoutes.js). false = the picker is not shown anywhere and the whole site is English (saved choices, profile
// language and country/browser detection are ignored, nothing is deleted).
export const LANGUAGE_PICKER_ENABLED = true;
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');

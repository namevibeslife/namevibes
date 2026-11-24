// The single place the public domain is set. Every public link and every place the domain is
// shown reads from here. (Firebase authDomain, the support email and the Cloudflare project name
// are deliberately separate.)
export const SITE_URL = 'https://namasutra.life';
// One switch for the language picker. false = the picker is not shown anywhere and the whole site is English (saved choices, profile
// language and country/browser detection are ignored, nothing is deleted). true = everything works as before.
export const LANGUAGE_PICKER_ENABLED = false;
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');

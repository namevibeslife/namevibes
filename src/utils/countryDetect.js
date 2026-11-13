// Detects the visitor's country to default the sign-up country picker.
// Primary source: Cloudflare's edge geolocation via functions/api/geo.js (accurate worldwide,
// no permission prompt). Falls back to the browser locale's region (e.g. "en-US" -> "US")
// when that endpoint isn't reachable, such as local dev outside Cloudflare Pages.
export async function detectBrowserCountry() {
  try {
    const res = await fetch('/api/geo', { cache: 'no-store' });
    if (res.ok) {
      const { country } = await res.json();
      if (country) return country.toUpperCase();
    }
  } catch {
    // functions/api/geo.js isn't served outside Cloudflare Pages - fall through to the locale guess
  }

  try {
    const locale = navigator.languages?.[0] || navigator.language || '';
    const region = locale.split('-')[1];
    if (region) return region.toUpperCase();
  } catch {
    // ignore
  }

  return null;
}

// Staff-only screens, in ONE place. Any route under one of these prefixes is an admin/staff screen: it has no language picker and is
// shown in English (without changing the signed-in user's saved language). A new admin route is covered by adding its prefix here.
// /admin also covers /admin/merch and the payout management screens that live inside it.
export const STAFF_ROUTE_PREFIXES = ['/admin', '/accounts', '/payouts', '/payout-management', '/staff'];
export const isStaffRoute = (pathname = '') => {
  const p = String(pathname).toLowerCase().replace(/\/+$/, '') || '/';
  return STAFF_ROUTE_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix + '/'));
};

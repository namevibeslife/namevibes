// Cash on Delivery is prohibited everywhere (all countries, products and providers). These helpers are used by the
// server entry points and by every provider adapter so a COD request is refused wherever it could sneak in.
const COD_WORDS = /(^|[^a-z])(cod|cash|cash[\s_-]*on[\s_-]*delivery|pay[\s_-]*on[\s_-]*delivery|pod)([^a-z]|$)/i;
const PAYMENT_KEYS = ['paymentmethod', 'payment_method', 'method', 'gateway', 'payment', 'paymenttype', 'payment_type', 'paymentmode', 'payment_mode'];
const COD_FLAGS = ['cod', 'cashondelivery', 'cash_on_delivery', 'iscod', 'is_cod'];

export const isCod = (value) => typeof value === 'string' && COD_WORDS.test(value.trim());

// Look for a COD payment method anywhere in a request body (a few levels deep). Returns { key, value } or null.
export function findCod(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 4) return null;
  for (const [k, v] of Object.entries(obj)) {
    const key = k.toLowerCase();
    if (PAYMENT_KEYS.includes(key) && isCod(v)) return { key: k, value: String(v).slice(0, 40) };
    if (COD_FLAGS.includes(key) && (v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true')) return { key: k, value: String(v) };
    if (v && typeof v === 'object') { const inner = findCod(v, depth + 1); if (inner) return inner; }
  }
  return null;
}

// Adapter contract: every provider refuses a COD order and only ever submits prepaid ones.
export const codRefusal = () => ({ ok: false, error: 'cod-not-allowed', retryable: false });
export function refuseCod(order) {
  return isCod(order?.paymentMethod) || isCod(order?.gateway) || isCod(order?.payment) || findCod(order?.extra) ? codRefusal() : null;
}

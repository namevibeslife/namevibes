// Which currencies the two payment gateways accept. Copied from the gateways' own documentation;
// re-check them before adding a currency you have not tested with a real payment.
//   PayPal   https://developer.paypal.com/reference/currency-codes/  (page dated 17 Aug 2026)
//   Razorpay https://razorpay.com/docs/payments/international-payments/  (Supported Currencies table,
//            no date shown; non-INR currencies need International Payments enabled on the account)
export const PAYPAL_CURRENCIES = [
  'AUD', 'BRL', 'CAD', 'CNY', 'CZK', 'DKK', 'EUR', 'HKD', 'HUF', 'ILS', 'JPY', 'MYR',
  'MXN', 'TWD', 'NZD', 'NOK', 'PHP', 'PLN', 'GBP', 'SGD', 'SEK', 'CHF', 'THB', 'USD',
];
// PayPal: payment/settlement currency only for in-country PayPal accounts
export const PAYPAL_IN_COUNTRY_ONLY = ['BRL', 'CNY', 'MYR'];
// PayPal: no decimal places, so the price must be a whole number
export const PAYPAL_ZERO_DECIMAL = ['HUF', 'JPY', 'TWD'];

export const RAZORPAY_CURRENCIES = [
  'AED', 'ALL', 'AMD', 'AUD', 'AWG', 'AZN', 'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL',
  'BSD', 'BTN', 'BWP', 'BZD', 'CAD', 'CHF', 'CLP', 'CNY', 'COP', 'CRC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP',
  'DZD', 'EGP', 'ETB', 'EUR', 'FJD', 'GBP', 'GHS', 'GIP', 'GMD', 'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HRK', 'HTG',
  'HUF', 'IDR', 'ILS', 'INR', 'IQD', 'ISK', 'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR', 'KMF', 'KRW', 'KWD', 'KYD',
  'KZT', 'LAK', 'LKR', 'LRD', 'LSL', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MUR', 'MVR', 'MWK', 'MXN',
  'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR', 'NZD', 'OMR', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR',
  'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SCR', 'SEK', 'SGD', 'SLL', 'SOS', 'SVC', 'SZL', 'THB', 'TND', 'TRY', 'TTD',
  'TWD', 'TZS', 'UAH', 'UGX', 'USD', 'UYU', 'UZS', 'VND', 'VUV', 'XAF', 'XCD', 'XOF', 'XPF', 'YER', 'ZAR', 'ZMW',
];

// ---- Which gateway takes a payment -------------------------------------------------------------
// Rule ("Auto"): Razorpay wherever it supports the currency, PayPal only as the fallback.
//  - INR always goes to Razorpay (India, unchanged).
//  - Other Razorpay currencies use Razorpay only once "International payments enabled" is switched
//    on in admin (Razorpay must approve International Payments first). While it is off they use
//    PayPal where PayPal supports the currency.
//  - If neither can take the currency there is no gateway and checkout is blocked.
// A per-country override ('razorpay' or 'paypal') forces a gateway; 'auto' (default) uses the rule.
export const GATEWAY_OVERRIDES = ['auto', 'razorpay', 'paypal'];
export const GATEWAY_NAMES = { razorpay: 'Razorpay', paypal: 'PayPal' };

export const razorpaySupports = (currency) => RAZORPAY_CURRENCIES.includes(currency);
export const paypalSupports = (currency) => PAYPAL_CURRENCIES.includes(currency);

/**
 * { gateway: 'razorpay' | 'paypal' | null, forced: boolean, reason }
 * reason (when gateway is null): 'unsupported'.
 * `via` explains an Auto choice: 'inr' | 'razorpay-supported' | 'paypal-fallback' | 'forced'.
 */
export function resolveGateway({ currency, override = 'auto', internationalEnabled = false } = {}) {
  const cur = String(currency || '').toUpperCase();
  if (override === 'razorpay' || override === 'paypal') return { gateway: override, via: 'forced' };
  if (!cur) return { gateway: null, reason: 'unsupported' };
  if (cur === 'INR') return { gateway: 'razorpay', via: 'inr' };
  if (internationalEnabled && razorpaySupports(cur)) return { gateway: 'razorpay', via: 'razorpay-supported' };
  if (paypalSupports(cur)) return { gateway: 'paypal', via: 'paypal-fallback' };
  return { gateway: null, reason: 'unsupported' };
}

// Smallest-unit digits for a currency (ISO 4217): 2 for most, 0 for JPY, 3 for KWD and BHD, ...
export function currencyExponent(currency) {
  try {
    const d = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
    return Number.isInteger(d) ? d : 2;
  } catch { return 2; }
}
// Integer amount in the currency's smallest unit (what Razorpay's checkout expects)
export const toSubunits = (amount, currency) => Math.round(Number(amount) * 10 ** currencyExponent(currency));
// Decimal string PayPal expects: right number of decimals for the currency
export const toGatewayAmount = (amount, currency) => Number(amount).toFixed(currencyExponent(currency));

/**
 * Notes for the admin Add Country form. Returns [{ level: 'warn' | 'info', text }]. Never blocks
 * saving. `override` is the per-country selector, `internationalEnabled` the admin flag.
 */
export function gatewayWarnings(countryCode, currency, price, { override = 'auto', internationalEnabled = false } = {}) {
  const out = [];
  if (!currency) return out;
  const r = resolveGateway({ currency, override, internationalEnabled });
  const rz = razorpaySupports(currency);
  const pp = paypalSupports(currency);

  if (r.via === 'forced') {
    out.push({ level: 'info', text: `Payment gateway is forced to ${GATEWAY_NAMES[r.gateway]} for this country.` });
    if (r.gateway === 'razorpay' && !rz) out.push({ level: 'warn', text: `Razorpay does not list ${currency} as a supported currency. Payments in ${currency} may fail.` });
    if (r.gateway === 'paypal' && !pp) out.push({ level: 'warn', text: `PayPal does not list ${currency} as a supported currency. Payments in ${currency} may fail.` });
    if (r.gateway === 'razorpay' && currency !== 'INR' && !internationalEnabled) out.push({ level: 'warn', text: 'Razorpay accepts non-INR currencies only after International Payments is approved on your Razorpay account.' });
  } else if (r.gateway === 'razorpay') {
    out.push({ level: 'info', text: currency === 'INR' ? 'Payments go through Razorpay.' : `Payments go through Razorpay (supports ${currency}; International Payments is switched on).` });
  } else if (r.gateway === 'paypal') {
    if (rz && !internationalEnabled) {
      out.push({ level: 'info', text: `Payments go through PayPal for now. Razorpay also supports ${currency}; once Razorpay approves International Payments and you switch it on above, this country moves to Razorpay.` });
    } else {
      out.push({ level: 'info', text: `Payments go through PayPal (Razorpay does not list ${currency}).` });
    }
  } else if (rz && !internationalEnabled) {
    out.push({
      level: 'warn',
      text: `Only Razorpay supports ${currency} (PayPal does not), and Razorpay's International Payments is switched off, so customers here will see "payments not available" and cannot check out. Switch on "Razorpay: International payments enabled" above once Razorpay has approved it, or force PayPal/Razorpay with the Payment gateway selector.`
    });
  } else {
    out.push({
      level: 'warn',
      text: `Neither gateway can take ${currency}, so customers in this country will see "payments not available" and cannot check out. Choose a currency PayPal or Razorpay supports (for example USD or EUR).`
    });
  }

  if (r.gateway === 'paypal' || override === 'paypal') {
    if (PAYPAL_IN_COUNTRY_ONLY.includes(currency)) {
      out.push({ level: 'warn', text: `PayPal supports ${currency} only for PayPal accounts in that country. Otherwise PayPal converts the amount, with a spread or fee.` });
    }
    if (PAYPAL_ZERO_DECIMAL.includes(currency) && price !== '' && price != null && !Number.isInteger(Number(price))) {
      out.push({ level: 'warn', text: `${currency} has no decimal places on PayPal. Use a whole-number price.` });
    }
  }
  const exp = currencyExponent(currency);
  if (price !== '' && price != null && Number(price) > 0 && Number(price) * 10 ** exp % 1 !== 0 && Math.abs(Number(price) * 10 ** exp - Math.round(Number(price) * 10 ** exp)) > 1e-6) {
    out.push({ level: 'warn', text: `${currency} has ${exp} decimal place${exp === 1 ? '' : 's'}. The price will be rounded to the nearest ${exp ? '0.' + '0'.repeat(exp - 1) + '1' : 'whole unit'} when charged.` });
  }
  return out;
}

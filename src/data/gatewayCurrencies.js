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

// The app sends India to Razorpay and every other country to PayPal (PaymentPage.jsx), so that is
// the gateway a country's currency has to work with.
export const gatewayFor = (countryCode) => (countryCode === 'IN' ? 'razorpay' : 'paypal');

/**
 * Warnings for the admin form. Returns [{ level: 'warn' | 'info', text }]. Never blocks saving.
 */
export function gatewayWarnings(countryCode, currency, price) {
  const out = [];
  if (!currency) return out;
  if (gatewayFor(countryCode) === 'razorpay') {
    if (!RAZORPAY_CURRENCIES.includes(currency)) {
      out.push({ level: 'warn', text: `Razorpay (used for India) does not list ${currency} as a supported currency. Payments in ${currency} may fail.` });
    } else if (currency !== 'INR') {
      out.push({ level: 'info', text: `Razorpay supports ${currency}, but only for accounts with International Payments enabled. India customers are normally charged in INR.` });
    }
    return out;
  }
  if (!PAYPAL_CURRENCIES.includes(currency)) {
    const razorpayOk = RAZORPAY_CURRENCIES.includes(currency);
    out.push({
      level: 'warn',
      text: `PayPal does not list ${currency} as a supported currency, and PayPal is the gateway used for this country, so customers cannot pay in ${currency}.`
        + (razorpayOk ? ` Razorpay does support ${currency}, but this app only uses Razorpay for India.` : ' Choose a currency PayPal supports (for example USD or EUR).'),
    });
  } else {
    if (PAYPAL_IN_COUNTRY_ONLY.includes(currency)) {
      out.push({ level: 'warn', text: `PayPal supports ${currency} only for PayPal accounts in that country. Otherwise PayPal converts the amount, with a spread or fee.` });
    }
    if (PAYPAL_ZERO_DECIMAL.includes(currency) && price !== '' && price != null && !Number.isInteger(Number(price))) {
      out.push({ level: 'warn', text: `${currency} has no decimal places on PayPal. Use a whole-number price.` });
    }
  }
  return out;
}

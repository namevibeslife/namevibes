// Plain-language reasons for an order that stopped before reaching the print provider. Codes only, never a link, key or secret.
export const EXCEPTION_REASONS = {
  'design-link-invalid': 'The link to the print file was refused before sending: it was missing or longer than the 512 characters Qikink accepts.',
  'mockup-link-invalid': 'The link to the mock-up image was longer than the 512 characters Qikink accepts.',
  'link-too-long': 'The storage service made a download link that is too long for Qikink, and no short link could be made (set MERCH_ARTWORK_SECRET or MERCH_CRON_SECRET).',
  'short-link-unreachable': 'The short download link on our own site could not be fetched, so Qikink would not be able to fetch it either.',
  'artwork-missing': 'This order has no print file stored (it was never uploaded, or it was already deleted). Re-create the print file, then retry.',
  'artwork-missing-in-storage': 'The order points to a print file, but the file is no longer in storage. Re-create the print file, then retry.',
  'artwork-unreachable': 'The storage service could not be reached or did not answer the download link in time.',
  'artwork-link-rejected': 'The storage service refused the download link (it expired or is not allowed). Retrying makes a fresh link.',
  'artwork-bad-type': 'The stored print file is not a PNG image.',
  'artwork-size-mismatch': 'The stored print file has a different size from the one recorded at upload.',
  'artwork-hash-mismatch': 'The stored print file does not match the fingerprint recorded at upload (it changed or is damaged).',
  'payment-not-verified': 'The payment was not verified on the server, so nothing was sent to the provider.',
  'provider-disabled': 'The provider chosen for this order is switched off. Re-route the order or switch the provider on.',
  'no-adapter': 'No connector exists for this provider.',
  'placement-invalid': 'The print placement code for this product is not valid for Qikink.',
  'print-type-invalid': 'The print type for this product is not valid for Qikink.',
  'design-size-missing': 'The print size of the design is missing.',
  'design-too-large': 'The design is larger than the print area Qikink allows.',
  'sku-too-long': 'The Qikink product code for this variant is too long.',
  'provider-error': 'The provider rejected the order.'
};
EXCEPTION_REASONS['qikink-credentials-missing'] = 'The server could not find the Qikink sign-in details (variable names are shown after the code; values are never shown). Check the names in Cloudflare Pages -> Production, then redeploy.';
EXCEPTION_REASONS['qikink-duplicate-order'] = 'Qikink already has this order under our order number, but its order id could not be looked up. Confirm it in the Qikink dashboard, then use "Mark as submitted" with the Qikink order id. Do not place a new order.';
export const explainReason = (code) => EXCEPTION_REASONS[code] || EXCEPTION_REASONS[String(code || '').split(':')[0]] || (code ? `The provider answered with "${String(code).slice(0, 60)}".` : '');

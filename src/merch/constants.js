// Shared constants for the merchandise (print-on-demand) module. Pure data, no imports, so the
// browser, the Cloudflare functions and the Node tests can all use it.

export const COLLECTIONS = { NAME_ELEMENTS: 'name_elements', BLOOD_GROUP: 'blood_group' };
export const COLLECTION_IDS = Object.values(COLLECTIONS);

// Order state machine (spec section 8). `exception` is an internal holding state: paid but not
// (yet) with a provider, or something needs an admin decision.
export const STATES = [
  'draft', 'quoted', 'payment_pending', 'paid', 'fulfillment_pending', 'submitted',
  'in_production', 'shipped', 'delivered', 'cancelled', 'refunded', 'exception', 'held_provider_funds'
];

export const TRANSITIONS = {
  draft: ['quoted', 'cancelled'],
  quoted: ['payment_pending', 'cancelled'],
  payment_pending: ['paid', 'cancelled'],
  paid: ['fulfillment_pending', 'exception', 'held_provider_funds', 'refunded', 'cancelled'],
  fulfillment_pending: ['submitted', 'exception', 'held_provider_funds', 'refunded', 'cancelled'],
  submitted: ['in_production', 'shipped', 'cancelled', 'refunded', 'exception'],
  in_production: ['shipped', 'cancelled', 'refunded', 'exception'],
  shipped: ['delivered', 'refunded', 'exception'],
  delivered: ['refunded'],
  cancelled: ['refunded'],
  refunded: [],
  exception: ['fulfillment_pending', 'submitted', 'cancelled', 'refunded'],
  // Paid, but the provider (Qikink is prepaid by wallet credit) could not take the order for lack of funds: held until an admin tops up
  held_provider_funds: ['fulfillment_pending', 'submitted', 'exception', 'cancelled', 'refunded']
};

// States in which the customer's money is held: still manageable even when merchandise is off.
export const PAID_STATES = ['paid', 'fulfillment_pending', 'submitted', 'in_production', 'shipped', 'delivered', 'exception', 'held_provider_funds'];

export const MAX_FULFILMENT_ATTEMPTS = 5;
export const QUOTE_TTL_MS = 15 * 60 * 1000;
export const MAX_QTY_PER_ITEM = 10;
export const MAX_ITEMS_PER_ORDER = 10;

// Bump when the Name Elements matching rules change; saved with every order so reprints stay consistent.
export const NAME_ALGORITHM_VERSION = 'namasutra-elements-v1';
export const DESIGN_TEMPLATE_VERSION = 1;

export const COLL = {
  settings: 'merch_settings', countries: 'merch_countries', providers: 'merch_providers', routes: 'merch_routes',
  products: 'merch_products', variants: 'merch_variants', designs: 'merch_designs', carts: 'merch_carts',
  quotes: 'merch_quotes', orders: 'merch_orders', fulfillments: 'merch_fulfillments',
  webhookEvents: 'merch_webhook_events', commissions: 'merch_commissions', auditLogs: 'merch_audit_logs'
};

export const COMMISSION_STATES = ['pending', 'eligible', 'payable', 'paid', 'reversed'];

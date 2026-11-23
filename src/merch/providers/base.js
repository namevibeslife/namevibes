// The provider-independent contract. Every print-on-demand partner is an adapter implementing:
//   getCapabilities(country)  -> { ok, products?: string[], note? }
//   getQuote(request)         -> { ok, cost, shipping, currency, days? }
//   submitOrder(order)        -> { ok, providerOrderId }          (must honour order.idempotencyKey)
//   getOrderStatus(id)        -> { ok, status, tracking? }        (status: a normalised order state)
//   cancelOrder(id)           -> { ok }
//   verifyWebhook(headers, rawBody) -> { ok, event? }
// Failures are returned, not thrown: { ok: false, error, retryable }. An operation the partner does not
// offer returns { ok: false, unsupported: true } so callers never assume every API works the same way.

export const unsupported = (what) => ({ ok: false, unsupported: true, error: `unsupported:${what}`, retryable: false });

export class PODProvider {
  constructor(id) { this.id = id; }
  async getCapabilities() { return unsupported('getCapabilities'); }
  async getQuote() { return unsupported('getQuote'); }
  async submitOrder() { return unsupported('submitOrder'); }
  async getOrderStatus() { return unsupported('getOrderStatus'); }
  async cancelOrder() { return unsupported('cancelOrder'); }
  async verifyWebhook() { return unsupported('verifyWebhook'); }
}

// Provider statuses are mapped to the order states we use.
export const PROVIDER_STATUS_TO_STATE = {
  received: 'submitted', accepted: 'submitted', processing: 'in_production', in_production: 'in_production',
  shipped: 'shipped', in_transit: 'shipped', delivered: 'delivered', cancelled: 'cancelled', failed: 'exception'
};

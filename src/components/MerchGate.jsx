import React, { lazy } from 'react';
import { useMerchStatus } from '../merch/useMerchStatus';

const NotFound = lazy(() => import('../pages/NotFound'));

// Wraps every customer merchandise route. When merchandise is not visible to this visitor it renders the ordinary 404 page,
// exactly as for an address that does not exist. Admins see a banner while Qikink is on the sandbox.
export default function MerchGate({ children }) {
  const status = useMerchStatus();
  if (status.loading) return null;
  if (!status.visible) return <NotFound />;
  return <>
    {status.sandbox && <div role="status" data-testid="sandbox-banner" className="bg-amber-100 border-b border-amber-400 text-amber-900 text-center text-sm font-semibold px-3 py-2">
      SANDBOX: no real order will be printed or shipped.{status.paymentsSimulated ? ' Payments are simulated (nobody is charged).' : ' Checkout is blocked until payments are simulated.'}
    </div>}
    {children}
  </>;
}

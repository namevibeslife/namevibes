import React from 'react';
import { Link } from 'react-router-dom';

// DRAFT returns and refunds policy for personalised goods (India). Not legal advice and not approved: it is shown as a
// draft until the owner has had it reviewed. English only, like other staff/legal drafts.
export default function MerchReturnsPolicy() {
  return (
    <main className="min-h-screen site-background p-4">
      <article className="max-w-3xl mx-auto bg-white/80 rounded-xl p-5 space-y-3" data-testid="returns-policy">
        <p role="note" className="p-3 rounded-lg bg-amber-100 border border-amber-400 text-amber-900 font-semibold" data-testid="policy-draft-banner">
          DRAFT for legal review. This text has not been approved and may change before launch.
        </p>
        <h1 className="text-2xl font-bold text-gray-800">Returns, replacements and refunds: personalised merchandise (India)</h1>
        <h2 className="font-semibold">Made to order</h2>
        <p>Framed posters and mugs are printed after you order, with your name or your chosen blood-group design. Because each item is personalised, we cannot accept returns or give refunds for a change of mind, a wrong name or blood group chosen by you, or a colour or size you simply prefer.</p>
        <h2 className="font-semibold">Damaged, faulty or wrong items</h2>
        <p>If your order arrives damaged, defective, misprinted compared with the approved preview, or is not what you ordered, tell us within 7 days of delivery at support@namasutra.life with your order number and clear photos. After we check it, we will send a replacement or refund the amount you paid, whichever you prefer where a replacement is possible.</p>
        <h2 className="font-semibold">Cancelling an order</h2>
        <p>You can ask us to cancel before the order goes into production. Once it is sent to the printer we may not be able to stop it. If we cancel in time, you get a full refund.</p>
        <h2 className="font-semibold">Order we cannot fulfil</h2>
        <p>If we cannot produce or deliver your order (for example the printer is out of stock or cannot reach your address), we will contact you and either fix it or refund you in full.</p>
        <h2 className="font-semibold">How refunds are paid</h2>
        <p>Refunds go back to the original online payment method. Banks and payment providers usually take 5 to 7 working days to show them.</p>
        <h2 className="font-semibold">Payment and delivery</h2>
        <p>Merchandise is paid online in advance. Cash on delivery is not available. Delivery dates shown are estimates, not guarantees.</p>
        <h2 className="font-semibold">Blood-group designs</h2>
        <p>A blood-group design is a design choice only. It is not medical proof and must never be used for medical or transfusion decisions.</p>
        <p className="text-xs text-gray-600">Taxes (GST) are included in the prices shown at checkout. Contact: support@namasutra.life.</p>
        <p><Link to="/merch" className="underline text-brand-700">Back to merchandise</Link></p>
      </article>
    </main>
  );
}

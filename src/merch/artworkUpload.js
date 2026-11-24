// Browser side of print artwork: render the print file and a mock-up from the customer's layout (printCanvas.js),
// and send both to the merchandise server, which stores them (Supabase / Cloudflare R2) and records them on the order.
import { renderPrintFile, renderMockup } from './printCanvas.js';
import { uploadMerchFile } from './client.js';
import { inkFor } from './render.js';

// Files go to the merchandise server (which stores them in Supabase / Cloudflare R2 with failover and records them on the order).
async function upload(orderId, index, kind, blob) {
  const res = await uploadMerchFile({ orderId, index, kind, blob });
  if (res.status !== 200) throw Object.assign(new Error(res.body?.error || 'upload'), { code: res.body?.error, status: res.status, body: res.body });
  return res.body;
}

/**
 * items: the order's items (design, layout, canvasInches). products: { [id]: product }.
 * Every item gets a print file (design baked in at its position). A mock-up is attempted too; if it fails the
 * order simply has none and the server falls back to the print file for Qikink's mockup_link (and records that).
 */
export async function attachArtwork({ orderId, items, products, colorHexOf }) {
  for (const it of items) {
    const product = products[it.productId];
    const spec = { maxWidthInches: it.canvasInches.width, maxHeightInches: it.canvasInches.height };
    const colorHex = colorHexOf(it);
    const inset = { mm: it.designInsetMm, size: it.size }; // frame designs: the artwork is inset from the paper edge
    const print = await renderPrintFile({ design: it.design, spec, layout: it.layout, ink: inkFor(colorHex), inset });
    await upload(orderId, it.index, 'print', print.blob); // a failure here stops the checkout: nothing is sent to the provider
    try {
      const mock = await renderMockup({ product, colorHex, design: it.design, spec, layout: it.layout, inset });
      await upload(orderId, it.index, 'mockup', mock.blob);
    } catch (e) { if (e?.code === 'storage-unavailable' || e?.code === 'storage-not-configured') { /* mock-up is optional: Qikink falls back to the print file */ } }
  }
}

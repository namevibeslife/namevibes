// Browser side of print artwork: render the print file and a mock-up from the customer's layout (printCanvas.js),
// upload both to the customer's own Storage folder, and tell the server their checksums.
import { storage } from '../firebase';
import { ref as storageRef, uploadBytes } from 'firebase/storage';
import { renderPrintFile, renderMockup } from './printCanvas.js';
import { callMerch, IS_MOCK } from './client.js';
import { inkFor } from './render.js';

async function sha256Hex(blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function upload(path, blob) {
  if (!IS_MOCK) await uploadBytes(storageRef(storage, path), blob, { contentType: 'image/png' });
  return sha256Hex(blob);
}

/**
 * items: the order's items (design, layout, canvasInches). products: { [id]: product }.
 * Every item gets a print file (design baked in at its position). A mock-up is attempted too; if it fails the
 * order simply has none and the server falls back to the print file for Qikink's mockup_link (and records that).
 */
export async function attachArtwork({ orderId, uid, items, products, colorHexOf }) {
  const out = [];
  for (const it of items) {
    const product = products[it.productId];
    const spec = { maxWidthInches: it.canvasInches.width, maxHeightInches: it.canvasInches.height };
    const colorHex = colorHexOf(it);
    const print = await renderPrintFile({ design: it.design, spec, layout: it.layout, ink: inkFor(colorHex) });
    const printPath = `merch/print/${uid}/${orderId}/${it.index}.png`;
    const entry = { index: it.index, sha256: await upload(printPath, print.blob), path: printPath, width: print.width, height: print.height };
    try {
      const mock = await renderMockup({ product, colorHex, design: it.design, spec, layout: it.layout });
      const mockPath = `merch/mockup/${uid}/${orderId}/${it.index}.png`;
      entry.mockup = { path: mockPath, sha256: await upload(mockPath, mock.blob) };
    } catch { /* fall back to the print file for mockup_link */ }
    out.push(entry);
  }
  const res = await callMerch('artwork', { orderId, items: out });
  if (res.status !== 200) throw new Error(res.body?.error || 'artwork');
}

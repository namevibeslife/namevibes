// Browser side of print artwork: render the personalised print PNG from the SAME design definition the
// preview uses, upload it to the customer's own Storage folder, and tell the server its checksum.
// Blood-group items never come through here: they use the fixed approved file.
import { storage } from '../firebase';
import { ref as storageRef, uploadBytes } from 'firebase/storage';
import { printSvg } from './render.js';
import { callMerch, IS_MOCK } from './client.js';
import { inkFor } from './render.js';

const MAX_PIXELS = 16_000_000; // stay inside mobile canvas limits (iOS is ~16.7 MP)

async function pngFromSvg(svg, width, height) {
  const scale = Math.min(1, Math.sqrt(MAX_PIXELS / (width * height)));
  const w = Math.round(width * scale); const h = Math.round(height * scale);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  return { blob, width: w, height: h };
}

async function sha256Hex(blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * order: the checkout response's order (id, uid, items), products: { [id]: catalogue product }.
 * Resolves when the server has the checksums, or throws.
 */
export async function attachArtwork({ orderId, uid, items, products, colorHexOf }) {
  const uploads = [];
  for (const it of items) {
    if (it.collection !== 'name_elements') continue;
    const product = products[it.productId];
    const area = Object.values(product?.printArea || {})[0] || { width: 3600, height: 4800 };
    const svg = printSvg(it.design, area, { ink: inkFor(colorHexOf(it)) });
    const { blob, width, height } = await pngFromSvg(svg, area.width, area.height);
    const path = `merch/print/${uid}/${orderId}/${it.index}.png`;
    if (!IS_MOCK) await uploadBytes(storageRef(storage, path), blob, { contentType: 'image/png' });
    uploads.push({ index: it.index, sha256: await sha256Hex(blob), path, width, height });
  }
  if (uploads.length === 0) return;
  const res = await callMerch('artwork', { orderId, items: uploads });
  if (res.status !== 200) throw new Error(res.body?.error || 'artwork');
}

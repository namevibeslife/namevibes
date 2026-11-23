// Browser rendering of the two images an order needs, both from the SAME layout (layout.js):
//  - the PRINT FILE: a transparent canvas the size of the whole print area (inches x 300 DPI, capped for mobile canvas
//    limits) with the design drawn at the customer's position and scale;
//  - the MOCK-UP: the product silhouette with the design composited at the same fractions of the printed area.
import { designGroup } from './render.js';
import { productMockup } from './render.js';
import { BLOOD_ASSETS } from './bloodAssets.js';
import { bloodGroupSlug } from './designs.js';
import { placementBox, designAspect, PRINT_DPI } from './layout.js';

const MAX_PIXELS = 16_000_000; // iOS Safari limits a canvas to about 16.7 MP

export async function loadImage(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}
const svgImage = (svg) => loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
const toBlob = (canvas) => new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas'))), 'image/png'));

// Draw the design into box { x, y, width, height } (canvas pixels). Name tiles are vector (drawn through an SVG image);
// blood-group art is the approved raster master.
export async function drawDesign(ctx, design, box, ink) {
  if (design.collection === 'blood_group') {
    const a = BLOOD_ASSETS[bloodGroupSlug(design.bloodGroup)];
    if (!a) throw new Error('blood asset');
    ctx.drawImage(await loadImage(a.path), box.x, box.y, box.width, box.height);
    return;
  }
  const w = Math.max(1, Math.round(box.width)); const h = Math.max(1, Math.round(box.height));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${designGroup(design, { x: 0, y: 0, width: w, height: h }, { ink })}</svg>`;
  ctx.drawImage(await svgImage(svg), box.x, box.y, box.width, box.height);
}

/** -> { blob, width, height, box } ; spec needs maxWidthInches/maxHeightInches. */
export async function renderPrintFile({ design, spec, layout, ink }) {
  const wantW = Number(spec.maxWidthInches) * PRINT_DPI; const wantH = Number(spec.maxHeightInches) * PRINT_DPI;
  const scale = Math.min(1, Math.sqrt(MAX_PIXELS / (wantW * wantH)));
  const width = Math.round(wantW * scale); const height = Math.round(wantH * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height; // transparent: nothing is painted behind the design
  const box = placementBox({ width, height }, layout, designAspect(design));
  await drawDesign(canvas.getContext('2d'), design, box, ink);
  return { blob: await toBlob(canvas), width, height, box };
}

/** -> { blob, width, height, designBox } ; the product image with the design at the customer's position. */
export async function renderMockup({ product, colorHex, design, spec, layout }) {
  const m = productMockup(product, colorHex, design, { layout, spec });
  const k = 2; // 800 px wide
  const canvas = document.createElement('canvas');
  canvas.width = m.w * k; canvas.height = m.h * k;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(await svgImage(`<svg xmlns="http://www.w3.org/2000/svg" width="${m.w * k}" height="${m.h * k}" viewBox="0 0 ${m.w} ${m.h}">${m.shapeSvg}</svg>`), 0, 0);
  const b = m.designBox;
  await drawDesign(ctx, design, { x: b.x * k, y: b.y * k, width: b.width * k, height: b.height * k }, m.ink);
  return { blob: await toBlob(canvas), width: canvas.width, height: canvas.height, designBox: b };
}

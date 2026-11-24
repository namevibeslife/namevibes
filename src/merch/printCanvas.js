// Browser rendering of the two images an order needs, both from the SAME layout (layout.js):
//  - the PRINT FILE: a transparent canvas the size of the whole print area (inches x 300 DPI, capped for mobile canvas
//    limits) with the design drawn at the customer's position and scale;
//  - the MOCK-UP: the product silhouette with the design composited at the same fractions of the printed area.
import { readEdges, transparentEdges } from './trim.js';
import { designGroup } from './render.js';
import { productMockup } from './render.js';
import { BLOOD_ASSETS } from './bloodAssets.js';
import { bloodGroupSlug } from './designs.js';
import { placementBox, designAspect, PRINT_DPI, FULL_LAYOUT } from './layout.js';
import { renderFrameCanvas } from './framePaint.js';
import { artworkBox, DEFAULT_INSET_MM } from './frames.js';

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

// A frame design is a fully painted poster that fills the whole print area at 300 DPI. Big canvases (A3 is 17.4 MP) can exceed a
// phone browser's limit, in which case the canvas silently stays blank: we check a painted pixel and retry smaller, and report the
// DPI actually reached (the server refuses anything under the product's minimum).
async function renderFramePrintFile({ design, spec, inset }) {
  const areaInches = { width: Number(spec.maxWidthInches), height: Number(spec.maxHeightInches) };
  const wantW = Math.round(Number(spec.maxWidthInches) * PRINT_DPI); const wantH = Math.round(Number(spec.maxHeightInches) * PRINT_DPI);
  for (const scale of [1, 0.85, 0.7, 0.55, 0.42]) {
    const width = Math.round(wantW * scale); const height = Math.round(wantH * scale);
    try {
      const art = artworkBox({ width, height, areaInches, size: inset?.size, insetMm: inset?.mm ?? DEFAULT_INSET_MM });
      const { canvas, metrics, safe } = await renderFrameCanvas({ design, width, height, art });
      const alpha = canvas.getContext('2d').getImageData(Math.floor(width / 2), Math.floor(height / 2), 1, 1).data[3];
      if (alpha !== 255) continue; // blank: over the device canvas limit
      // Qikink: no transparent or accidental blank margins (the flat-colour mat border is artwork and is opaque)
      const bad = transparentEdges(readEdges(canvas.getContext('2d'), width, height));
      if (bad.length) throw Object.assign(new Error('transparent-margin'), { fatal: true, edges: bad });
      const blob = await toBlob(canvas);
      return { blob, width, height, box: { x: 0, y: 0, width, height }, dpi: Math.round(width / Number(spec.maxWidthInches)), metrics, safe, art, artworkInches: art.artworkInches, insetApplied: art.applied };
    } catch (e) { if (e?.fatal) throw e; /* otherwise try a smaller canvas */ }
  }
  throw new Error('print-canvas-unavailable');
}

/** -> { blob, width, height, box } ; spec needs maxWidthInches/maxHeightInches. */
export async function renderPrintFile({ design, spec, layout, ink, inset }) {
  if (design.template === 'frame') return renderFramePrintFile({ design, spec, inset });
  const wantW = Number(spec.maxWidthInches) * PRINT_DPI; const wantH = Number(spec.maxHeightInches) * PRINT_DPI;
  const scale = Math.min(1, Math.sqrt(MAX_PIXELS / (wantW * wantH)));
  const width = Math.round(wantW * scale); const height = Math.round(wantH * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height; // transparent: nothing is painted behind the design
  const box = placementBox({ width, height }, layout, designAspect(design, { width, height }));
  await drawDesign(canvas.getContext('2d'), design, box, ink);
  return { blob: await toBlob(canvas), width, height, box };
}

/** -> { blob, width, height, designBox } ; the product image with the design at the customer's position. */
export async function renderMockup({ product, colorHex, design, spec, layout, inset }) {
  const m = productMockup(product, colorHex, design, { layout, spec });
  const k = 2; // 800 px wide
  const canvas = document.createElement('canvas');
  canvas.width = m.w * k; canvas.height = m.h * k;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(await svgImage(`<svg xmlns="http://www.w3.org/2000/svg" width="${m.w * k}" height="${m.h * k}" viewBox="0 0 ${m.w} ${m.h}">${m.shapeSvg}</svg>`), 0, 0);
  const b = m.designBox;
  if (design.template === 'frame') {
    const mh = Math.round(700 * b.height / b.width);
    const art = artworkBox({ width: 700, height: mh, areaInches: { width: Number(spec.maxWidthInches), height: Number(spec.maxHeightInches) }, size: inset?.size, insetMm: inset?.mm ?? DEFAULT_INSET_MM });
    const r = await renderFrameCanvas({ design, width: 700, height: mh, art });
    ctx.drawImage(r.canvas, b.x * k, b.y * k, b.width * k, b.height * k);
  } else await drawDesign(ctx, design, { x: b.x * k, y: b.y * k, width: b.width * k, height: b.height * k }, m.ink);
  return { blob: await toBlob(canvas), width: canvas.width, height: canvas.height, designBox: b };
}

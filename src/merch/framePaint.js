// Canvas painter for the framed-poster designs (browser only). It executes the operations produced by frames.js, so the
// on-screen preview and the print file are the same drawing at different sizes. Backgrounds are painted in code (not from the
// 1000 px reference images), so they stay sharp at 300 DPI on A4 and A3.
import { layoutFrame, HEADINGS } from './frames.js';
import { drawGemTile, loadGemTexture } from '../utils/posterArtwork.js';
import { textColorFor } from '../utils/elements.js';
import { ensureScriptFont } from '../i18n/fonts.js';

const SERIF = 'Georgia, "Times New Roman", "Noto Sans Devanagari", "Noto Sans Tamil", "Noto Sans Telugu", "Noto Sans Kannada", "Noto Sans Malayalam", serif';
const SANS = 'Arial, "Noto Sans Devanagari", "Noto Sans Tamil", "Noto Sans Telugu", "Noto Sans Kannada", "Noto Sans Malayalam", sans-serif';
const SCRIPT_RANGES = [['devanagari', 0x0900, 0x097f], ['tamil', 0x0b80, 0x0bff], ['telugu', 0x0c00, 0x0c7f], ['kannada', 0x0c80, 0x0cff], ['malayalam', 0x0d00, 0x0d7f]];

// Load the Noto font of every Indian script that appears in the text, so conjuncts and vowel signs are shaped correctly.
export async function ensureFontsFor(texts) {
  const need = new Set();
  for (const t of texts) for (const ch of String(t)) { const cp = ch.codePointAt(0); const hit = SCRIPT_RANGES.find(([, a, b]) => cp >= a && cp <= b); if (hit) need.add(hit[0]); }
  await Promise.all([...need].map((s) => ensureScriptFont(s, 'Aa')));
}

const imageCache = new Map();
function loadImage(src) {
  if (!imageCache.has(src)) imageCache.set(src, new Promise((resolve) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => resolve(null); i.src = src; }));
  return imageCache.get(src);
}

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function sphere(ctx, x, y, r, dark) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  if (dark) { g.addColorStop(0, '#ffe9a8'); g.addColorStop(0.5, '#c8962e'); g.addColorStop(1, '#5a3a06'); } else { g.addColorStop(0, '#fff9d6'); g.addColorStop(0.45, '#e6b43a'); g.addColorStop(1, '#8a5a08'); }
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
function cluster(ctx, W, cx, cy, spread, rand, dark, alpha = 1) {
  const nodes = Array.from({ length: 6 }, () => ({ x: cx + (rand() - 0.5) * spread * 2, y: cy + (rand() - 0.5) * spread * 2, r: W * (0.008 + rand() * 0.018) }));
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = dark ? '#b8862b' : '#c9a24a'; ctx.lineWidth = W * 0.0022;
  nodes.forEach((n, i) => { const m = nodes[(i + 1) % nodes.length]; ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke(); });
  nodes.forEach((n) => sphere(ctx, n.x, n.y, n.r, dark));
  ctx.restore();
}
function sparkle(ctx, x, y, r) {
  ctx.save(); ctx.fillStyle = '#fffbe8'; ctx.shadowColor = '#ffd76a'; ctx.shadowBlur = r * 2;
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill(); ctx.restore();
}

export function paintBackground(ctx, W, H, bg) {
  const rand = rng(bg === 'gold' ? 11 : 7);
  if (bg === 'gold') {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#fff8e3'); g.addColorStop(0.5, '#f9eac0'); g.addColorStop(1, '#f1d68a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, W * 0.75);
    glow.addColorStop(0, 'rgba(255,255,255,0.65)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    [[0.02, 0.05], [0.98, 0.06], [0.0, 0.62], [1.0, 0.64], [0.03, 0.97], [0.97, 0.95]].forEach(([fx, fy], i) => cluster(ctx, W, W * fx, H * fy, W * (i < 2 ? 0.1 : 0.07), rand, false, i < 4 ? 1 : 0.85));
    for (let k = 0; k < 4; k++) {
      const y0 = H * (0.9 + k * 0.025);
      const g2 = ctx.createLinearGradient(0, y0, W, y0 - H * 0.06);
      g2.addColorStop(0, 'rgba(231,176,40,0)'); g2.addColorStop(0.5, 'rgba(240,190,60,0.9)'); g2.addColorStop(1, 'rgba(255,225,130,0.95)');
      ctx.save(); ctx.strokeStyle = g2; ctx.lineWidth = W * (0.004 + k * 0.002); ctx.shadowColor = '#ffd76a'; ctx.shadowBlur = W * 0.02;
      ctx.beginPath(); ctx.moveTo(0, y0 + H * 0.02); ctx.bezierCurveTo(W * 0.3, y0 - H * 0.05, W * 0.6, y0 + H * 0.05, W, y0 - H * 0.03); ctx.stroke(); ctx.restore();
    }
    for (let i = 0; i < 14; i++) { const edge = rand() < 0.5; sparkle(ctx, edge ? rand() * W * 0.18 + (rand() < 0.5 ? 0 : W * 0.82) : rand() * W, edge ? rand() * H : H * (0.88 + rand() * 0.1), W * (0.004 + rand() * 0.008)); }
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#04060d'); g.addColorStop(0.4, '#0b1325'); g.addColorStop(0.8, '#070a14'); g.addColorStop(1, '#04050a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) { ctx.fillStyle = `rgba(255,${230 + Math.floor(rand() * 25)},${180 + Math.floor(rand() * 60)},${0.15 + rand() * 0.6})`; const r = W * (0.0006 + rand() * 0.0016); ctx.beginPath(); ctx.arc(rand() * W, rand() * H * 0.65, r, 0, Math.PI * 2); ctx.fill(); }
    [[0.06, 0.1], [0.94, 0.14]].forEach(([fx, fy]) => cluster(ctx, W, W * fx, H * fy, W * 0.06, rand, true, 0.35));
    const sun = ctx.createRadialGradient(W / 2, H * 0.945, 0, W / 2, H * 0.945, W * 0.4);
    sun.addColorStop(0, 'rgba(255,170,60,0.75)'); sun.addColorStop(0.35, 'rgba(200,110,30,0.35)'); sun.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H);
    ['#0a0f1c', '#05070d'].forEach((col, layer) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
      const base = H * (0.95 - layer * 0.012); let x = 0;
      ctx.lineTo(0, base);
      while (x < W) { x += W * (0.04 + rand() * 0.06); ctx.lineTo(x, base - H * (0.006 + rand() * 0.02) * (layer ? 0.6 : 1)); }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    });
  }
  // double border with corner ornaments
  const gold = bg === 'gold' ? '#b8860b' : '#c79a35';
  ctx.save(); ctx.strokeStyle = gold;
  ctx.lineWidth = W * 0.0032; ctx.strokeRect(W * 0.012, W * 0.012, W - W * 0.024, H - W * 0.024);
  ctx.lineWidth = W * 0.0016; ctx.strokeRect(W * 0.02, W * 0.02, W - W * 0.04, H - W * 0.04);
  [[0.012, 0.012, 1, 1], [0.988, 0.012, -1, 1], [0.012, 0, 1, -1], [0.988, 0, -1, -1]].forEach(([fx, fy0, sx, sy], i) => {
    const x = W * fx; const y = i < 2 ? W * 0.012 : H - W * 0.012;
    ctx.beginPath(); ctx.arc(x + sx * W * 0.018, y + sy * W * 0.018, W * 0.012, sx > 0 ? Math.PI : 0, 0, false); ctx.lineWidth = W * 0.0014; ctx.stroke();
    ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(x + sx * W * 0.018, y + sy * W * 0.018, W * 0.003, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
}

const font = (op, size) => `${op.italic ? 'italic ' : ''}${op.weight || 400} ${size}px ${op.serif === false ? SANS : SERIF}`;

// Execute the operations. Returns the measured text boxes (used by the tests and to assert nothing leaves the safe area).
export async function paintOps(ctx, layout) {
  const { ops, W, H } = layout;
  await loadGemTexture();
  const logo = await loadImage('/brand/namasutra-logo.png');
  const metrics = [];
  const dark = layout.bg === 'dark';
  const roundRect = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  for (const op of ops) {
    if (op.type === 'text') {
      ctx.save();
      let size = op.size;
      ctx.font = font(op, size);
      ctx.textAlign = op.align; ctx.fillStyle = op.color; ctx.textBaseline = 'alphabetic';
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${(op.spacing || 0) * size}px`;
      let w = ctx.measureText(op.text).width;
      if (op.maxWidth && w > op.maxWidth) { size *= op.maxWidth / w; ctx.font = font(op, size); if ('letterSpacing' in ctx) ctx.letterSpacing = `${(op.spacing || 0) * size}px`; w = ctx.measureText(op.text).width; }
      ctx.fillText(op.text, op.x, op.y);
      const left = op.align === 'left' ? op.x : op.align === 'right' ? op.x - w : op.x - w / 2;
      metrics.push({ text: op.text, x: left, y: op.y - size * 0.8, w, h: size });
      ctx.restore();
    } else if (op.type === 'tile') {
      const { el } = op;
      drawGemTile(ctx, op.x, op.y, op.w, op.h, el.color);
      const fg = textColorFor(el.color); const cx = op.x + op.w / 2;
      const draw = (text, y, size, weight, maxW) => { ctx.save(); ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.font = `${weight} ${size}px ${SERIF}`; const w = ctx.measureText(text).width; if (w > maxW) { ctx.font = `${weight} ${size * maxW / w}px ${SERIF}`; } ctx.fillText(text, cx, y, maxW); ctx.restore(); };
      const cat = op.showCategory;
      draw(String(el.number), op.y + op.h * (cat ? 0.17 : 0.2), op.w * 0.17, 700, op.w * 0.8);
      draw(el.symbol, op.y + op.h * (cat ? 0.5 : 0.58), op.w * (cat ? 0.5 : 0.46), 700, op.w * 0.8);
      draw(el.name, op.y + op.h * (cat ? 0.69 : 0.82), op.w * 0.15, 400, op.w * 0.88);
      if (cat) draw(el.category, op.y + op.h * 0.87, op.w * 0.115, 700, op.w * 0.9);
    } else if (op.type === 'panel') {
      ctx.save();
      roundRect(op.x, op.y, op.w, op.h, op.w * 0.018);
      ctx.fillStyle = op.theme === 'gold' ? 'rgba(255,248,230,0.55)' : 'rgba(10,15,28,0.78)'; ctx.fill();
      ctx.strokeStyle = op.theme === 'gold' ? '#c9a24a' : '#b8862b'; ctx.lineWidth = W * (op.strong ? 0.003 : 0.0018);
      if (op.strong) { ctx.shadowColor = '#f1cf7a'; ctx.shadowBlur = W * 0.01; }
      ctx.stroke(); ctx.restore();
    } else if (op.type === 'line') {
      ctx.save(); ctx.strokeStyle = op.color; ctx.lineWidth = op.width; ctx.beginPath(); ctx.moveTo(op.x1, op.y1); ctx.lineTo(op.x2, op.y2); ctx.stroke();
      if (op.diamond) { const mx = (op.x1 + op.x2) / 2; const d = op.width * 3; ctx.fillStyle = op.color; ctx.beginPath(); ctx.moveTo(mx, op.y1 - d); ctx.lineTo(mx + d, op.y1); ctx.lineTo(mx, op.y1 + d); ctx.lineTo(mx - d, op.y1); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    } else if (op.type === 'donut') {
      let a = -Math.PI / 2;
      ctx.save();
      op.slices.forEach((s) => { const sweep = (s.pct / 100) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(op.cx, op.cy); ctx.arc(op.cx, op.cy, op.r, a, a + sweep); ctx.closePath(); ctx.fillStyle = s.color; ctx.fill(); a += sweep; });
      ctx.beginPath(); ctx.arc(op.cx, op.cy, op.r * 0.52, 0, Math.PI * 2); ctx.fillStyle = op.theme === 'gold' ? '#fff3d0' : '#0a0f1c'; ctx.fill(); ctx.restore();
    } else if (op.type === 'dot') {
      ctx.save(); ctx.fillStyle = op.color; ctx.beginPath(); ctx.arc(op.cx, op.cy, op.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    } else if (op.type === 'chip') {
      ctx.save(); ctx.fillStyle = op.color; ctx.shadowColor = op.color; ctx.shadowBlur = op.r * 0.6; ctx.beginPath(); ctx.arc(op.cx, op.cy, op.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffffaa'; ctx.lineWidth = op.r * 0.1; ctx.stroke();
      ctx.fillStyle = textColorFor(op.color); ctx.font = `700 ${op.r * 0.95}px ${SERIF}`; ctx.textAlign = 'center'; ctx.fillText(op.symbol, op.cx, op.cy + op.r * 0.33, op.r * 1.6); ctx.restore();
    } else if (op.type === 'logo' && logo) {
      const h = op.w * logo.height / logo.width;
      if (op.plate) { ctx.save(); ctx.fillStyle = '#fbf3df'; roundRect(op.x - op.w * 0.05, op.y - h * 0.12, op.w * 1.1, h * 1.24, h * 0.3); ctx.fill(); ctx.restore(); }
      ctx.drawImage(logo, op.x, op.y, op.w, h);
    }
  }
  return metrics;
}

/**
 * Render one frame design: { design, width, height } -> { canvas, layout, metrics }. `design` carries frame, people, familyName.
 * An opaque, fully painted poster (background, border and content).
 */
export async function renderFrameCanvas({ design, width, height }) {
  const layout = layoutFrame(design, width, height);
  await ensureFontsFor(layout.ops.filter((o) => o.type === 'text').map((o) => o.text));
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  paintBackground(ctx, width, height, layout.bg);
  const metrics = await paintOps(ctx, layout);
  return { canvas, layout, metrics };
}

export { HEADINGS };

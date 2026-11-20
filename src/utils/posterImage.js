import { drawPosterBackground, drawGemTile } from './posterArtwork';
import { textColorFor } from './elements';
import { posterColorFor } from './posterPalette';
import { SITE_HOST } from '../config/site.js';
import i18n from 'i18next';
import { preparePosterFonts } from '../i18n/posterFont.js';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

// Normal names use a 1080 x 1350 social image; long names expand without losing tiles.
export async function buildPosterImage(person, family = false, theme = family ? 'gold' : 'dark') {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image export unavailable');
  await preparePosterFonts(ctx);
  const elements = person.elements || [];
  const logo = await loadImage('/brand/namasutra-logo.png').catch(() => null);
  ctx.font = '64px Georgia';
  const lines = [];
  let line = '';
  for (const character of person.fullName || i18n.t('poster.nameFallback')) {
    if (ctx.measureText(line + character).width > 880 && line) { lines.push(line.trim()); line = ''; }
    line += character;
  }
  if (line) lines.push(line.trim());
  const top = 390 + lines.length * 78;
  const rows = Math.ceil(elements.length / 5);
  canvas.width = 1080;
  canvas.height = Math.max(1350, top + rows * 220 + 200);
  const gold = theme === 'gold' ? '#815817' : '#ebc979';
  await drawPosterBackground(ctx, canvas.width, canvas.height, theme);
  ctx.strokeStyle = '#b88b36'; ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, 1032, canvas.height - 48);
  ctx.strokeRect(32, 32, 1016, canvas.height - 64);
  if (logo) {
    // Transparent logo sits straight on the poster background
    const logoWidth = 440;
    ctx.drawImage(logo, (canvas.width - logoWidth) / 2, 46, logoWidth, Math.round(logo.height * logoWidth / logo.width));
  } else {
    ctx.save(); ctx.translate(540, 104);
    for (const angle of [0, Math.PI / 3, -Math.PI / 3]) {
      ctx.save(); ctx.rotate(angle); ctx.beginPath(); ctx.ellipse(0, 0, 42, 15, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }
  function text(value, y, size, font = 'Georgia', color = gold) {
    ctx.fillStyle = color; ctx.font = `${size}px ${font}`; ctx.textAlign = 'center'; ctx.fillText(value, 540, y);
  }
  if (!logo) text('N A M A S U T R A', 205, 43);
  text(i18n.t('poster.eyebrow').toUpperCase(), 252, 19, 'Arial');
  ctx.beginPath(); ctx.moveTo(170, 290); ctx.lineTo(910, 290); ctx.stroke();
  text(i18n.t('poster.heading'), 345, 32, 'Georgia');
  lines.forEach((nameLine, i) => text(nameLine, 420 + i * 78, 64));
  const gridY = Math.max(top, (canvas.height - rows * 220) / 2 + 80);
  elements.forEach((el, index) => {
    const rowIndex = Math.floor(index / 5);
    const count = Math.min(5, elements.length - rowIndex * 5);
    const x = (1080 - (count * 174 + (count - 1) * 14)) / 2 + (index % 5) * 188;
    const y = gridY + rowIndex * 220;
    const color = posterColorFor(el);
    drawGemTile(ctx, x, y, 174, 200, color);

    ctx.fillStyle = textColorFor(color); ctx.textAlign = 'center'; ctx.font = 'bold 25px Georgia';
    ctx.fillText(String(el.number), x + 87, y + 33);
    ctx.textAlign = 'center'; ctx.font = 'bold 75px Georgia'; ctx.fillText(el.symbol, x + 87, y + 125);
    ctx.font = 'bold 18px Georgia'; ctx.fillText(el.name, x + 87, y + 177);
  });
  if (!elements.length) text(i18n.t('poster.noElements'), 700, 24, 'Arial');
  text(i18n.t('poster.footerSingle'), canvas.height - 105, 30);
  text(SITE_HOST, canvas.height - 61, 18, 'Arial');
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not create image');
  return new File([blob], 'Namasutra_Poster.png', { type: 'image/png' });
}

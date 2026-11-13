import { textColorFor } from './elements';
import { posterColorFor } from './posterPalette';

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
  const elements = person.elements || [];
  const logo = await loadImage(theme === 'gold' ? '/brand/logo-green-hires.png' : '/brand/logo-green-dark-hires.png').catch(() => null);
  ctx.font = '64px Georgia';
  const lines = [];
  let line = '';
  for (const character of person.fullName || 'Your name') {
    if (ctx.measureText(line + character).width > 880 && line) { lines.push(line.trim()); line = ''; }
    line += character;
  }
  if (line) lines.push(line.trim());
  const top = 390 + lines.length * 78;
  const rows = Math.ceil(elements.length / 5);
  canvas.width = 1080;
  canvas.height = Math.max(1350, top + rows * 195 + 200);
  const gold = theme === 'gold' ? '#815817' : '#ebc979';
  ctx.fillStyle = theme === 'gold' ? '#fbf2da' : '#081716';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
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
  if (!logo) text('N A M E V I B E S', 205, 43);
  text('EVERY NAME HAS A CHEMISTRY', 252, 19, 'Arial');
  ctx.beginPath(); ctx.moveTo(170, 290); ctx.lineTo(910, 290); ctx.stroke();
  text(family && person.relation ? person.relation.toUpperCase() : 'THE CHEMISTRY OF YOUR NAME', 345, 21, 'Arial');
  lines.forEach((nameLine, i) => text(nameLine, 420 + i * 78, 64));
  const gridY = Math.max(top, (canvas.height - rows * 195) / 2 + 80);
  elements.forEach((el, index) => {
    const rowIndex = Math.floor(index / 5);
    const count = Math.min(5, elements.length - rowIndex * 5);
    const x = (1080 - (count * 174 + (count - 1) * 14)) / 2 + (index % 5) * 188;
    const y = gridY + rowIndex * 195;
    const color = posterColorFor(el);
    ctx.fillStyle = color; ctx.fillRect(x, y, 174, 174);
    ctx.strokeStyle = '#b88b36'; ctx.strokeRect(x, y, 174, 174);
    ctx.fillStyle = textColorFor(color); ctx.textAlign = 'left'; ctx.font = '22px Arial';
    ctx.fillText(String(el.number), x + 14, y + 29);
    ctx.textAlign = 'center'; ctx.font = 'bold 75px Georgia'; ctx.fillText(el.symbol, x + 87, y + 110);
    ctx.font = '18px Arial'; ctx.fillText(el.name, x + 87, y + 151);
  });
  if (!elements.length) text('No periodic elements found in this name.', 700, 24, 'Arial');
  text('More than a name. A higher you.', canvas.height - 105, 30);
  text('namevibes.life', canvas.height - 61, 18, 'Arial');
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not create image');
  return new File([blob], 'NameVibes_Poster.png', { type: 'image/png' });
}

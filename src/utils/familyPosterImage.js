import { findSharedElements } from './commonElements';
import { posterColorFor } from './posterPalette';
import { textColorFor } from './elements';

// One image contains every member, their tiles, and the shared-element meanings.
export async function buildFamilyPosterImage(people, theme = 'gold') {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image export unavailable');
  function wrap(value, width, font) {
    ctx.font = font;
    const lines = []; let line = '';
    for (const character of String(value || '')) {
      if (ctx.measureText(line + character).width > width && line) { lines.push(line.trim()); line = ''; }
      line += character;
    }
    if (line) lines.push(line.trim());
    return lines;
  }
  const cards = people.map(person => {
    const names = wrap(person.fullName, 420, '34px Georgia');
    const relation = wrap(person.relation || 'Family member', 420, '18px Arial');
    return { person, names, relation, height: 68 + names.length * 42 + relation.length * 24 + Math.max(1, Math.ceil((person.elements || []).length / 4)) * 118 };
  });
  const rows = [];
  for (let i = 0; i < cards.length; i += 2) rows.push({ cards: cards.slice(i, i + 2), height: Math.max(...cards.slice(i, i + 2).map(card => card.height)) });
  const shared = findSharedElements(people).map(el => ({ ...el, lines: wrap(el.meaning, 900, '23px Arial') }));
  const memberHeight = rows.reduce((height, row) => height + row.height + 24, 0);
  const sharedHeight = shared.length ? shared.reduce((height, el) => height + 90 + el.lines.length * 30, 0) : 105;
  const logicalHeight = Math.max(1350, 420 + memberHeight + sharedHeight + 180);
  // Keep canvas dimensions within practical browser limits for large families.
  const scale = Math.min(1, 14000 / logicalHeight);
  canvas.width = Math.round(1080 * scale); canvas.height = Math.round(logicalHeight * scale);
  ctx.scale(scale, scale);
  const gold = theme === 'gold' ? '#815817' : '#ebc979';
  const ink = theme === 'gold' ? '#362a17' : '#f5ead1';
  ctx.fillStyle = theme === 'gold' ? '#fbf2da' : '#081716'; ctx.fillRect(0, 0, 1080, logicalHeight);
  ctx.strokeStyle = '#b88b36'; ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, 1032, logicalHeight - 48); ctx.strokeRect(32, 32, 1016, logicalHeight - 64);
  function text(value, x, y, font, color = gold, align = 'center') {
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(value, x, y);
  }
  try {
    const logo = await new Promise((resolve, reject) => {
      const image = new Image(); image.onload = () => resolve(image); image.onerror = reject;
      image.src = theme === 'gold' ? '/brand/logo-green-hires.png' : '/brand/logo-green-dark-hires.png';
    });
    const height = Math.min(150, logo.height * 460 / logo.width);
    const width = height * logo.width / logo.height;
    ctx.drawImage(logo, (1080 - width) / 2, 50, width, height);
  } catch { text('NAMEVIBES', 540, 155, '44px Georgia'); }
  text('EVERY NAME HAS A CHEMISTRY', 540, 237, '19px Arial');
  text('Our Family Chemistry', 540, 300, '46px Georgia');
  let y = 340;
  rows.forEach(row => {
    row.cards.forEach((card, column) => {
      const x = row.cards.length === 1 ? 300 : 54 + column * 498;
      ctx.strokeStyle = '#b88b36'; ctx.strokeRect(x, y, 474, row.height);
      let headingY = y + 30;
      card.relation.forEach(line => { text(line.toUpperCase(), x + 237, headingY, '18px Arial'); headingY += 24; });
      card.names.forEach(line => { text(line, x + 237, headingY + 20, '34px Georgia'); headingY += 42; });
      const elements = card.person.elements || [];
      const tileY = headingY + 25;
      elements.forEach((el, index) => {
        const rowIndex = Math.floor(index / 4);
        const count = Math.min(4, elements.length - rowIndex * 4);
        const tx = x + (474 - (count * 100 + (count - 1) * 10)) / 2 + index % 4 * 110;
        const ty = tileY + rowIndex * 118;
        const color = posterColorFor(el); ctx.fillStyle = color; ctx.fillRect(tx, ty, 100, 100);
        ctx.strokeRect(tx, ty, 100, 100);
        const foreground = textColorFor(color);
        text(String(el.number), tx + 8, ty + 20, '15px Arial', foreground, 'left');
        text(el.symbol, tx + 50, ty + 65, 'bold 42px Georgia', foreground);
        text(el.name, tx + 50, ty + 88, '12px Arial', foreground);
      });
      if (!elements.length) text('No periodic elements found.', x + 237, tileY + 40, '20px Arial', ink);
    });
    y += row.height + 24;
  });
  y += 40;
  text('Common elements & their meaning', 540, y, '34px Georgia'); y += 40;
  if (!shared.length) {
    text(people.length < 2 ? 'Add another member to discover shared elements.' : 'No elements are shared between these names.', 540, y + 20, '23px Arial', ink);
  } else shared.forEach(el => {
    text(`${el.symbol} / ${el.name}`, 70, y + 15, 'bold 27px Georgia', gold, 'left');
    text(el.memberCount === people.length ? `Shared by all ${people.length} members` : `Shared by ${el.memberCount} of ${people.length} members`, 70, y + 48, '20px Arial', ink, 'left');
    el.lines.forEach((line, i) => text(line, 70, y + 80 + i * 30, '23px Arial', ink, 'left'));
    y += 90 + el.lines.length * 30;
  });
  text('Different elements. A stronger us.', 540, logicalHeight - 95, '30px Georgia');
  text('namevibes.life', 540, logicalHeight - 57, '18px Arial');
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not create family poster');
  return new File([blob], 'NameVibes_Family_Poster.png', { type: 'image/png' });
}

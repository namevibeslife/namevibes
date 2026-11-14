import { findSharedElements } from './commonElements';
import { posterColorFor } from './posterPalette';
import { textColorFor } from './elements';
import { FAMILY_MAX_NAMES } from './plan';

// One image contains every member, their tiles, and the shared-element meanings.
// Up to FAMILY_MAX_NAMES people get the larger 2x2 layout; older saved analyses with more people
// keep the original layout below so they still export.
export async function buildFamilyPosterImage(people, theme = 'gold') {
  return people.length >= 1 && people.length <= FAMILY_MAX_NAMES
    ? buildCompactFamilyPosterImage(people, theme)
    : buildLegacyFamilyPosterImage(people, theme);
}

async function buildLegacyFamilyPosterImage(people, theme) {
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

// ---------------------------------------------------------------------------------------------
// Larger layout for 1 to FAMILY_MAX_NAMES people: person blocks in 2 columns (1 for a single
// person) with big tiles and names, then the shared "harmony" elements as a band at the bottom.
// Mirrors the PDF layout; the canvas grows taller as needed instead of squeezing onto one page.
// ---------------------------------------------------------------------------------------------
async function buildCompactFamilyPosterImage(people, theme) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image export unavailable');
  const W = 1080;
  const gold = theme === 'gold' ? '#815817' : '#ebc979';
  const ink = theme === 'gold' ? '#362a17' : '#f5ead1';
  const line = '#b88b36';

  function wrap(value, width, font) {
    ctx.font = font;
    const lines = []; let current = '';
    // break between words, falling back to characters for a word wider than the line
    for (const word of String(value || '').split(/\s+/).filter(Boolean)) {
      const attempt = current ? `${current} ${word}` : word;
      if (ctx.measureText(attempt).width <= width) { current = attempt; continue; }
      if (current) { lines.push(current); current = ''; }
      if (ctx.measureText(word).width <= width) { current = word; continue; }
      for (const character of word) {
        if (ctx.measureText(current + character).width > width && current) { lines.push(current); current = ''; }
        current += character;
      }
    }
    if (current) lines.push(current);
    return lines;
  }
  function text(value, x, y, font, color = gold, align = 'center') {
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(value, x, y);
  }
  // shrink a single line of text until it fits the width
  function fitFont(value, width, size, family, weight = '') {
    let current = size;
    ctx.font = `${weight} ${current}px ${family}`.trim();
    while (current > 9 && ctx.measureText(value).width > width) { current -= 0.5; ctx.font = `${weight} ${current}px ${family}`.trim(); }
    return `${weight} ${current}px ${family}`.trim();
  }

  // ---- person blocks ----
  const cols = people.length === 1 ? 1 : 2;
  const blockW = cols === 1 ? 700 : 474;
  const pad = 22;
  const gap = 12;
  const innerW = blockW - 2 * pad;
  const perRow = cols === 1 ? 4 : 3;
  const tile = Math.floor((innerW - (perRow - 1) * gap) / perRow);
  const tileH = Math.round(tile * 1.1);
  const blocks = people.map(person => {
    let nameFont = 46; let names = [];
    for (const size of [cols === 1 ? 54 : 46, 40, 34, 30]) {
      nameFont = size;
      names = wrap(person.fullName, innerW, `${size}px Georgia`);
      if (names.length <= 2) break;
    }
    const elements = person.elements || [];
    const rows = Math.ceil(elements.length / perRow);
    const tilesH = elements.length ? rows * tileH + (rows - 1) * gap : 60;
    const headH = pad + 30 + names.length * Math.round(nameFont * 1.2) + 20;
    return { person, elements, names, nameFont, headH, tilesH, height: headH + tilesH + pad };
  });
  const rows = [];
  for (let i = 0; i < blocks.length; i += cols) {
    const group = blocks.slice(i, i + cols);
    rows.push({ blocks: group, height: Math.max(...group.map(block => block.height)) });
  }
  const personsH = rows.reduce((sum, row) => sum + row.height, 0) + (rows.length - 1) * 24;

  // ---- harmony band ----
  const shared = findSharedElements(people).map(el => ({ ...el, meaningLines: wrap(el.meaning, 300, '21px Arial') }));
  const bandW = 972;
  const entryColW = (bandW - 2 * 28 - 28) / 2;
  const bandRows = [];
  for (let i = 0; i < shared.length; i += 2) {
    const group = shared.slice(i, i + 2);
    bandRows.push({ group, height: Math.max(...group.map(el => Math.max(112, 60 + el.meaningLines.length * 27))) });
  }
  const bandSubtitle = people.length < 2
    ? 'Add another family member to discover shared elements.'
    : shared.length ? 'Elements shared by two or more family members' : 'No elements are shared between these names. Each member brings a unique elemental combination.';
  const bandSubtitleLines = wrap(bandSubtitle, bandW - 80, '22px Arial');
  const bandHead = 36 + 46 + bandSubtitleLines.length * 30 + 14;
  const bandH = bandHead + bandRows.reduce((sum, row) => sum + row.height + 22, 0) + 18;

  const headerEnd = 340;
  const logicalHeight = Math.max(1350, headerEnd + personsH + 44 + bandH + 170);
  canvas.width = W; canvas.height = logicalHeight;

  // ---- paint ----
  ctx.fillStyle = theme === 'gold' ? '#fbf2da' : '#081716'; ctx.fillRect(0, 0, W, logicalHeight);
  ctx.strokeStyle = line; ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, 1032, logicalHeight - 48); ctx.strokeRect(32, 32, 1016, logicalHeight - 64);
  try {
    const logo = await new Promise((resolve, reject) => {
      const image = new Image(); image.onload = () => resolve(image); image.onerror = reject;
      image.src = theme === 'gold' ? '/brand/logo-green-hires.png' : '/brand/logo-green-dark-hires.png';
    });
    const height = Math.min(150, logo.height * 460 / logo.width);
    const width = height * logo.width / logo.height;
    ctx.drawImage(logo, (W - width) / 2, 50, width, height);
  } catch { text('NAMEVIBES', 540, 155, '44px Georgia'); }
  text('EVERY NAME HAS A CHEMISTRY', 540, 237, '19px Arial');
  text('Our Family Chemistry', 540, 300, '46px Georgia');

  function drawTile(el, x, y) {
    const color = posterColorFor(el);
    ctx.fillStyle = color; ctx.fillRect(x, y, tile, tileH);
    ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.strokeRect(x, y, tile, tileH);
    const foreground = textColorFor(color);
    text(String(el.number), x + 9, y + Math.round(tile * 0.17), `${Math.round(tile * 0.15)}px Arial`, foreground, 'left');
    text(el.symbol, x + tile / 2, y + Math.round(tileH * 0.66), `bold ${Math.round(tile * 0.46)}px Georgia`, foreground);
    text(el.name, x + tile / 2, y + tileH - 12, fitFont(el.name, tile - 12, Math.max(13, Math.round(tile * 0.115)), 'Arial'), foreground);
  }

  let y = headerEnd;
  rows.forEach(row => {
    const rowW = row.blocks.length * blockW + (row.blocks.length - 1) * 24;
    const x0 = (W - rowW) / 2;
    row.blocks.forEach((block, k) => {
      const x = x0 + k * (blockW + 24);
      ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.strokeRect(x, y, blockW, row.height);
      const cx = x + blockW / 2;
      text((block.person.relation || 'Family member').toUpperCase(), cx, y + pad + 20, '22px Arial');
      block.names.forEach((nameLine, i) => text(nameLine, cx, y + pad + 30 + (i + 0.85) * Math.round(block.nameFont * 1.2), `${block.nameFont}px Georgia`));
      const tilesTop = y + block.headH + (row.height - block.headH - pad - block.tilesH) / 2;
      if (!block.elements.length) {
        text('No periodic elements found.', cx, tilesTop + 36, '22px Arial', ink);
        return;
      }
      block.elements.forEach((el, index) => {
        const tileRow = Math.floor(index / perRow);
        const inRow = Math.min(perRow, block.elements.length - tileRow * perRow);
        const left = x + (blockW - (inRow * tile + (inRow - 1) * gap)) / 2;
        drawTile(el, left + (index % perRow) * (tile + gap), tilesTop + tileRow * (tileH + gap));
      });
    });
    y += row.height + 24;
  });

  y += 20;
  const bandX = (W - bandW) / 2;
  ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.strokeRect(bandX, y, bandW, bandH);
  text('The Harmony', 540, y + 36 + 34, '42px Georgia');
  bandSubtitleLines.forEach((subtitleLine, i) => text(subtitleLine, 540, y + 36 + 46 + 22 + i * 30, 'italic 22px Arial', ink));
  let by = y + bandHead;
  bandRows.forEach(row => {
    row.group.forEach((el, c) => {
      const ex = bandX + 28 + c * (entryColW + 28);
      // chips are drawn at 112px, a touch bigger than the PDF's, so they read at a glance
      const chip = 112;
      const color = posterColorFor(el);
      ctx.fillStyle = color; ctx.fillRect(ex, by, chip, chip);
      ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.strokeRect(ex, by, chip, chip);
      const foreground = textColorFor(color);
      text(String(el.number), ex + 8, by + 20, '17px Arial', foreground, 'left');
      text(el.symbol, ex + chip / 2, by + 74, 'bold 52px Georgia', foreground);
      text(el.name, ex + chip / 2, by + chip - 10, fitFont(el.name, chip - 10, 14, 'Arial'), foreground);
      const tx = ex + chip + 22;
      text(`${el.name} (${el.symbol})`, tx, by + 26, fitFont(`${el.name} (${el.symbol})`, entryColW - chip - 22, 28, 'Georgia', 'bold'), gold, 'left');
      text(el.memberCount === people.length ? `Shared by all ${people.length} members` : `Shared by ${el.memberCount} of ${people.length} members`, tx, by + 54, 'italic 20px Arial', ink, 'left');
      el.meaningLines.forEach((meaningLine, i) => text(meaningLine, tx, by + 82 + i * 27, '21px Arial', ink, 'left'));
    });
    by += row.height + 22;
  });

  text('Different elements. A stronger us.', 540, logicalHeight - 95, '30px Georgia');
  text('namevibes.life', 540, logicalHeight - 57, '18px Arial');
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not create family poster');
  return new File([blob], 'NameVibes_Family_Poster.png', { type: 'image/png' });
}

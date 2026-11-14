import jsPDF from 'jspdf';
import { textColorFor } from './elements';
import { posterColorFor } from './posterPalette';
import { findSharedElements } from './commonElements';
import { FAMILY_MAX_NAMES } from './plan';

// Loads the transparent logo as a data URL so it can be placed in the PDF
export async function loadPosterLogo(theme) {
  const response = await fetch(theme === 'gold' ? '/brand/logo-green-hires.png' : '/brand/logo-green-dark-hires.png');
  if (!response.ok) throw new Error('Logo unavailable');
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}


// ---------------------------------------------------------------------------------------------
// Compact family page: 1 to FAMILY_MAX_NAMES people on a single A4 page. People sit in blocks
// (1 column for one person, 2 columns otherwise), element tiles are as large as the page allows,
// and the shared "harmony" elements form a band at the bottom. planCompactFamily returns null when
// nothing readable fits, and the caller falls back to the original one-person-per-page layout.
// ---------------------------------------------------------------------------------------------
const CONTENT_TOP = 70;
const CONTENT_BOTTOM = 268;
const CONTENT_X = 14;
const CONTENT_W = 182;
const BLOCK_GAP = 6;
const ROW_GAP = 5;
const BAND_GAP = 5;
const PAD = 4;
const REL_H = 5;
const TILE_GAP = 2.2;
const PT = 0.3528; // mm per point
const TILE_SIZES = [28, 26, 24, 22, 20, 18, 17, 16, 15, 14, 13, 12];
const GOLD_LINE = '#b88b36';

function wrapText(pdf, text, font, style, size, width) {
  pdf.setFont(font, style);
  pdf.setFontSize(size);
  return pdf.splitTextToSize(String(text || ''), width);
}

// Largest size (down to minSize) at which the text fits the width on one line
function fitSize(pdf, text, font, style, width, size, minSize) {
  pdf.setFont(font, style);
  let current = size;
  pdf.setFontSize(current);
  while (current > minSize && pdf.getTextWidth(text) > width) {
    current -= 0.25;
    pdf.setFontSize(current);
  }
  return current;
}

// Biggest name size that keeps the name to two lines with no single word wider than the block
function chooseNameFont(pdf, name, width) {
  const label = name || 'Your name';
  let chosen = null;
  for (const size of [20, 18, 16, 14, 12, 10]) {
    const lines = wrapText(pdf, label, 'times', 'bold', size, width);
    const fits = lines.every(line => pdf.getTextWidth(line) <= width);
    chosen = { size, lines, lineH: size * PT * 1.18 };
    if (fits && lines.length <= 2) break;
  }
  return chosen;
}

function tileColumns(innerW, t) {
  return Math.max(1, Math.floor((innerW + TILE_GAP) / (t + TILE_GAP)));
}

function blockHeight(person, blockW, t, nameFont) {
  const innerW = blockW - 2 * PAD;
  const count = (person.elements || []).length;
  const rows = Math.ceil(count / tileColumns(innerW, t));
  const tilesH = count ? rows * t * 1.1 + (rows - 1) * TILE_GAP : 8;
  return PAD + REL_H + nameFont.lines.length * nameFont.lineH + 3 + tilesH + PAD;
}

function shareLabel(el, total) {
  return el.memberCount === total ? `Shared by all ${total} members` : `Shared by ${el.memberCount} of ${total} members`;
}

// Positions everything in the harmony band relative to the band's top-left corner.
// mode 'full': chip + name + who shares it + meaning. mode 'chips': chips only (meanings go on page 2).
// Page 2 reuses the 'full' band on a page of its own.
function layoutBand(pdf, people, shared, mode) {
  const innerW = CONTENT_W - 2 * PAD;
  const total = people.length;
  let subtitle;
  if (total < 2) subtitle = 'Add another family member to discover shared elements.';
  else if (!shared.length) subtitle = 'No elements are shared between these names. Each member brings a unique elemental combination.';
  else if (mode === 'chips') subtitle = 'Elements shared by two or more family members. Their meanings follow on page 2.';
  else subtitle = 'Elements shared by two or more family members';
  const subtitleLines = wrapText(pdf, subtitle, 'helvetica', 'italic', 8.5, innerW);
  const headH = PAD + 6.5 + subtitleLines.length * 3.8 + 2;
  const items = [];
  let bodyH = 0;
  if (shared.length && mode === 'full') {
    const colW = (innerW - BLOCK_GAP) / 2;
    const textW = colW - 14 - 3;
    for (let i = 0; i < shared.length; i += 2) {
      const row = shared.slice(i, i + 2).map((el, c) => {
        const meaning = wrapText(pdf, el.meaning || '', 'helvetica', 'normal', 7.5, textW);
        return { el, meaning, c, h: Math.max(14, 3.9 + 3.5 + meaning.length * 3.1 + 1.5) };
      });
      const rowH = Math.max(...row.map(item => item.h));
      row.forEach(item => items.push({ ...item, x: PAD + item.c * (colW + BLOCK_GAP), y: headH + bodyH, textW }));
      bodyH += rowH + 2.5;
    }
  } else if (shared.length) {
    const chipW = 15;
    const gap = 4;
    const perRow = Math.max(1, Math.floor((innerW + gap) / (chipW + gap)));
    for (let i = 0; i < shared.length; i += perRow) {
      const row = shared.slice(i, i + perRow);
      const rowW = row.length * chipW + (row.length - 1) * gap;
      row.forEach((el, c) => items.push({ el, x: PAD + (innerW - rowW) / 2 + c * (chipW + gap), y: headH + bodyH, chipW }));
      bodyH += 16.5 + 4 + 2.5;
    }
  }
  return { subtitleLines, headH, items, mode, height: headH + bodyH + (shared.length ? PAD - 2.5 : PAD - 2) };
}

function planCompactFamily(pdf, people) {
  const total = people.length;
  const cols = total === 1 ? 1 : 2;
  const blockW = total === 1 ? 150 : (CONTENT_W - BLOCK_GAP) / 2;
  const rows = Math.ceil(total / cols);
  // One name size for everybody (the smallest any name needs) so the blocks look consistent
  const fitted = people.map(person => chooseNameFont(pdf, person.fullName, blockW - 2 * PAD));
  const nameSize = Math.min(...fitted.map(font => font.size));
  const nameFonts = people.map(person => ({
    size: nameSize,
    lines: wrapText(pdf, person.fullName || 'Your name', 'times', 'bold', nameSize, blockW - 2 * PAD),
    lineH: nameSize * PT * 1.18,
  }));
  const shared = findSharedElements(people);
  const available = CONTENT_BOTTOM - CONTENT_TOP;
  const personsHeight = t => {
    const rowHeights = [];
    for (let r = 0; r < rows; r++) {
      const heights = people.slice(r * cols, r * cols + cols).map((person, k) => blockHeight(person, blockW, t, nameFonts[r * cols + k]));
      rowHeights.push(Math.max(...heights));
    }
    return { rowHeights, height: rowHeights.reduce((sum, h) => sum + h, 0) + (rows - 1) * ROW_GAP };
  };
  // The Harmony band on a page of its own (full detail). Only worth a page when something is shared.
  const harmonyPage = total > 1 && shared.length ? layoutBand(pdf, people, shared, 'full') : null;
  const harmonyPageFits = !harmonyPage || harmonyPage.height <= available;
  // In order: everything on one page with the meanings in the band; everything on one page with
  // chips only (meanings on page 2); people on page 1 and the Harmony on page 2. Tiles never get
  // smaller than 14mm on one page or 12mm when split. Otherwise the caller uses the old layout.
  const attempts = [
    { mode: 'full', minT: 14, twoPages: false },
    { mode: 'chips', minT: 14, twoPages: true },
    { mode: 'none', minT: 12, twoPages: true },
  ];
  for (const attempt of attempts) {
    if (attempt.twoPages && !harmonyPageFits) continue;
    if (attempt.mode === 'chips' && !shared.length) continue; // identical to 'full' when nothing is shared
    const band = attempt.mode === 'none' ? null : layoutBand(pdf, people, shared, attempt.mode);
    for (const t of TILE_SIZES.filter(size => size >= attempt.minT)) {
      const { rowHeights, height } = personsHeight(t);
      const needed = height + (band ? BAND_GAP + band.height : 0);
      if (needed <= available) {
        const startY = CONTENT_TOP + (available - needed) / 2;
        return { cols, rows, blockW, t, nameFonts, rowHeights, band, harmonyPage: attempt.twoPages ? harmonyPage : null, startY };
      }
    }
  }
  return null;
}

function drawTile(pdf, el, x, y, w, h) {
  const color = posterColorFor(el);
  pdf.setFillColor(color); pdf.setDrawColor(GOLD_LINE); pdf.setLineWidth(.3);
  pdf.roundedRect(x, y, w, h, 1.6, 1.6, 'FD');
  pdf.setDrawColor('#ffffff'); pdf.setLineWidth(.15);
  pdf.line(x + 1.6, y + 1.6, x + w - 1.6, y + 1.6);
  pdf.setTextColor(textColorFor(color));
  const numberSize = Math.max(5.5, w * 0.33);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(numberSize);
  pdf.text(String(el.number), x + 1.8, y + 1.6 + numberSize * PT + 0.4);
  pdf.setFont('times', 'bold'); pdf.setFontSize(w * 1.15);
  pdf.text(el.symbol, x + w / 2, y + h * 0.62, { align: 'center' });
  const nameSize = fitSize(pdf, el.name, 'helvetica', 'normal', w - 2, Math.max(4.5, w * 0.3), 3.8);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(nameSize);
  pdf.text(el.name, x + w / 2, y + h - 1.8, { align: 'center' });
}

function drawPersonBlock(pdf, person, x, y, w, h, t, nameFont, gold) {
  pdf.setDrawColor(GOLD_LINE); pdf.setLineWidth(.35);
  pdf.roundedRect(x, y, w, h, 2.5, 2.5, 'S');
  const cx = x + w / 2;
  pdf.setTextColor(gold);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8);
  pdf.text((person.relation || 'Family member').toUpperCase(), cx, y + PAD + 2.8, { align: 'center' });
  pdf.setFont('times', 'bold'); pdf.setFontSize(nameFont.size);
  nameFont.lines.forEach((line, i) => pdf.text(line, cx, y + PAD + REL_H + (i + 0.8) * nameFont.lineH, { align: 'center' }));
  const headerH = PAD + REL_H + nameFont.lines.length * nameFont.lineH + 3;
  const elements = person.elements || [];
  const innerW = w - 2 * PAD;
  const columns = tileColumns(innerW, t);
  const tileH = t * 1.1;
  const rows = Math.ceil(elements.length / columns);
  const tilesH = elements.length ? rows * tileH + (rows - 1) * TILE_GAP : 8;
  const top = y + headerH + (h - headerH - PAD - tilesH) / 2; // centre the tiles in the space left
  if (!elements.length) {
    pdf.setTextColor(gold); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9);
    pdf.text('No periodic elements found in this name.', cx, top + 5, { align: 'center' });
    return;
  }
  elements.forEach((el, index) => {
    const row = Math.floor(index / columns);
    const inRow = Math.min(columns, elements.length - row * columns);
    const left = x + (w - (inRow * t + (inRow - 1) * TILE_GAP)) / 2;
    drawTile(pdf, el, left + (index % columns) * (t + TILE_GAP), top + row * (tileH + TILE_GAP), t, tileH);
  });
}

function drawBand(pdf, people, band, y0, { ink, gold }) {
  pdf.setDrawColor(GOLD_LINE); pdf.setLineWidth(.35);
  pdf.roundedRect(CONTENT_X, y0, CONTENT_W, band.height, 2.5, 2.5, 'S');
  pdf.setTextColor(gold); pdf.setFont('times', 'bold'); pdf.setFontSize(15);
  pdf.text('The Harmony', 105, y0 + PAD + 4.8, { align: 'center' });
  pdf.setTextColor(ink); pdf.setFont('helvetica', 'italic'); pdf.setFontSize(8.5);
  band.subtitleLines.forEach((line, i) => pdf.text(line, 105, y0 + PAD + 9.4 + i * 3.8, { align: 'center' }));
  band.items.forEach(item => {
    const x = CONTENT_X + item.x;
    const y = y0 + item.y;
    if (band.mode === 'full') {
      drawTile(pdf, item.el, x, y, 14, 14);
      const tx = x + 14 + 3;
      pdf.setTextColor(gold); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9);
      pdf.text(`${item.el.name} (${item.el.symbol})`, tx, y + 3.9);
      pdf.setTextColor(ink); pdf.setFont('helvetica', 'italic'); pdf.setFontSize(7.5);
      pdf.text(shareLabel(item.el, people.length), tx, y + 3.9 + 3.5);
      pdf.setFont('helvetica', 'normal');
      item.meaning.forEach((line, i) => pdf.text(line, tx, y + 3.9 + 3.5 + (i + 1) * 3.1));
    } else {
      drawTile(pdf, item.el, x, y, item.chipW, 16.5);
      const caption = item.el.memberCount === people.length ? `All ${people.length}` : `${item.el.memberCount} of ${people.length}`;
      pdf.setTextColor(ink); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5);
      pdf.text(caption, x + item.chipW / 2, y + 16.5 + 3.2, { align: 'center' });
    }
  });
}

function drawCompactFamily(pdf, people, plan, colors) {
  let y = plan.startY;
  for (let r = 0; r < plan.rows; r++) {
    const row = people.slice(r * plan.cols, r * plan.cols + plan.cols);
    const rowW = row.length * plan.blockW + (row.length - 1) * BLOCK_GAP;
    const x0 = (210 - rowW) / 2; // a lone last block sits centred
    row.forEach((person, k) => drawPersonBlock(pdf, person, x0 + k * (plan.blockW + BLOCK_GAP), y, plan.blockW, plan.rowHeights[r], plan.t, plan.nameFonts[r * plan.cols + k], colors.gold));
    y += plan.rowHeights[r] + ROW_GAP;
  }
  if (plan.band) drawBand(pdf, people, plan.band, CONTENT_BOTTOM - plan.band.height, colors);
}

// Vector text and tiles stay crisp in print. Every continuation page has the same frame.
// `family` defaults to 'more than one person' but a one-person Family analysis can pass true.
export function buildPosterPDF(people, { theme = people.length > 1 ? 'gold' : 'dark', logo = null, family: familyOption } = {}) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const family = familyOption ?? people.length > 1;
  const ink = theme === 'gold' ? '#362a17' : '#f5ead1';
  const gold = theme === 'gold' ? '#815817' : '#ebc979';
  const background = theme === 'gold' ? '#fbf2da' : '#081716';
  let firstPage = true;
  let y = 0;
  function frame(subtitle) {
    if (!firstPage) pdf.addPage();
    firstPage = false;
    pdf.setFillColor(background);
    pdf.rect(0, 0, 210, 297, 'F');
    pdf.setDrawColor('#b88b36');
    pdf.setLineWidth(.35);
    pdf.rect(6, 6, 198, 285);
    pdf.rect(8, 8, 194, 281);
    for (const x of [13, 197]) for (const cy of [13, 284]) {
      pdf.circle(x, cy, 2);
      pdf.line(x - 3, cy, x + 3, cy);
    }
    pdf.setTextColor(gold);
    if (logo) {
      // Transparent logo: no box, sits directly on the page colour
      const logoW = theme === 'gold' ? 64 : 56;
      const logoH = theme === 'gold' ? logoW * 732 / 2149 : logoW * 315 / 800; // keep the master's proportions
      pdf.addImage(logo, 'PNG', (210 - logoW) / 2, 11, logoW, logoH, 'nv-logo', 'FAST');
    } else {
      pdf.ellipse(105, 21, 8, 3);
      pdf.ellipse(105, 21, 3, 8);
      pdf.circle(105, 21, 1, 'S');
      pdf.setFont('times', 'normal');
      pdf.setFontSize(23);
      pdf.text('N A M E V I B E S', 105, 40, { align: 'center' });
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text('E V E R Y  N A M E  H A S  A  C H E M I S T R Y', 105, logo ? 44 : 47, { align: 'center' });
    pdf.line(30, 53, 180, 53);
    pdf.setFont('times', 'normal');
    pdf.setFontSize(16);
    pdf.text(subtitle, 105, 63, { align: 'center' });
    pdf.line(30, 271, 180, 271);
    pdf.setFont('times', 'italic');
    pdf.setFontSize(15);
    pdf.text(family ? 'Different elements. A stronger us.' : 'More than a name. A higher you.', 105, 280, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.text('DISCOVER  /  EXPLORE  /  BE YOU', 18, 286);
    pdf.text(`namevibes.life  |  ${pdf.getNumberOfPages()}`, 192, 286, { align: 'right' });
    y = 73;
  }
  function personHeading(person, continued = false) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(gold);
    if (person.relation) { pdf.text(person.relation.toUpperCase(), 105, y, { align: 'center' }); y += 8; }
    pdf.setFont('times', 'bold');
    pdf.setFontSize(25);
    const lines = pdf.splitTextToSize(person.fullName || 'Your name', 170);
    for (const line of lines) {
      if (y > 245) frame('Your elemental profile / continued');
      pdf.setTextColor(gold); pdf.setFont('times', 'bold'); pdf.setFontSize(25);
      pdf.text(line, 105, y, { align: 'center' }); y += 10;
    }
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8);
    pdf.text(continued ? 'YOUR ELEMENTS / CONTINUED' : 'YOUR ELEMENTAL PROFILE', 105, y, { align: 'center' });
    y += 10;
  }
  function sharedMeaningPages() {
    frame('Common elements & their meaning');
    const shared = findSharedElements(people);
    if (!shared.length) {
      pdf.setTextColor(ink); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(11);
      pdf.text('No elements are shared between these names.', 105, y + 12, { align: 'center' });
    }
    shared.forEach(el => {
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(11);
      const meaning = pdf.splitTextToSize(el.meaning || '', 160);
      const height = 24 + meaning.length * 5;
      if (y + height > 258) frame('Common elements / continued');
      pdf.setTextColor(gold); pdf.setFont('times', 'bold'); pdf.setFontSize(16);
      pdf.text(`${el.symbol} / ${el.name}`, 22, y + 8);
      pdf.setTextColor(ink); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10);
      pdf.text(`Shared by ${el.memberCount} of ${people.length} members`, 22, y + 16);
      pdf.setFontSize(11); pdf.text(meaning, 22, y + 23);
      y += height + 8;
    });
  }

  // 1 to FAMILY_MAX_NAMES people: one A4 page when it fits. Longer (older) analyses, or content
  // too big to fit readably, use the one-person-per-page layout below.
  if (family && people.length >= 1 && people.length <= FAMILY_MAX_NAMES) {
    const plan = planCompactFamily(pdf, people);
    if (plan) {
      frame('Our Family Chemistry');
      drawCompactFamily(pdf, people, plan, { ink, gold });
      if (plan.harmonyPage) {
        frame('Common elements & their meaning');
        drawBand(pdf, people, plan.harmonyPage, CONTENT_TOP, { ink, gold });
      }
      return pdf;
    }
  }

  for (const person of people) {
    frame(family ? 'Family Chemistry' : 'The Chemistry of Your Name');
    y = 90;
    personHeading(person);
    y = Math.max(y + 15, 120);
    const elements = person.elements || [];
    for (let start = 0; start < elements.length; start += 5) {
      if (y + 34 > 258) { frame('Your elemental profile / continued'); }
      const row = elements.slice(start, start + 5);
      const left = (210 - (row.length * 32 + (row.length - 1) * 3)) / 2;
      row.forEach((el, i) => {
        const x = left + i * 35;
        const color = posterColorFor(el);
        pdf.setFillColor(color); pdf.setDrawColor('#b88b36');
        pdf.roundedRect(x, y, 32, 32, 2, 2, 'FD');
        pdf.setDrawColor('#ffffff'); pdf.setLineWidth(.15);
        pdf.line(x + 2, y + 2, x + 30, y + 2);
        pdf.setTextColor(textColorFor(color));
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8);
        pdf.text(String(el.number), x + 3, y + 6);
        pdf.setFont('times', 'bold'); pdf.setFontSize(27);
        pdf.text(el.symbol, x + 16, y + 21, { align: 'center' });
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7);
        pdf.text(el.name, x + 16, y + 28, { align: 'center' });
      });
      y += 36;
    }
    if (!elements.length) {
      pdf.setTextColor(ink); pdf.setFontSize(11);
      pdf.text('No periodic elements found in this name.', 105, y, { align: 'center' }); y += 12;
    }
  }
  if (family) sharedMeaningPages();
  if (firstPage) frame('Your Name Chemistry');
  return pdf;
}

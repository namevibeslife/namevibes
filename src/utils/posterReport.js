import jsPDF from 'jspdf';
import { textColorFor } from './elements';
import { posterColorFor } from './posterPalette';
import { findSharedElements } from './commonElements';

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

// Vector text and tiles stay crisp in print. Every continuation page has the same frame.
export function buildPosterPDF(people, { theme = people.length > 1 ? 'gold' : 'dark', logo = null } = {}) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const family = people.length > 1;
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
  if (family) {
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
  if (firstPage) frame('Your Name Chemistry');
  return pdf;
}

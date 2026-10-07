import jsPDF from 'jspdf';
import { textColorFor } from './elements';

// Shared by the Family Package page and saved family analyses.
// `results` is a list of { relation, fullName, elements }.

// Elements that appear in every member's name
export function findCommonElements(results) {
  if (!results || results.length < 2) return [];

  const allElementSymbols = results.map(r => r.elements.map(e => e.symbol));
  const firstSet = new Set(allElementSymbols[0]);
  const commonSymbols = [...firstSet].filter(symbol =>
    allElementSymbols.every(symbols => symbols.includes(symbol))
  );

  // Get all unique elements that match the common symbols
  const uniqueCommon = [];
  const seenSymbols = new Set();
  for (const element of results.flatMap(r => r.elements)) {
    if (commonSymbols.includes(element.symbol) && !seenSymbols.has(element.symbol)) {
      uniqueCommon.push(element);
      seenSymbols.add(element.symbol);
    }
  }
  return uniqueCommon;
}

// The full report as plain text, ready to paste into an AI chat
export function buildAIPrompt(results, contextLabels = []) {
  const commonElements = findCommonElements(results);
  const lines = [
    'I used NameVibes (namevibes.life), which maps the letters of a name to periodic table elements. Here is my family report:',
    ''
  ];

  results.forEach(person => {
    lines.push(`${person.relation}: ${person.fullName}`);
    person.elements.forEach(el => {
      lines.push(`  - ${el.name} (${el.symbol}, atomic number ${el.number}): ${el.meaning}`);
    });
    lines.push('');
  });

  if (commonElements.length > 0) {
    lines.push(`Harmony elements shared by everyone: ${commonElements.map(e => `${e.name} (${e.symbol})`).join(', ')}`);
    lines.push('');
  }

  if (contextLabels.length > 0) {
    lines.push(`Why I'm exploring this: ${contextLabels.join('; ')}`);
    lines.push('');
  }

  lines.push('Can you help me understand what these elements and the harmony between our names might signify, and how they connect us as a family?');
  return lines.join('\n');
}

export function buildFamilyPDF(results) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  let yPos = margin;

  const addNewPage = () => {
    pdf.addPage();
    yPos = margin;
    pdf.setFontSize(10);
    pdf.setTextColor(100);
    pdf.text('www.namevibes.life', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
  };

  pdf.setFontSize(24);
  pdf.setTextColor(147, 51, 234);
  pdf.setFont('helvetica', 'bold');
  pdf.text('NameVibes', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  pdf.setFontSize(14);
  pdf.setTextColor(100);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Family Chemistry Report', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  for (let i = 0; i < results.length; i++) {
    const person = results[i];
    
    if (yPos > pageHeight - 100) {
      addNewPage();
    }

    pdf.setFontSize(12);
    pdf.setTextColor(100);
    pdf.setFont('helvetica', 'bold');
    if (results.length > 1) {
      pdf.text(person.relation.toUpperCase(), margin, yPos);
      yPos += 7;
    }
    
    pdf.setFontSize(18);
    pdf.setTextColor(0);
    pdf.text(person.fullName, margin, yPos);
    yPos += 12;

    const boxSize = 28;
    const boxGap = 6;
    const elementsPerRow = 5;
    let xPos = margin;
    let rowYPos = yPos;

    for (let j = 0; j < person.elements.length; j++) {
      const element = person.elements[j];
      
      if (j > 0 && j % elementsPerRow === 0) {
        xPos = margin;
        rowYPos += boxSize + 18;
      }

      if (rowYPos > pageHeight - 50) {
        addNewPage();
        rowYPos = yPos;
        xPos = margin;
      }

      const rgb = hexToRgb(element.color);
      pdf.setFillColor(rgb.r, rgb.g, rgb.b);
      pdf.rect(xPos, rowYPos, boxSize, boxSize, 'F');
      
      pdf.setDrawColor(80);
      pdf.setLineWidth(0.5);
      pdf.rect(xPos, rowYPos, boxSize, boxSize);

      pdf.setFontSize(9);
      pdf.setTextColor(textColorFor(element.color));
      pdf.setFont('helvetica', 'bold');
      pdf.text(element.number.toString(), xPos + 2, rowYPos + 4);

      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      const symbolWidth = pdf.getTextWidth(element.symbol);
      pdf.text(element.symbol, xPos + (boxSize - symbolWidth) / 2, rowYPos + boxSize / 2 + 4);

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      const nameWidth = pdf.getTextWidth(element.name);
      pdf.setTextColor(0); // name sits below the tile, on white
      pdf.text(element.name, xPos + (boxSize - nameWidth) / 2, rowYPos + boxSize + 5);

      xPos += boxSize + boxGap;
    }

    yPos = rowYPos + boxSize + 20;
    
    if (i < results.length - 1) {
      pdf.setDrawColor(200);
      pdf.setLineWidth(0.3);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;
    }
  }

  if (results.length > 1) {
    const commonElements = findCommonElements(results);
    
    if (commonElements.length > 0) {
      addNewPage();
      
      pdf.setFontSize(22);
      pdf.setTextColor(147, 51, 234);
      pdf.setFont('helvetica', 'bold');
      pdf.text('The Harmony', pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;
      
      pdf.setFontSize(12);
      pdf.setTextColor(100);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Common Elements Across All Names', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      const boxSize = 28;
      const boxGap = 6;
      const elementsPerRow = 5;
      let xPos = margin;
      let rowYPos = yPos;

      for (let j = 0; j < commonElements.length; j++) {
        const element = commonElements[j];
        
        if (j > 0 && j % elementsPerRow === 0) {
          xPos = margin;
          rowYPos += boxSize + 18;
        }

        const rgb = hexToRgb(element.color);
        pdf.setFillColor(rgb.r, rgb.g, rgb.b);
        pdf.rect(xPos, rowYPos, boxSize, boxSize, 'F');
        
        pdf.setDrawColor(80);
        pdf.setLineWidth(0.5);
        pdf.rect(xPos, rowYPos, boxSize, boxSize);

        pdf.setFontSize(9);
        pdf.setTextColor(textColorFor(element.color));
        pdf.setFont('helvetica', 'bold');
        pdf.text(element.number.toString(), xPos + 2, rowYPos + 4);

        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        const symbolWidth = pdf.getTextWidth(element.symbol);
        pdf.text(element.symbol, xPos + (boxSize - symbolWidth) / 2, rowYPos + boxSize / 2 + 4);

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        const nameWidth = pdf.getTextWidth(element.name);
        pdf.setTextColor(0); // name sits below the tile, on white
        pdf.text(element.name, xPos + (boxSize - nameWidth) / 2, rowYPos + boxSize + 5);

        xPos += boxSize + boxGap;
      }
    }
  }

  pdf.setFontSize(8);
  pdf.setTextColor(150);
  const date = new Date().toLocaleDateString();
  pdf.text(date, margin, pageHeight - 10);
  pdf.text('www.namevibes.life', pageWidth - margin, pageHeight - 10, { align: 'right' });

  return pdf;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

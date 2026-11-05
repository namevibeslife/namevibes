import { buildPosterPDF } from './posterReport';

// Shared by the Family Package page and saved family analyses.
// `results` is a list of { relation, fullName, elements }.

// Elements that appear in every member's name
export { findCommonElements } from './commonElements';
import { findCommonElements } from './commonElements';

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
  return buildPosterPDF(results, findCommonElements(results));
}

import i18n from 'i18next';
import { buildPosterPDF } from './posterReport';
import { elementMeaning } from '../i18n/elements';

// Shared by the Family Package page and saved family analyses.
// `results` is a list of { relation, fullName, elements }.

// Elements that appear in every member's name
export { findCommonElements } from './commonElements';
import { findCommonElements } from './commonElements';
import { SITE_HOST } from '../config/site.js';
import { relationLabel } from '../i18n/poster.js';

// The full report as plain text, ready to paste into an AI chat
export function buildAIPrompt(results, contextLabels = []) {
  const commonElements = findCommonElements(results);
  const lines = [
    i18n.t('ai.promptIntro', { host: SITE_HOST }),
    ''
  ];

  results.forEach(person => {
    lines.push(`${relationLabel(person.relation)}: ${person.fullName}`);
    person.elements.forEach(el => {
      lines.push(i18n.t('ai.promptElement', { name: el.name, symbol: el.symbol, number: el.number, meaning: elementMeaning(el) }));
    });
    lines.push('');
  });

  if (commonElements.length > 0) {
    lines.push(i18n.t('ai.promptHarmony', { elements: commonElements.map(e => `${e.name} (${e.symbol})`).join(', ') }));
    lines.push('');
  }

  if (contextLabels.length > 0) {
    lines.push(i18n.t('ai.promptWhy', { reasons: contextLabels.join('; ') }));
    lines.push('');
  }

  lines.push(i18n.t('ai.promptQuestion'));
  return lines.join('\n');
}

export function buildFamilyPDF(results) {
  return buildPosterPDF(results);
}

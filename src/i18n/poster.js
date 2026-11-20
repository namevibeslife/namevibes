import i18n from 'i18next';

const slug = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));

// Relation names are stored in English with each saved analysis; they are shown in the
// selected language when a translation exists.
export function relationLabel(relation, t = i18n.t.bind(i18n)) {
  if (!relation) return t('poster.relationFallback');
  return t(`relations.${slug(relation)}`, { defaultValue: relation });
}

export function sharedLabel(memberCount, total, t = i18n.t.bind(i18n)) {
  return memberCount === total ? t('poster.sharedAll', { count: total }) : t('poster.sharedSome', { n: memberCount, count: total });
}

// Noto Sans for each Indian script is bundled through @fontsource and fetched only when that
// language is selected, so complex scripts (conjuncts, vowel signs) shape correctly on screen and
// in the canvas-drawn PNG/PDF posters. A new language in an existing script needs nothing here.
const SCRIPTS = {
  devanagari: { family: 'Noto Sans Devanagari', load: [() => import('@fontsource/noto-sans-devanagari/400.css'), () => import('@fontsource/noto-sans-devanagari/700.css')] },
  tamil: { family: 'Noto Sans Tamil', load: [() => import('@fontsource/noto-sans-tamil/400.css'), () => import('@fontsource/noto-sans-tamil/700.css')] },
  telugu: { family: 'Noto Sans Telugu', load: [() => import('@fontsource/noto-sans-telugu/400.css'), () => import('@fontsource/noto-sans-telugu/700.css')] },
  kannada: { family: 'Noto Sans Kannada', load: [() => import('@fontsource/noto-sans-kannada/400.css'), () => import('@fontsource/noto-sans-kannada/700.css')] },
  malayalam: { family: 'Noto Sans Malayalam', load: [() => import('@fontsource/noto-sans-malayalam/400.css'), () => import('@fontsource/noto-sans-malayalam/700.css')] },
};

export const isComplexScript = (script) => Boolean(SCRIPTS[script]);

const ready = new Map();
// Resolves once the script's font files are actually usable by CSS and canvas
export function ensureScriptFont(script, sample = 'Aa') {
  const def = SCRIPTS[script];
  if (!def) return Promise.resolve(null);
  if (!ready.has(script)) {
    ready.set(script, Promise.all(def.load.map(fn => fn())).then(() => Promise.all([
      document.fonts.load(`400 24px "${def.family}"`, sample),
      document.fonts.load(`700 24px "${def.family}"`, sample),
    ])).then(() => def.family).catch(() => null));
  }
  return ready.get(script);
}
export const scriptFontFamily = (script) => SCRIPTS[script]?.family || null;

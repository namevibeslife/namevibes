import i18n from 'i18next';
import { ensureScriptFont, isComplexScript, scriptFontFamily } from './fonts';
import { languageInfo } from './index';

// Canvas posters keep their Georgia/Arial look in English. For the Indian scripts the bundled
// Noto Sans font is put first in every font stack, so the browser shapes conjuncts and vowel signs
// correctly. The shim rewrites ctx.font, so the layout code stays as it is.
export const posterScript = () => languageInfo(i18n.language).script;
export const isComplexLanguage = () => isComplexScript(posterScript());

export async function preparePosterFonts(ctx) {
  const script = posterScript();
  await ensureScriptFont(script, languageInfo(i18n.language).name);
  const family = scriptFontFamily(script);
  if (!family || !ctx) return;
  const proto = Object.getPrototypeOf(ctx);
  const desc = Object.getOwnPropertyDescriptor(proto, 'font');
  Object.defineProperty(ctx, 'font', {
    configurable: true,
    get() { return desc.get.call(this); },
    set(value) { desc.set.call(this, String(value).replace(/Georgia/g, `"${family}", Georgia`).replace(/Arial/g, `"${family}", Arial`)); },
  });
}

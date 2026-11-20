import re
# ---- font shim
open('src/i18n/posterFont.js', 'w', encoding='utf-8').write("""import i18n from 'i18next';
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
""")

def edit(p, pairs, count_ok=None):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (p, a[:80])
        s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)

edit('src/utils/posterImage.js', [
("  const ctx = canvas.getContext('2d');\n  if (!ctx) throw new Error('Image export unavailable');\n", "  const ctx = canvas.getContext('2d');\n  if (!ctx) throw new Error('Image export unavailable');\n  await preparePosterFonts(ctx);\n"),
("person.fullName || 'Your name'", "person.fullName || i18n.t('poster.nameFallback')"),
("text('EVERY NAME HAS A CHEMISTRY', 252, 19, 'Arial');", "text(i18n.t('poster.eyebrow').toUpperCase(), 252, 19, 'Arial');"),
("text('Your Elemental Identity, in Harmony with Nature.', 345, 32, 'Georgia');", "text(i18n.t('poster.heading'), 345, 32, 'Georgia');"),
("text('No periodic elements found in this name.', 700, 24, 'Arial');", "text(i18n.t('poster.noElements'), 700, 24, 'Arial');"),
("text('More than a name. A higher you.', canvas.height - 105, 30);", "text(i18n.t('poster.footerSingle'), canvas.height - 105, 30);"),
("import { SITE_HOST } from '../config/site.js';", "import { SITE_HOST } from '../config/site.js';\nimport i18n from 'i18next';\nimport { preparePosterFonts } from '../i18n/posterFont.js';"),
])

s = open('src/utils/familyPosterImage.js', encoding='utf-8').read()
def rep(a, b):
    global s
    assert a in s, a[:80]
    s = s.replace(a, b)
rep("import { SITE_HOST } from '../config/site.js';", "import { SITE_HOST } from '../config/site.js';\nimport i18n from 'i18next';\nimport { preparePosterFonts } from '../i18n/posterFont.js';\nimport { elementMeaning } from '../i18n/elements.js';\nimport { relationLabel, sharedLabel } from '../i18n/poster.js';")
n = s.count("if (!ctx) throw new Error('Image export unavailable');")
s = s.replace("if (!ctx) throw new Error('Image export unavailable');", "if (!ctx) throw new Error('Image export unavailable');\n  await preparePosterFonts(ctx);")
print('ctx shims', n)
s = s.replace("person.relation || 'Family member'", "relationLabel(person.relation)")
s = s.replace("block.person.relation || 'Family member'", "relationLabel(block.person.relation)")
s = s.replace("text('EVERY NAME HAS A CHEMISTRY', 540, 237, '19px Arial');", "text(i18n.t('poster.eyebrow').toUpperCase(), 540, 237, '19px Arial');")
s = s.replace("text('Your Elemental Identity, in Harmony with Nature.', 540, 300, '32px Georgia');", "text(i18n.t('poster.heading'), 540, 300, '32px Georgia');")
s = s.replace("text('No periodic elements found.', ", "text(i18n.t('poster.noElementsShort'), ")
s = s.replace("text('Common elements & their meaning', ", "text(i18n.t('poster.commonTitle'), ")
s = s.replace("people.length < 2 ? 'Add another member to discover shared elements.' : 'No elements are shared between these names.'", "people.length < 2 ? i18n.t('poster.addMemberShort') : i18n.t('poster.noShared')")
s = s.replace("el.memberCount === people.length ? `Shared by all ${people.length} members` : `Shared by ${el.memberCount} of ${people.length} members`", "sharedLabel(el.memberCount, people.length)")
s = s.replace("text('Different elements. A stronger us.', ", "text(i18n.t('poster.footerFamily'), ")
s = s.replace("text('The Harmony', ", "text(i18n.t('poster.harmony'), ")
s = s.replace("""    ? 'Add another family member to discover shared elements.'
    : shared.length ? 'Elements shared by two or more family members' : 'No elements are shared between these names. Each member brings a unique elemental combination.';""", """    ? i18n.t('poster.addMember')
    : shared.length ? i18n.t('poster.sharedSubtitle') : i18n.t('poster.noSharedLong');""")
s = s.replace("wrap(el.meaning,", "wrap(elementMeaning(el),")
s = s.replace("text('NAMASUTRA', 540, 155, '44px Georgia')", "text('NAMASUTRA', 540, 155, '44px Georgia')")
open('src/utils/familyPosterImage.js', 'w', encoding='utf-8').write(s)
left = re.findall(r"'[A-Z][a-z]+ [a-z][^']{6,}'", s)
print('left:', left[:10])

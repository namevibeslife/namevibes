from importlib.machinery import SourceFileLoader
X = SourceFileLoader('x', 'scripts/i18n-extract.py').load_module()
p = 'src/utils/posterReport.js'
s = open(p, encoding='utf-8').read()
def rep(a, b, all_=True):
    global s
    assert a in s, a[:80]
    s = s.replace(a, b)
rep("import { SITE_HOST } from '../config/site.js';", "import { SITE_HOST } from '../config/site.js';\nimport i18n from 'i18next';\nimport { elementMeaning } from '../i18n/elements.js';\nimport { relationLabel, sharedLabel } from '../i18n/poster.js';")
rep("const label = name || 'Your name';", "const label = name || i18n.t('poster.nameFallback');")
rep("return el.memberCount === total ? `Shared by all ${total} members` : `Shared by ${el.memberCount} of ${total} members`;", "return sharedLabel(el.memberCount, total);")
rep("subtitle = 'Add another family member to discover shared elements.';", "subtitle = i18n.t('poster.addMember');")
rep("subtitle = 'No elements are shared between these names. Each member brings a unique elemental combination.';", "subtitle = i18n.t('poster.noSharedLong');")
rep("subtitle = 'Elements shared by two or more family members. Their meanings follow on page 2.';", "subtitle = i18n.t('poster.sharedSubtitlePage2');")
rep("else subtitle = 'Elements shared by two or more family members';", "else subtitle = i18n.t('poster.sharedSubtitle');")
rep("person.fullName || 'Your name'", "person.fullName || i18n.t('poster.nameFallback')")
rep("(person.relation || 'Family member').toUpperCase()", "relationLabel(person.relation).toUpperCase()")
rep("'No periodic elements found in this name.'", "i18n.t('poster.noElements')")
rep("pdf.text('The Harmony',", "pdf.text(i18n.t('poster.harmony'),")
rep("`All ${people.length}` : `${item.el.memberCount} of ${people.length}`", "i18n.t('poster.pdfAll', { count: people.length }) : i18n.t('poster.pdfNOf', { n: item.el.memberCount, count: people.length })")
rep("pdf.text('E V E R Y  N A M E  H A S  A  C H E M I S T R Y',", "pdf.text(i18n.t('poster.eyebrow').toUpperCase().split('').join(' ').replace(/  /g, '  '),")
rep("family ? 'Different elements. A stronger us.' : 'More than a name. A higher you.'", "family ? i18n.t('poster.footerFamily') : i18n.t('poster.footerSingle')")
rep("continued ? 'YOUR ELEMENTS / CONTINUED' : 'YOUR ELEMENTAL PROFILE'", "(continued ? i18n.t('poster.pdfContinued') : i18n.t('poster.pdfProfile')).toUpperCase()")
s = s.replace("frame('Common elements & their meaning')", "frame(i18n.t('poster.commonTitle'))")
s = s.replace("frame('Your Elemental Identity, in Harmony with Nature.')", "frame(i18n.t('poster.heading'))")
rep("frame('Your Name Chemistry')", "frame(i18n.t('poster.pdfTitle'))")
rep("'No elements are shared between these names.'", "i18n.t('poster.noShared')")
rep("`Shared by ${el.memberCount} of ${people.length} members`", "sharedLabel(el.memberCount, people.length)")
s = s.replace("el.meaning || ''", "elementMeaning(el) || ''")
open(p, 'w', encoding='utf-8').write(s)
X.add([('poster.sharedSubtitlePage2', 'Elements shared by two or more family members. Their meanings follow on page 2.')])
import re
print([m for m in re.findall(r"'[A-Z][a-z]+ [^']{5,}'", s) if 'Error' not in m][:10])

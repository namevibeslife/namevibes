import re
from importlib.machinery import SourceFileLoader
X = SourceFileLoader('x', 'scripts/i18n-extract.py').load_module()

p = 'src/utils/numerology.js'
s = open(p, encoding='utf-8').read()
m = re.search(r"  const interpretations = \{(.*?)\n  \};\n  \n  return interpretations\[number\] \|\| \"Unique energy pattern\";", s, re.S)
assert m
pairs = re.findall(r'(\d+): "([^"]+)"', m.group(1))
add = [(f'numerology.interpretation.{n}', t) for n, t in pairs] + [('numerology.interpretation.default', 'Unique energy pattern')]
s = s.replace(m.group(0), "  return i18n.t(`numerology.interpretation.${number}`, { defaultValue: i18n.t('numerology.interpretation.default') });")
s = s.replace("// Chaldean Numerology System\n", "// Chaldean Numerology System\nimport i18n from 'i18next';\n", 1)
open(p, 'w', encoding='utf-8').write(s)
X.add(add)

p = 'src/utils/hindu-astrology.js'
s = open(p, encoding='utf-8').read()
a = "? `✅ \"${firstName}\" starts with \"${syllableMatch.syllable}\" - Perfect alignment with your Nakshatra!`\n      : `ℹ️ For your birth date, names starting with ${nakshatra.syllables.join(', ')} are considered auspicious.`"
assert a in s
s = s.replace(a, "? i18n.t('astrology.match', { name: firstName, syllable: syllableMatch.syllable })\n      : i18n.t('astrology.noMatch', { syllables: nakshatra.syllables.join(', ') })")
s = "import i18n from 'i18next';\n" + s
open(p, 'w', encoding='utf-8').write(s)
X.add([('astrology.match', '✅ "{{name}}" starts with "{{syllable}}" - Perfect alignment with your Nakshatra!'),
('astrology.noMatch', 'ℹ️ For your birth date, names starting with {{syllables}} are considered auspicious.')])
print('ok', len(add))

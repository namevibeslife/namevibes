import re
from importlib.machinery import SourceFileLoader
X = SourceFileLoader('x', 'scripts/i18n-extract.py').load_module()

p = 'src/pages/NumerologyCalculator.jsx'
s = open(p, encoding='utf-8').read()
start = s.index("  const getNumberMeaning = (number, type) => {")
end = s.index("  };\n", s.index("return meanings[number]?.[type]", start)) + 5
block = s[start:end]
entries = []
for n, body in re.findall(r"(\d+): \{(.*?)\n      \}", block, re.S):
    for typ, text in re.findall(r"(\w+): '((?:[^'\\]|\\.)*)'", body):
        entries.append((f'numerology.meaning.{n}.{typ}', text.replace("\\'", "'")))
fallback = re.search(r"\|\| '([^']+)';", block).group(1)
entries.append(('numerology.meaning.default', fallback))
print(len(entries), 'meanings')
s = s[:start] + "  const getNumberMeaning = (number, type) => i18n.t(`numerology.meaning.${number}.${type}`, { defaultValue: i18n.t('numerology.meaning.default') });\n" + s[end:]
# relations
s = s.replace("const RELATIONS = [\n  'Self',", "const RELATIONS = [\n  'Self',")
s = s.replace("import { Calculator } from 'lucide-react';", "import { Calculator } from 'lucide-react';\nimport i18n from 'i18next';\nimport { relationLabel } from '../i18n/poster';")
s = s.replace("<div className=\"text-sm text-brand-600 font-semibold mb-1\">{results.relation}</div>", "<div className=\"text-sm text-brand-600 font-semibold mb-1\">{relationLabel(results.relation, t)}</div>")
s = s.replace("{RELATIONS.map(rel => (", "{RELATIONS.map(rel => (")
open(p, 'w', encoding='utf-8').write(s)
X.add(entries + [('relations.self', 'Self'), ('relations.partner', 'Partner')])
print('ok')

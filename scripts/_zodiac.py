import re
from importlib.machinery import SourceFileLoader
X = SourceFileLoader('x', 'scripts/i18n-extract.py').load_module()

p = 'src/pages/ZodiacSyllableTable.jsx'
s = open(p, encoding='utf-8').read()
slug = lambda v: re.sub(r'[^a-z0-9]+(.)?', lambda m: m.group(1).upper() if m.group(1) else '', v.lower())
add = []

# INTRO block
m = re.search(r"const INTRO = \{.*?\n\};\n", s, re.S)
intro = m.group(0)
for sysname in ['western', 'vedic']:
    blk = re.search(sysname + r": \{\s*heading: \"((?:[^\"\\]|\\.)*)\",\s*paragraphs: \[(.*?)\]\s*\}", intro, re.S)
    add.append((f'zodiac.intro.{sysname}.heading', blk.group(1)))
    paras = re.findall(r'"((?:[^"\\]|\\.)*)"', blk.group(2))
    for i, t in enumerate(paras):
        add.append((f'zodiac.intro.{sysname}.p{i + 1}', t))
    print(sysname, len(paras), 'paragraphs')
# keep structure but make lookups: INTRO now only holds paragraph counts
western_count = sum(1 for k, _ in add if k.startswith('zodiac.intro.western.p'))
vedic_count = sum(1 for k, _ in add if k.startswith('zodiac.intro.vedic.p'))
s = s.replace(intro, f"const INTRO_PARAS = {{ western: {western_count}, vedic: {vedic_count} }};\n")

# data arrays
fields = ['sign', 'dates', 'element', 'ruling', 'colors', 'traits', 'bestFor']
els = set()
for arr, sysname in [('westernZodiac', 'western'), ('vedicZodiac', 'vedic')]:
    a = s.index(f"const {arr} = [")
    b = s.index("\n  ];", a)
    block = s[a:b]
    for obj in re.findall(r"\{\n(.*?)\n    \}", block, re.S):
        vals = dict(re.findall(r"(\w+): '((?:[^'\\]|\\.)*)'", obj))
        sid = slug(vals['sign'])
        for f in fields:
            add.append((f'zodiac.{sysname}.{sid}.{f}', vals[f].replace("\\'", "'")))
        els.add(vals['element'])
    print(sysname, len(re.findall(r"\{\n(.*?)\n    \}", block, re.S)), 'signs')

# rendering helpers inside the component
s = s.replace("  const [system, setSystem] = useState('western'); // 'western' or 'vedic'\n", "  const [system, setSystem] = useState('western'); // 'western' or 'vedic'\n  const zf = (z, f) => t(`zodiac.${system}.${slug(z.sign)}.${f}`);\n")
s = s.replace("import { ChevronDown } from 'lucide-react';", "import { ChevronDown } from 'lucide-react';\nimport { useTranslation } from 'react-i18next';\n\nconst slug = (v) => String(v).toLowerCase().replace(/[^a-z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));")
for f in ['sign', 'dates', 'colors', 'traits', 'bestFor', 'ruling']:
    s = s.replace("{zodiac." + f + "}", "{zf(zodiac, '" + f + "')}")
s = s.replace("{zodiac.element}", "{zf(zodiac, 'element')}")
open(p, 'w', encoding='utf-8').write(s)
X.add(add)
print(len(add), 'zodiac keys')
for f in re.findall(r"INTRO\[[^\]]*\]|INTRO\.\w+|INTRO\b[^_]", s):
    print('INTRO use:', f)

import json, re
EN = 'src/locales/en.json'
d = json.load(open(EN, encoding='utf-8'))
ins = d['insights']
el_src = open('src/utils/elements.js', encoding='utf-8').read()
element_names = set(re.findall(r"name: '([^']+)', number", el_src))
astro = open('src/utils/hindu-astrology.js', encoding='utf-8').read()
nak = set(re.findall(r"name: '([^']+)', syllables", astro))
planets = {'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'}
path = 'src/pages/ElementInsightsPage.jsx'
src = open(path, encoding='utf-8').read()
reverted, planetmap = 0, 0
for k in list(ins):
    v = ins[k]
    full = f'insights.{k}'
    is_symbol = re.fullmatch(r'[A-Z][a-z]?', v)
    is_el = v in element_names
    is_nak = v in nak
    is_syl = re.fullmatch(r'[A-Za-z]+(, [A-Za-z]+)+', v) and all(len(x) <= 6 for x in v.split(', '))
    if v in planets:
        src = src.replace("t('" + full + "')", "t('hora.planet." + v + "')")
        del ins[k]
        planetmap += 1
    elif is_symbol or is_el or is_nak or is_syl:
        lit = v.replace('\\', '\\\\').replace("'", "\\'")
        # JSX text node {t('key')} -> literal text
        src = src.replace("{t('" + full + "')}", v if "'" not in v and '{' not in v else "{'" + lit + "'}")
        src = src.replace("t('" + full + "')", "'" + lit + "'")
        del ins[k]
        reverted += 1
open(path, 'w', encoding='utf-8').write(src)
d['insights'] = ins
d['hora']['planet']['Rahu'] = 'Rahu'
d['hora']['planet']['Ketu'] = 'Ketu'
json.dump(d, open(EN, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('reverted', reverted, 'planets mapped', planetmap, 'remaining', len(ins))

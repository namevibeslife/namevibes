import json, re, os, glob
d = json.load(open('src/locales/en.json', encoding='utf-8'))
def flat(o, p=''):
    for k, v in o.items():
        if isinstance(v, dict):
            yield from flat(v, p + k + '.')
        else:
            yield p + k, v
keys = [k for k, _ in flat(d) if not k.startswith('meta.')]
src = ''
for f in glob.glob('src/**/*.js*', recursive=True):
    if f.startswith('src\\locales') or f.startswith('src/locales'):
        continue
    src += open(f, encoding='utf-8').read() + '\n'
dyn_prefixes = ['zodiac.', 'hora.planet.', 'hora.note.', 'hora.weekday.', 'hora.chog.', 'hora.quality.', 'numerology.meaning.', 'numerology.interpretation.',
                'ambassador.field.', 'ambassador.section.', 'ambassador.option.', 'ambassador.hint.', 'relations.', 'family.context.', 'followers.status.', 'insights.', 'numerologyPage.', 'zodiacPage.', 'profileComplete.male', 'profileComplete.female', 'profileComplete.other']
unused = []
for k in keys:
    base = re.sub(r'_(one|other)$', '', k)
    if base in src or k in src:
        continue
    if any(k.startswith(p) for p in dyn_prefixes):
        continue
    unused.append(k)
print(len(unused))
print('\n'.join(unused))

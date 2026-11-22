"""Merges scripts/_tr/<lang>.<n>.txt (key|value lines) into src/locales/<lang>.json (UI) or
src/locales/content/<lang>.json (lines whose key starts with elements.)."""
import glob, json, re, sys, os
langs = ['hi', 'ta', 'te', 'kn', 'ml']
en = json.load(open('src/locales/en.json', encoding='utf-8'))
def flat(o, p=''):
    for k, v in o.items():
        if isinstance(v, dict):
            yield from flat(v, p + k + '.')
        else:
            yield p + k, v
en_flat = dict(flat(en))
tok = lambda s: sorted(re.findall(r'\{\{\s*[\w.]+\s*\}\}|</?[a-z]+>', s))
def nest(flat_map):
    out = {}
    for k, v in flat_map.items():
        parts = k.split('.')
        d = out
        for p in parts[:-1]:
            d = d.setdefault(p, {})
        d[parts[-1]] = v
    return out
metas = {'hi': ('हिन्दी', 'devanagari'), 'ta': ('தமிழ்', 'tamil'), 'te': ('తెలుగు', 'telugu'), 'kn': ('ಕನ್ನಡ', 'kannada'), 'ml': ('മലയാളം', 'malayalam')}
for lang in langs:
    tr = {}
    for f in sorted(glob.glob(f'scripts/_tr/{lang}.*.txt')):
        for ln, line in enumerate(open(f, encoding='utf-8').read().split('\n'), 1):
            if not line.strip():
                continue
            if '|' not in line:
                print(f'{f}:{ln}: no separator: {line[:60]}')
                continue
            k, v = line.split('|', 1)
            if k in tr:
                print(f'{f}:{ln}: duplicate {k}')
            tr[k] = v.strip()
    ui = {k: v for k, v in tr.items() if not k.startswith('elements.')}
    content = {k: v for k, v in tr.items() if k.startswith('elements.')}
    bad = []
    for k, v in ui.items():
        if k not in en_flat:
            bad.append(f'unknown key {k}')
        elif tok(v) != tok(en_flat[k]):
            bad.append(f'placeholder mismatch {k}: {tok(en_flat[k])} vs {tok(v)}')
    missing = [k for k in en_flat if not k.startswith('meta.') and k not in ui]
    name, script = metas[lang]
    data = {'meta': {'code': lang, 'name': name, 'script': script}, **nest(ui)}
    json.dump(data, open(f'src/locales/{lang}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    if content:
        json.dump(nest(content), open(f'src/locales/content/{lang}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f'{lang}: {len(ui)} ui, {len(content)} content, missing {len(missing)}, problems {len(bad)}')
    for b in bad[:8]:
        print('   ', b)
    if len(sys.argv) > 1 and sys.argv[1] == 'missing':
        print('   first missing:', missing[:5])

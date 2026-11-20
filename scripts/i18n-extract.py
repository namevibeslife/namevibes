"""Local helper used while converting JSX to t() keys. Not part of the build."""
import json, re, sys
EN = 'src/locales/en.json'

def load():
    return json.load(open(EN, encoding='utf-8'))

def put(d, key, val):
    parts = key.split('.')
    for p in parts[:-1]:
        d = d.setdefault(p, {})
        assert isinstance(d, dict), key
    if parts[-1] in d and d[parts[-1]] != val:
        raise SystemExit(f'key clash {key}: {d[parts[-1]]!r} vs {val!r}')
    d[parts[-1]] = val

def hook(src, names, fn=''):
    """add useTranslation import and `const { t } = useTranslation();` to named components"""
    if 'useTranslation' not in src:
        # insert after the last import line
        lines = src.split('\n')
        idx = max(i for i, l in enumerate(lines) if l.startswith('import '))
        # handle multi-line imports: find end of statement
        while not lines[idx].rstrip().endswith(';') and not re.search(r"from\s+['\"].*['\"]\s*;?\s*$", lines[idx]):
            idx += 1
        lines.insert(idx + 1, "import { useTranslation } from 'react-i18next';")
        src = '\n'.join(lines)
    for n in names:
        pat = re.compile(r'((?:export\s+default\s+)?function\s+' + n + r'\s*\([^)]*\)\s*\{\n)')
        m = pat.search(src)
        if not m:
            pat = re.compile(r'((?:export\s+)?const\s+' + n + r'\s*=\s*\([^)]*\)\s*=>\s*\{\n)')
            m = pat.search(src)
        assert m, 'component not found ' + n
        src = src[:m.end()] + "  const { t } = useTranslation();\n" + src[m.end():]
    return src

def ex(path, entries, comps=(), plain=None):
    src = open(path, encoding='utf-8').read()
    d = load()
    for e in entries:
        key, text = e[0], e[1]
        put(d, key, text)
        esc = re.escape(text).replace(r'\ ', r'\s+')
        n = 0
        # attribute  ="text"
        src, c = re.subn(r'=(["\'])' + esc + r'\1', "={t('" + key + "')}", src); n += c
        # JS string literal
        src, c = re.subn(r"(?<![\w\.])'" + re.escape(text) + "'", "t('" + key + "')", src); n += c
        src, c = re.subn(r'(?<![\w\.])"' + re.escape(text) + '"', "t('" + key + "')", src); n += c
        # JSX text node: >  text  <   or {...}  text  <  /  >  text  {
        src, c = re.subn(r'(>\s*)' + esc + r'(\s*<)', lambda m: m.group(1) + "{t('" + key + "')}" + m.group(2), src); n += c
        src, c = re.subn(r'(>\s*)' + esc + r'(\s*\{)', lambda m: m.group(1) + "{t('" + key + "')}" + m.group(2), src); n += c
        src, c = re.subn(r'(\}\s*)' + esc + r'(\s*<)', lambda m: m.group(1) + "{t('" + key + "')}" + m.group(2), src); n += c
        if n == 0:
            print('  !! no match', key, repr(text[:50]))
    if comps:
        src = hook(src, comps)
    open(path, 'w', encoding='utf-8').write(src)
    json.dump(d, open(EN, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print('ok', path)

def add(entries):
    d = load()
    for k, v in entries:
        put(d, k, v)
    json.dump(d, open(EN, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

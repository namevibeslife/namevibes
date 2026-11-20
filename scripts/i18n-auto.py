"""Local helper: turns the visible JSX text in a long static content page into numbered keys.
usage: python scripts/i18n-auto.py <file> <prefix> <Component> [<Component> ...]
Text nodes become {t('prefix.nNNN')}; literal title/aria-label/placeholder/alt attributes too.
Key numbering is by order of first appearance, so re-running on a converted file does nothing."""
import re, sys, json, html
sys.path.insert(0, 'scripts')
from importlib.machinery import SourceFileLoader
X = SourceFileLoader('x', 'scripts/i18n-extract.py').load_module()

path, prefix, comps = sys.argv[1], sys.argv[2], sys.argv[3:]
src = open(path, encoding='utf-8').read()
d = X.load()
existing = d
for part in prefix.split('.'):
    existing = existing.get(part, {}) if isinstance(existing, dict) else {}
counter = [len(existing)]
seen = {}
entries = []

def decode(t):
    t = html.unescape(t)
    return re.sub(r'\s+', ' ', t).strip()

def key_for(text):
    if text in seen:
        return seen[text]
    counter[0] += 1
    k = f'{prefix}.n{counter[0]:03d}'
    seen[text] = k
    entries.append((k, text))
    return k

def keep(text):
    letters = re.findall(r'[A-Za-zऀ-ൿ]', text)
    if len(letters) < 2:
        return False
    return True

# protect <style> blocks and comments
def text_node(m):
    pre, raw, post = m.group(1), m.group(2), m.group(3)
    text = decode(raw)
    if not text or not keep(text):
        return m.group(0)
    lead = ' ' if raw[:1].isspace() and pre.endswith('>') and not pre.endswith('\n') and '\n' not in raw[:raw.find(text[:1])] else ''
    trail = ' ' if raw[-1:].isspace() and '\n' not in raw[raw.rfind(text[-1:]) + 1:] else ''
    k = key_for(text)
    return f"{pre}{'{\" \"}' if lead else ''}{{t('{k}')}}{'{\" \"}' if trail else ''}{post}"

# JSX text between a closing '>' of a tag and the next '<'
pattern = re.compile(r'(>)([^<>{}]*[A-Za-z][^<>{}]*)(<)', re.S)
out = pattern.sub(text_node, src)

def attr(m):
    name, q, val = m.group(1), m.group(2), m.group(3)
    text = decode(val)
    if not keep(text):
        return m.group(0)
    return f"{name}={{t('{key_for(text)}')}}"
out = re.sub(r'\b(title|aria-label|placeholder|alt)=(")([^"{}]*[A-Za-z][^"{}]*)"', attr, out)

if comps:
    out = X.hook(out, comps)
open(path, 'w', encoding='utf-8').write(out)
X.add(entries)
print(f'{len(entries)} keys added for {path}')

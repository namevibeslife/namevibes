import json, re

def get(d, k):
    for p in k.split('.'):
        d = d[p]
    return d

def setk(d, k, v):
    ps = k.split('.')
    for p in ps[:-1]:
        d = d[p]
    d[ps[-1]] = v

def edit(lang, fixes):
    p = f'src/locales/{lang}.json'
    d = json.load(open(p, encoding='utf-8'))
    for k, v in fixes.items():
        old = get(d, k)
        print(f'{lang} {k}\n   - {old}\n   + {v}')
        setk(d, k, v)
    json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

# ---- Hindi: read-each-sentence replacements
edit('hi', {
    'landing.headingLine1': 'अपने नाम का',
    'landing.headingLine2': 'छिपा हुआ रसायन खोजें',
    'analyze.chemistryOf': '"{{name}}" का रसायन',
    'analyze.button': 'रसायन देखें',
    'poster.eyebrow': 'हर नाम का एक रसायन होता है',
    'poster.pdfTitle': 'आपके नाम का रसायन',
    'family.resultTitleSingle': 'नाम का रसायन',
    'pricing.subtitle': 'नामों के रसायन को खोलें',
    'dashboard.analyzeHint': 'किसी भी नाम का रसायन जानें',
    'insights.n014': 'नाम का रसायन:',
    'page.description': 'आवर्त तत्वों, कैल्डियन अंकशास्त्र और हिंदू ज्योतिष के ज़रिए अपने नाम का छिपा रसायन खोजें।',
})

# ---- Malayalam
p = 'src/locales/ml.json'
d = json.load(open(p, encoding='utf-8'))
for k in ['share.line4', 'nav.explore']:
    old = get(d, k)
    new = old.replace('അന്വേഷിക്കൂ', 'കണ്ടെത്തൂ')
    print(f'ml {k}\n   - {old}\n   + {new}')
    setk(d, k, new)
old = get(d, 'landing.aboutHeading')
new = old.replace('ഒരു കൂട്ടുകാരൻ', 'ഒരു കൂട്ടാളി')
print(f'ml landing.aboutHeading\n   - {old}\n   + {new}')
setk(d, 'landing.aboutHeading', new)
json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

# ---- Telugu
edit('te', {'share.line5': '🎁 నా రెఫరల్ కోడ్‌తో ప్రయత్నించండి: {{code}} దీనివల్ల మీకు తగ్గింపు రావచ్చు'})
p = 'src/locales/te.json'
d = json.load(open(p, encoding='utf-8'))
count = 0
SUFFIX = r'(ను|కి|తో|లో|కు|ని)'
def walk(o):
    global count
    for k, v in o.items():
        if isinstance(v, dict):
            walk(v)
        elif k != 'code':
            # Latin word (or closing bracket) + space + case ending that is a word on its own
            nv = re.sub(r'(?<=[A-Za-z0-9\)])\s' + SUFFIX + r'(?![ఀ-౿])', r'\1', v)
            if nv != v:
                count += 1
                print(f'te {k}\n   - {v}\n   + {nv}')
                o[k] = nv
walk(d)
json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('te attached endings in', count, 'strings')

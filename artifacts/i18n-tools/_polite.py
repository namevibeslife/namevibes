import json, re

def load(p):
    return json.load(open(p, encoding='utf-8'))

def walk(o, fn, path=''):
    for k, v in o.items():
        if isinstance(v, dict):
            walk(v, fn, f'{path}{k}.')
        else:
            nv = fn(f'{path}{k}', v)
            if nv != v:
                o[k] = nv

def setkey(d, key, val):
    parts = key.split('.')
    for p in parts[:-1]:
        d = d[p]
    d[parts[-1]] = val

changes = {}

# ---------- explicit proofreading fixes
FIX = {
    'te': {
        'payment.includesGst': '{{percent}}% GST సహా',
        'auth.newHere': 'Namasutra‌కు కొత్తవారా?',
        'auth.titleSignin': 'మళ్లీ స్వాగతం',
        'pricing.badge': 'అన్నీ ఉన్నాయి',
        'errors.paymentRecorded': 'చెల్లింపు నమోదైంది కానీ ప్రొఫైల్ అప్‌డేట్ విఫలమైంది. దయచేసి సహాయ బృందాన్ని సంప్రదించండి.',
    },
    'ml': {
        'auth.newHere': 'Namasutra-യിൽ പുതിയ ആളാണോ?',
        'errors.paymentRecorded': 'പേയ്‌മെന്റ് രേഖപ്പെടുത്തി, പക്ഷേ പ്രൊഫൈൽ അപ്ഡേറ്റ് പരാജയപ്പെട്ടു. ദയവായി സഹായ വിഭാഗവുമായി ബന്ധപ്പെടൂ.',
    },
    'hi': {
        'auth.titleSignin': 'फिर से स्वागत है',
        'auth.tagline': 'अपने नाम का रसायन खोजें',
    },
    'ta': {
        'errors.paymentRecorded': 'பணம் செலுத்தியது பதிவாகிவிட்டது, ஆனால் சுயவிவரப் புதுப்பிப்பு தோல்வியடைந்தது. உதவி மையத்தைத் தொடர்பு கொள்ளுங்கள்.',
    },
    'kn': {
        'errors.paymentRecorded': 'ಪಾವತಿ ದಾಖಲಾಗಿದೆ ಆದರೆ ಪ್ರೊಫೈಲ್ ನವೀಕರಣ ವಿಫಲವಾಯಿತು. ದಯವಿಟ್ಟು ಸಹಾಯ ತಂಡವನ್ನು ಸಂಪರ್ಕಿಸಿ.',
    },
}
for lang, fixes in FIX.items():
    p = f'src/locales/{lang}.json'
    d = load(p)
    for k, v in fixes.items():
        setkey(d, k, v)
    json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    changes[lang] = len(fixes)
print('explicit fixes', changes)

# ---------- polite-form pass for ta and te
TA = r'(?<![஀-௿])'
TA_END = r'(?![஀-௿])'
ta_pairs = [
    ('செய்', 'செய்யுங்கள்'), ('திரும்பு', 'திரும்புங்கள்'), ('பகிர்', 'பகிருங்கள்'), ('வெளியேறு', 'வெளியேறுங்கள்'),
    ('நகலெடு', 'நகலெடுங்கள்'), ('அனுப்பு', 'அனுப்புங்கள்'), ('சேமி', 'சேமியுங்கள்'), ('உள்நுழை', 'உள்நுழையுங்கள்'),
    ('மறை', 'மறைக்கவும்'), ('உருவாக்கு', 'உருவாக்குங்கள்'), ('காட்டு', 'காட்டுங்கள்'), ('திருத்து', 'திருத்துங்கள்'),
    ('பதிவிறக்கு', 'பதிவிறக்குங்கள்'), ('அழி', 'அழிக்கவும்'), ('உறுதிசெய்', 'உறுதிசெய்யுங்கள்'),
    ('பாவனை செய்', 'பாவனை செய்யுங்கள்'),
]
TE = r'(?<![ఀ-౿])'
TE_END = r'(?![ఀ-౿])'
te_pairs = [
    ('చేయి', 'చేయండి'), ('విశ్లేషించు', 'విశ్లేషించండి'), ('పంపు', 'పంపండి'), ('సృష్టించు', 'సృష్టించండి'),
    ('చూపు', 'చూపండి'), ('సవరించు', 'సవరించండి'), ('దాచు', 'దాచండి'), ('అనుకరించు', 'అనుకరించండి'),
    ('నిర్ధారించు', 'నిర్ధారించండి'),
]
SPECIAL = {
    'ta': [('கண்டறி · ஆராய் · நீயாக இரு', 'கண்டறியுங்கள் · ஆராயுங்கள் · நீங்களாக இருங்கள்')],
    'te': [],
}

def run(lang, pairs, pre, post):
    p = f'src/locales/{lang}.json'
    d = load(p)
    counted = {}
    def fn(key, v):
        if key.startswith('meta.'):
            return v
        nv = v
        for a, b in SPECIAL[lang]:
            nv = nv.replace(a, b)
        for a, b in pairs:
            nv = re.sub(pre + re.escape(a) + post, b, nv)
        if nv != v:
            counted[key] = (v, nv)
        return nv
    walk(d, fn)
    json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    return counted

ta = run('ta', ta_pairs, TA, TA_END)
te = run('te', te_pairs, TE, TE_END)
print('polite ta', len(ta), 'te', len(te))
for lang, c in (('ta', ta), ('te', te)):
    for k, (a, b) in list(c.items())[:80]:
        print(f'  {lang} {k}: {a}  ->  {b}')

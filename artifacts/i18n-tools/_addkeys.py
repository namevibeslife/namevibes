import re,json
T={'en':("State/Province (optional)","State / region (optional)"),
'hi':("राज्य/प्रांत (वैकल्पिक)","राज्य / क्षेत्र (वैकल्पिक)"),
'ta':("மாநிலம்/மாகாணம் (விருப்பத்திற்குரியது)","மாநிலம் / பகுதி (விருப்பத்திற்குரியது)"),
'te':("రాష్ట్రం/ప్రావిన్స్ (ఐచ్ఛికం)","రాష్ట్రం / ప్రాంతం (ఐచ్ఛికం)"),
'kn':("ರಾಜ್ಯ/ಪ್ರಾಂತ್ಯ (ಐಚ್ಛಿಕ)","ರಾಜ್ಯ / ಪ್ರದೇಶ (ಐಚ್ಛಿಕ)"),
'ml':("സംസ്ഥാനം/പ്രവിശ്യ (ഓപ്ഷണൽ)","സംസ്ഥാനം / പ്രദേശം (ഓപ്ഷണൽ)")}
for l,(a,b) in T.items():
    p=f'src/locales/{l}.json'
    s=open(p,encoding='utf-8',newline='').read()
    nl='\r\n' if '\r\n' in s else '\n'
    s,n1=re.subn(r'(\n    "selectState": [^\n]*\n)', lambda m:m.group(1)+'    "stateOptional": '+json.dumps(b,ensure_ascii=False)+','+nl if False else m.group(1), s)
    # insert after selectState line
    s=re.sub(r'(    "selectState": [^\r\n]*)(\r?\n)', lambda m:m.group(1)+m.group(2)+'    "stateOptional": '+json.dumps(b,ensure_ascii=False)+','+m.group(2), s,1)
    s=re.sub(r'(    "state": [^\r\n]*)(\r?\n)', lambda m:m.group(1)+m.group(2)+'    "stateOptional": '+json.dumps(a,ensure_ascii=False)+','+m.group(2), s,1)
    open(p,'w',encoding='utf-8',newline='').write(s); json.loads(s)

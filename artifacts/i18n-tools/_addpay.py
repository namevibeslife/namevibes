import re,json
T={'en':("Payments are not available for your country yet. Please contact support and we will let you know when they open.","Gateway that would be used: {{gateway}}"),
'hi':("आपके देश के लिए भुगतान अभी उपलब्ध नहीं हैं। कृपया सहायता से संपर्क करें; शुरू होने पर हम आपको बताएँगे।","उपयोग होने वाला गेटवे: {{gateway}}"),
'ta':("உங்கள் நாட்டிற்கு கட்டணம் செலுத்தும் வசதி இன்னும் இல்லை. தயவுசெய்து உதவியைத் தொடர்புகொள்ளுங்கள்; தொடங்கியதும் உங்களுக்குத் தெரிவிப்போம்.","பயன்படுத்தப்படும் கட்டண வழி: {{gateway}}"),
'te':("మీ దేశానికి చెల్లింపులు ఇంకా అందుబాటులో లేవు. దయచేసి సహాయాన్ని సంప్రదించండి; ప్రారంభమైనప్పుడు మీకు తెలియజేస్తాము.","ఉపయోగించబడే గేట్‌వే: {{gateway}}"),
'kn':("ನಿಮ್ಮ ದೇಶಕ್ಕೆ ಪಾವತಿಗಳು ಇನ್ನೂ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಬೆಂಬಲವನ್ನು ಸಂಪರ್ಕಿಸಿ; ಆರಂಭವಾದಾಗ ನಿಮಗೆ ತಿಳಿಸುತ್ತೇವೆ.","ಬಳಸಲಾಗುವ ಗೇಟ್‌ವೇ: {{gateway}}"),
'ml':("നിങ്ങളുടെ രാജ്യത്തിന് പേയ്‌മെന്റുകൾ ഇതുവരെ ലഭ്യമല്ല. ദയവായി പിന്തുണയെ ബന്ധപ്പെടൂ; ആരംഭിക്കുമ്പോൾ ഞങ്ങൾ അറിയിക്കാം.","ഉപയോഗിക്കുന്ന ഗേറ്റ്‌വേ: {{gateway}}")}
for l,(a,b) in T.items():
    p=f'src/locales/{l}.json'
    s=open(p,encoding='utf-8',newline='').read()
    s=re.sub(r'(    "securePowered": [^\r\n]*)(\r?\n)', lambda m:m.group(1)+m.group(2)+'    "unavailable": '+json.dumps(a,ensure_ascii=False)+','+m.group(2)+'    "mockGateway": '+json.dumps(b,ensure_ascii=False)+','+m.group(2), s, count=1)
    open(p,'w',encoding='utf-8',newline='').write(s); json.loads(s)

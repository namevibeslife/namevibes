import json

def get(d, k):
    for p in k.split('.'):
        d = d[p]
    return d

def setk(d, k, v):
    ps = k.split('.')
    for p in ps[:-1]:
        d = d[p]
    d[ps[-1]] = v

def apply(lang, changes):
    p = f'src/locales/{lang}.json'
    d = json.load(open(p, encoding='utf-8'))
    for k, v in changes.items():
        old = get(d, k)
        print(f'{lang} {k}\n   - {old}\n   + {v}')
        setk(d, k, v)
    json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(lang, len(changes), 'strings changed\n')

ML = {
 'numerology.interpretation.1': 'നേതൃത്വം, സ്വാതന്ത്ര്യം, നവീനത. നിങ്ങൾ സ്വാഭാവികമായി മുൻനിരയിൽ നിൽക്കുന്നവരാണ്.',
 'numerology.meaning.1.destiny': 'സ്വാഭാവിക നേതൃത്വം, സ്വാതന്ത്ര്യം, അഭിലാഷം. പുതിയ വഴികൾ വെട്ടിത്തുറക്കാനാണ് നിങ്ങൾ ജനിച്ചത്.',
 'numerology.meaning.1.personality': 'മറ്റുള്ളവർ നിങ്ങളെ ആത്മവിശ്വാസവും ദൃഢനിശ്ചയവും സ്വയംപര്യാപ്തതയുമുള്ള വ്യക്തിയായി കാണുന്നു.',
 'numerology.meaning.2.destiny': 'സമാധാനസ്ഥാപനം, നയതന്ത്രം, സഹകരണം. നിങ്ങൾ എല്ലാ സാഹചര്യങ്ങളിലും ഇണക്കം കൊണ്ടുവരുന്നു.',
 'numerology.meaning.2.personality': 'മറ്റുള്ളവർ നിങ്ങളെ സൗമ്യതയും നയചാതുര്യവും പിന്തുണയ്ക്കുന്ന സ്വഭാവവുമുള്ള വ്യക്തിയായി കാണുന്നു.',
 'numerology.meaning.3.destiny': 'സർഗാത്മക ആശയവിനിമയം, കല, വിനോദം. ആവിഷ്കാരത്തിലൂടെ നിങ്ങൾ പ്രചോദിപ്പിക്കുന്നു.',
 'numerology.meaning.3.personality': 'മറ്റുള്ളവർ നിങ്ങളെ ആകർഷകത്വവും സർഗാത്മകതയും ആവിഷ്കാരശേഷിയുമുള്ള വ്യക്തിയായി കാണുന്നു.',
 'numerology.meaning.4.destiny': 'നിർമാണം, ക്രമീകരണം, പ്രായോഗികത. നിങ്ങൾ സ്ഥിരമായ അടിത്തറകൾ ഉണ്ടാക്കുന്നു.',
 'numerology.meaning.4.personality': 'മറ്റുള്ളവർ നിങ്ങളെ വിശ്വസനീയതയും കഠിനാധ്വാനവും ഉറച്ച നിലപാടുമുള്ള വ്യക്തിയായി കാണുന്നു.',
 'numerology.meaning.5.destiny': 'സ്വാതന്ത്ര്യാന്വേഷണം, സാഹസികത, മാറ്റത്തിന്റെ വാഹകത്വം. നിങ്ങൾ വൈവിധ്യത്തിൽ തഴച്ചുവളരുന്നു.',
 'numerology.meaning.5.personality': 'മറ്റുള്ളവർ നിങ്ങളെ ചലനാത്മകതയും സാഹസികതയും പ്രവചിക്കാനാവാത്ത സ്വഭാവവുമുള്ള വ്യക്തിയായി കാണുന്നു.',
 'numerology.meaning.6.destiny': 'പരിപോഷണം, പരിചരണം, അധ്യാപനം. നിങ്ങൾ ഇണക്കവും സൗന്ദര്യവും സൃഷ്ടിക്കുന്നു.',
 'numerology.meaning.6.personality': 'മറ്റുള്ളവർ നിങ്ങളെ കരുതലും ഉത്തരവാദിത്തവും പിന്തുണയ്ക്കുന്ന മനസ്സുമുള്ള വ്യക്തിയായി കാണുന്നു.',
 'numerology.meaning.7.destiny': 'അന്വേഷണം, വിശകലനം, നിഗൂഢജ്ഞാനം. നിങ്ങൾ ആഴമേറിയ സത്യങ്ങൾ തേടുന്നു.',
 'numerology.meaning.7.personality': 'മറ്റുള്ളവർ നിങ്ങളെ നിഗൂഢതയും ബൗദ്ധികതയും അന്തർമുഖത്വവുമുള്ള വ്യക്തിയായി കാണുന്നു.',
 'numerology.meaning.8.destiny': 'ശക്തികേന്ദ്രം, നിർവഹണശേഷി, സാക്ഷാത്കാരം. നിങ്ങൾ ഭൗതിക വിജയം കൈവരിക്കുന്നു.',
 'numerology.meaning.8.personality': 'മറ്റുള്ളവർ നിങ്ങളെ ശക്തിയും അഭിലാഷവും അധികാരഭാവവുമുള്ള വ്യക്തിയായി കാണുന്നു.',
 'numerology.meaning.9.destiny': 'മാനവികത, അധ്യാപനം, രോഗശാന്തി. നിങ്ങൾ മനുഷ്യരാശിയെ സേവിക്കുന്നു.',
 'numerology.meaning.9.personality': 'മറ്റുള്ളവർ നിങ്ങളെ കരുണയും ജ്ഞാനവും നിസ്വാർഥതയുമുള്ള വ്യക്തിയായി കാണുന്നു.',
 'numerology.meaning.11.destiny': 'മാസ്റ്റർ ഗുരുത്വം, ആത്മീയ സന്ദേശം. നിങ്ങൾ പ്രചോദിപ്പിക്കുകയും പ്രകാശിപ്പിക്കുകയും ചെയ്യുന്നു.',
 'numerology.meaning.11.personality': 'മറ്റുള്ളവർ നിങ്ങളെ പ്രചോദനവും ആത്മീയ കഴിവുമുള്ള വ്യക്തിയായി കാണുന്നു.',
 'numerology.meaning.22.destiny': 'മാസ്റ്റർ നിർമാണം. നിങ്ങൾ വലിയ തോതിൽ സ്വപ്നങ്ങളെ യാഥാർഥ്യമാക്കുന്നു.',
 'numerology.meaning.22.personality': 'അസാധ്യമായത് നേടാൻ കഴിവുള്ള വ്യക്തിയായി മറ്റുള്ളവർ നിങ്ങളെ കാണുന്നു.',
 'numerology.meaning.33.destiny': 'മാസ്റ്റർ ഗുരുത്വം, രോഗശാന്തിയുടെ രോഗശാന്തി. നിങ്ങൾ മനുഷ്യരാശിയെ ഉയർത്തുന്നു.',
 'zodiac.western.aries.traits': 'ധീരത, അഭിലാഷം, ആത്മവിശ്വാസം, ഊർജസ്വലത',
 'zodiac.western.taurus.traits': 'വിശ്വസ്തത, ക്ഷമ, പ്രായോഗികത, അർപ്പണബോധം',
 'zodiac.western.gemini.traits': 'ജിജ്ഞാസ, പൊരുത്തപ്പെടൽ, ആശയവിനിമയശേഷി, നർമബോധം',
 'zodiac.western.cancer.traits': 'പരിപോഷണ സ്വഭാവം, അന്തർജ്ഞാനം, വൈകാരികത, സംരക്ഷണ മനോഭാവം',
 'zodiac.western.virgo.traits': 'വിശകലനശേഷി, പ്രായോഗികത, പൂർണതാവാദം, സഹായമനസ്കത',
 'zodiac.western.libra.traits': 'നയതന്ത്രം, നീതിബോധം, സാമൂഹികത, ഇണക്കം',
 'zodiac.western.scorpio.traits': 'വികാരതീവ്രത, നിഗൂഢത, തീവ്രത, പരിവർത്തനശേഷി',
 'zodiac.western.sagittarius.traits': 'ശുഭാപ്തിവിശ്വാസം, സാഹസികത, തത്ത്വചിന്ത, സ്വാതന്ത്ര്യം',
 'zodiac.western.capricorn.traits': 'അച്ചടക്കം, അഭിലാഷം, ഉത്തരവാദിത്തം, ക്ഷമ',
 'zodiac.western.aquarius.traits': 'സ്വാതന്ത്ര്യബോധം, നൂതനചിന്ത, മാനവികത, വിചിത്രത',
 'zodiac.western.pisces.traits': 'കരുണ, കലാഹൃദയം, അന്തർജ്ഞാനം, സംവേദനക്ഷമത',
 'zodiac.vedic.meshaAries.traits': 'ധീരത, അഭിലാഷം, യോദ്ധാവിന്റെ മനോഭാവം, നേതൃത്വം',
 'zodiac.vedic.vrishabhaTaurus.traits': 'സ്ഥിരചിത്തത, പ്രായോഗികത, കലാഹൃദയം, ആഡംബരപ്രിയത',
 'zodiac.vedic.mithunaGemini.traits': 'ബുദ്ധി, ആശയവിനിമയശേഷി, ദ്വന്ദ്വ സ്വഭാവം',
 'zodiac.vedic.karkaCancer.traits': 'വൈകാരികത, പരിപോഷണ സ്വഭാവം, സംരക്ഷണ മനോഭാവം, അന്തർജ്ഞാനം',
 'zodiac.vedic.kanyaVirgo.traits': 'വിശകലനശേഷി, പൂർണതാവാദം, സേവനമനോഭാവം',
 'zodiac.vedic.tulaLibra.traits': 'സന്തുലിതത്വം, നയതന്ത്രം, കലാഹൃദയം, നീതിബോധം',
 'zodiac.vedic.vrishchikaScorpio.traits': 'തീവ്രത, രഹസ്യസ്വഭാവം, പരിവർത്തനശേഷി, ശക്തി',
 'zodiac.vedic.dhanuSagittarius.traits': 'തത്ത്വചിന്ത, ശുഭാപ്തിവിശ്വാസം, ആത്മീയത, സത്യസന്ധത',
 'zodiac.vedic.makaraCapricorn.traits': 'അച്ചടക്കം, കഠിനാധ്വാനം, അഭിലാഷം, പ്രായോഗികത',
 'zodiac.vedic.kumbhaAquarius.traits': 'മാനവികത, നൂതനചിന്ത, പാരമ്പര്യേതരത്വം',
 'zodiac.vedic.meenaPisces.traits': 'കരുണ, ആത്മീയത, കലാഹൃദയം, അന്തർജ്ഞാനം',
}
TE = {
 'numerology.meaning.1.destiny': 'సహజ నాయకత్వం, స్వతంత్రత, ఆశయం. కొత్త మార్గాలను నిర్మించడానికే మీరు పుట్టారు.',
 'numerology.meaning.2.destiny': 'శాంతి స్థాపన, దౌత్యం, సహకారం. మీరు ప్రతి సందర్భంలో సామరస్యాన్ని తెస్తారు.',
 'numerology.meaning.2.personality': 'ఇతరులు మిమ్మల్ని సౌమ్యత, చతురత గలవారిగా, తోడ్పాటునిచ్చేవారిగా చూస్తారు.',
 'numerology.meaning.3.destiny': 'సృజనాత్మక సంభాషణ, కళ, వినోదం. వ్యక్తీకరణ ద్వారా ప్రేరేపిస్తారు.',
 'numerology.meaning.3.personality': 'ఇతరులు మిమ్మల్ని ఆకర్షణ, సృజనాత్మకత, వ్యక్తీకరణ గలవారిగా చూస్తారు.',
 'numerology.meaning.4.destiny': 'నిర్మాణం, నిర్వహణ, ఆచరణాత్మకత. మీరు స్థిరమైన పునాదులను నిర్మిస్తారు.',
 'numerology.meaning.5.destiny': 'స్వేచ్ఛాన్వేషణ, సాహసం, మార్పును నడిపించే శక్తి. మీరు వైవిధ్యంలో వర్ధిల్లుతారు.',
 'numerology.meaning.5.personality': 'ఇతరులు మిమ్మల్ని చైతన్యం, సాహసం గలవారిగా, ఊహించలేనివారిగా చూస్తారు.',
 'numerology.meaning.6.destiny': 'పోషణ, సంరక్షణ, బోధన. మీరు సామరస్యాన్ని, అందాన్ని సృష్టిస్తారు.',
 'numerology.meaning.7.destiny': 'అన్వేషణ, విశ్లేషణ, ఆధ్యాత్మిక చింతన. మీరు లోతైన సత్యాల కోసం వెతుకుతారు.',
 'numerology.meaning.7.personality': 'ఇతరులు మిమ్మల్ని రహస్యమైనవారిగా, మేధావులుగా, అంతర్ముఖులుగా చూస్తారు.',
 'numerology.meaning.8.destiny': 'శక్తికేంద్రం, కార్యనిర్వహణ, సాకారం. మీరు భౌతిక విజయాన్ని సాధిస్తారు.',
 'numerology.meaning.8.personality': 'ఇతరులు మిమ్మల్ని శక్తి, ఆశయం, అధికారం గలవారిగా చూస్తారు.',
 'numerology.meaning.9.destiny': 'మానవతావాదం, బోధన, నయం చేసే గుణం. మీరు మానవాళికి సేవ చేస్తారు.',
 'numerology.meaning.9.personality': 'ఇతరులు మిమ్మల్ని కరుణామయులుగా, జ్ఞానులుగా, నిస్వార్థపరులుగా చూస్తారు.',
 'numerology.meaning.11.destiny': 'మాస్టర్ గురుత్వం, ఆధ్యాత్మిక సందేశం. మీరు ప్రేరేపించి వెలుగునిస్తారు.',
 'numerology.meaning.11.personality': 'ఇతరులు మిమ్మల్ని స్ఫూర్తిదాయకులుగా, ఆధ్యాత్మిక ప్రతిభ గలవారిగా చూస్తారు.',
 'numerology.meaning.33.destiny': 'మాస్టర్ గురుత్వం, నయం చేసేవారిని నయం చేసే శక్తి. మీరు మానవాళిని ఉన్నతీకరిస్తారు.',
}
apply('ml', ML)
apply('te', TE)

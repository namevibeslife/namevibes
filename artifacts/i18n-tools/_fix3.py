import json
def get(d,k):
    for p in k.split('.'): d=d[p]
    return d
def setk(d,k,v):
    ps=k.split('.')
    for p in ps[:-1]: d=d[p]
    d[ps[-1]]=v
def apply(path, changes):
    d=json.load(open(path,encoding='utf-8'))
    for k,fn in changes.items():
        old=get(d,k); new=fn(old) if callable(fn) else fn
        print(f'{path.split("/")[-1]} {k}\n   - {old}\n   + {new}')
        setk(d,k,new)
    json.dump(d,open(path,'w',encoding='utf-8'),ensure_ascii=False,indent=2)
rep=lambda a,b:(lambda s:s.replace(a,b))
apply('src/locales/ml.json',{
 'numerology.interpretation.1':rep('മുൻഗാമിയാണ്','മുൻനിരക്കാരനാണ്'),
 'results.atomicNumber':rep('അറ്റോമിക','ആറ്റോമിക'),
 'results.atomicNumberValue':rep('അറ്റോമിക','ആറ്റോമിക'),
 'learn.science3':rep('പേര് രസതന്ത്ര ഒപ്പ്','പേരിന്റെ രസതന്ത്ര ഒപ്പ്'),
 'profileComplete.other':'മറ്റുള്ളവർ',
})
apply('src/locales/ta.json',{'common.notAvailable':'பொருந்தாது','settings.support':'உதவி:'})
apply('src/locales/te.json',{'numerology.interpretation.1':rep('సహజ మార్గదర్శకులు','సహజ అగ్రగాములు')})
apply('src/locales/content/te.json',{'elements.Cd':'ప్రకాశవంతమైన రంగు, శక్తి, జాగ్రత్త','elements.Yb':'ఖచ్చితత్వం, స్థిరత, యథార్థత'})
apply('src/locales/hi.json',{'download.altSingle':'{{name}} का शेयर पोस्टर','poster.footerSingle':'नाम से कहीं बढ़कर। एक बेहतर आप।'})

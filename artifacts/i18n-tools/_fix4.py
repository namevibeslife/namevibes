import json
def get(d,k):
    for p in k.split('.'): d=d[p]
    return d
def setk(d,k,v):
    ps=k.split('.')
    for p in ps[:-1]: d=d[p]
    d[ps[-1]]=v
def apply(lang,fixes):
    p=f'src/locales/{lang}.json'; d=json.load(open(p,encoding='utf-8'))
    for k,(a,b) in fixes.items():
        old=get(d,k); assert a in old,(k,a)
        new=old.replace(a,b); print(f'{lang} {k}\n   - {old}\n   + {new}'); setk(d,k,new)
    json.dump(d,open(p,'w',encoding='utf-8'),ensure_ascii=False,indent=2)
apply('ml',{
 'insights.n069':('ക്ഷാരീയ മൃണ്ണ് ലോഹങ്ങൾ','ആൽക്കലൈൻ എർത്ത് ലോഹങ്ങൾ'),
 'insights.n092':('അപൂർവ മൃണ്ണ് മൂലകങ്ങളും','അപൂർവ ഭൗമ മൂലകങ്ങളും'),
 'numerology.meaning.33.destiny':('രോഗശാന്തിയുടെ രോഗശാന്തി','രോഗശാന്തിക്കാരെ സുഖപ്പെടുത്തുന്ന ശക്തി'),
 'followers.status.pending':('ബാക്കി','തീർപ്പാകാത്തത്'),
 'ambassador.section.bankComplianceDetails':('പാലന വിവരങ്ങൾ','നിയമപരമായ വിവരങ്ങൾ'),
 'hora.duration':('{{h}} മ {{m}} മി','{{h}} മണിക്കൂർ {{m}} മി'),
 'insights.n136':('മുൻനിര','മുൻകൈയെടുക്കൽ'),
 'insights.n167':('ഭൗതികവാദം','ഭൗതിക സുഖാസക്തി'),
})
apply('te',{
 'insights.n136':('మార్గదర్శకత్వం','ముందడుగు వేసే గుణం'),
 'insights.n167':('భౌతికవాదం','భౌతిక సుఖాసక్తి'),
})

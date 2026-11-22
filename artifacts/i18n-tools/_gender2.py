import json
def walk(o,fn,path=''):
    for k,v in o.items():
        if isinstance(v,dict): walk(v,fn,path+k+'.')
        else:
            nv=fn(path+k,v)
            if nv!=v: print(f'   {path+k}\n     - {v}\n     + {nv}'); o[k]=nv
def sub(lang,a,b):
    p=f'src/locales/{lang}.json'; d=json.load(open(p,encoding='utf-8'))
    print(lang,a,'->',b)
    walk(d,lambda k,v:v.replace(a,b))
    json.dump(d,open(p,'w',encoding='utf-8'),ensure_ascii=False,indent=2)
sub('ml','വൈദഗ്ധ്യമുള്ള കൈകൾ, ബുദ്ധിമാൻ, നൈപുണ്യമുള്ള','വൈദഗ്ധ്യമുള്ള കൈകൾ, ബുദ്ധിശക്തി, നൈപുണ്യം')
sub('te','వ్యాపారవేత్తృత్వం','పారిశ్రామికత')
sub('hi','सहज-बोध वाला','अंतर्ज्ञानी')
sub('ta','இளநீலம்','இளஊதா')
sub('ta','தகவமைக்கும்','தகவமைத்துக்கொள்ளும்')

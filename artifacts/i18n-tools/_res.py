import re
def sub(path, fn):
    s=open(path,encoding='utf-8',newline='').read()
    pat=re.compile(r'<<<<<<< HEAD\r?\n(.*?)=======\r?\n(.*?)>>>>>>> country-picker\r?\n',re.S)
    i=[0]
    def r(m):
        i[0]+=1; return fn(i[0],m.group(1),m.group(2))
    s=pat.sub(r,s); open(path,'w',encoding='utf-8',newline='').write(s)
def f(p): return p
# Followers
sub('src/components/AmbassadorFollowers.jsx', lambda n,a,b: a.replace("import { CURRENCY_SYMBOLS, COUNTRIES }","import { CURRENCY_SYMBOLS, getCountry }"))
# profile
def prof(n,a,b):
    if n==1: return a.replace("import { COUNTRIES } from '../data/countries';","import { getCountry } from '../data/countries';")
    return a.replace("COUNTRIES[value]?.name","getCountry(value)?.name")
sub('src/utils/ambassadorProfile.js', prof)
def det(n,a,b):
    if n==1: return a.replace("import { COUNTRIES } from '../data/countries';","import { ALL_COUNTRIES, getCountry } from '../data/countries';")
    return ("      control = <select {...common}><option value=\"\">{t('ambassador.selectCountry')}</option>\n"
"        {Object.values(ALL_COUNTRIES).sort((x, y) => x.name.localeCompare(y.name)).map(c => <option key={c.code} value={c.code}>{countryLabel(c.code, c.name)}</option>)}</select>;\n"
"    } else if (type === 'state') {\n"
"      const states = getCountry(data.countryCode)?.states || [];\n"
"      control = states.length || !data.countryCode\n"
"        ? <select {...common} disabled={!data.countryCode}><option value=\"\">{t('ambassador.selectState')}</option>\n"
"          {states.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select>\n"
"        : <input {...common} required={false} type=\"text\" placeholder={t('ambassador.stateOptional', { defaultValue: 'State / region (optional)' })} />;\n")
sub('src/components/AmbassadorDetailsForm.jsx', det)

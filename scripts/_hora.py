from importlib.machinery import SourceFileLoader
X = SourceFileLoader('x', 'scripts/i18n-extract.py').load_module()

p = 'src/pages/HoraMuhurat.jsx'
s = open(p, encoding='utf-8').read()
def rep(a, b):
    global s
    assert a in s, a[:80]
    s = s.replace(a, b)

# keep the time helper, rename it so `t` is the translator
rep("const t = setInterval(() => setNow(Date.now()), 30000);\n    return () => clearInterval(t);", "const timer = setInterval(() => setNow(Date.now()), 30000);\n    return () => clearInterval(timer);")
rep("const t = (ms) => formatTime(ms, tz);\n  const range = (p) => `${t(p.start)} – ${t(p.end)}`;", "const ft = (ms) => formatClock(ms, tz);\n  const range = (p) => `${ft(p.start)} – ${ft(p.end)}`;")
s = s.replace("{t(data.sunrise)}", "{ft(data.sunrise)}").replace("{t(data.sunset)}", "{ft(data.sunset)}")
rep("import {\n  computePanchang, currentVedicDate, findCurrent, formatTime, WEEKDAYS,\n} from '../utils/panchangEngine';", "import {\n  computePanchang, currentVedicDate, findCurrent,\n} from '../utils/panchangEngine';\nimport { useTranslation } from 'react-i18next';\nimport { formatClock } from '../i18n/format';")

# data tables -> keys
start = s.index("const HORA_NOTES = {")
end = s.index("};", start) + 3
s = s[:start] + "const HORA_NOTE_KEYS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];\n" + s[end:]
rep("const CHOG_LABEL = { best: 'Best', good: 'Good', avoid: 'Avoid' };\n", "")
rep("function Window({ label, note, range, tone, active }) {\n", "function Window({ label, note, range, tone, active }) {\n  const { t } = useTranslation();\n")
rep("· Now</span>", "· {t('hora.now')}</span>")
rep("export default function HoraMuhurat() {\n", "export default function HoraMuhurat() {\n  const { t } = useTranslation();\n  const note = (lord) => t(`hora.note.${lord}`);\n  const planet = (lord) => t(`hora.planet.${lord}`);\n  const chogName = (name) => t(`hora.chog.${name}`);\n  const quality = (q) => t(`hora.quality.${q}`);\n")
rep("const placeName = custom ? 'Your location' : city.name;", "const placeName = custom ? t('hora.yourLocation') : city.name;")
rep("setGeoError('Location is not available in this browser.')", "setGeoError(t('hora.geoUnavailable'))")
rep("setGeoError('Could not read your location. Please choose a city instead.')", "setGeoError(t('hora.geoFailed'))")
rep("<h2 className=\"text-3xl font-bold text-gray-800 mb-1\">Today&apos;s Hora &amp; Muhurat</h2>", "<h2 className=\"text-3xl font-bold text-gray-800 mb-1\">{t('dashboard.horaTitle')}</h2>")
rep("Your daily guide to traditional Vedic timings, calculated for your location from local sunrise and sunset.", "{t('hora.intro')}")
rep("<MapPin size={14} /> Location", "<MapPin size={14} /> {t('hora.location')}")
rep(">Your location</option>}", ">{t('hora.yourLocation')}</option>}")
rep("{['India', 'Around the world'].map((g) => (\n                  <optgroup key={g} label={g}>", "{['India', 'Around the world'].map((g) => (\n                  <optgroup key={g} label={g === 'India' ? t('hora.groupIndia') : t('hora.groupWorld')}>")
rep("mb-1 block\">Date</span>", "mb-1 block\">{t('hora.date')}</span>")
rep("                Today\n              </button>", "                {t('hora.today')}\n              </button>")
rep("<Navigation size={14} /> Near me", "<Navigation size={14} /> {t('hora.nearMe')}")
rep("Your location is used only in your browser to calculate sunrise and sunset. It is not stored.", "{t('hora.privacy')}")
rep("              The sun does not rise or set on this date at this location, so the daily timings cannot be calculated.\n              Please choose another location.", "              {t('hora.noSun')}")
rep("{WEEKDAYS[data.weekday]}, {dateStr} · {placeName}", "{t(`hora.weekday.${data.weekday}`)}, {dateStr} · {placeName}")
rep("Ruled by {data.dayLord}", "{t('hora.ruledBy', { planet: planet(data.dayLord) })}")
rep("<p className=\"text-xs text-gray-600\">Sunrise</p>", "<p className=\"text-xs text-gray-600\">{t('hora.sunrise')}</p>")
rep("<p className=\"text-xs text-gray-600\">Sunset</p>", "<p className=\"text-xs text-gray-600\">{t('hora.sunset')}</p>")
rep("<p className=\"text-xs text-gray-600\">Daylight</p>", "<p className=\"text-xs text-gray-600\">{t('hora.daylight')}</p>")
rep("{Math.floor(data.dayLengthMin / 60)}h {Math.round(data.dayLengthMin % 60)}m", "{t('hora.duration', { h: Math.floor(data.dayLengthMin / 60), m: Math.round(data.dayLengthMin % 60) })}")
rep("mt-7\">One muhurta</p>", "mt-7\">{t('hora.oneMuhurta')}</p>")
rep("{Math.round(data.muhurtaMin)} min</p>", "{t('hora.minutes', { count: Math.round(data.muhurtaMin) })}</p>")
rep("uppercase tracking-widest font-semibold\">Current hora</p>", "uppercase tracking-widest font-semibold\">{t('hora.currentHora')}</p>")
rep("{data.horas[curHora].lord}\n                </p>", "{planet(data.horas[curHora].lord)}\n                </p>")
rep("{range(data.horas[curHora])} · {HORA_NOTES[data.horas[curHora].lord]}", "{range(data.horas[curHora])} · {note(data.horas[curHora].lord)}")
rep("Choghadiya now: <strong>{data.choghadiya[curChog].name}</strong> ({CHOG_LABEL[data.choghadiya[curChog].quality]})", "{t('hora.choghadiyaNow')} <strong>{chogName(data.choghadiya[curChog].name)}</strong> ({quality(data.choghadiya[curChog].quality)})")
rep("<Card title=\"Auspicious timings\">", "<Card title={t('hora.auspicious')}>")
rep("label=\"Abhijit Muhurat\"", "label={t('hora.abhijit')}")
rep("note=\"Around local midday, traditionally favourable\"", "note={t('hora.abhijitNote')}")
rep("Abhijit Muhurat: not used today</p>", "{t('hora.abhijitOff')}</p>")
rep("On Wednesdays this midday slot ({range(data.abhijit)}) is not treated as auspicious.", "{t('hora.abhijitOffNote', { range: range(data.abhijit) })}")
rep("label=\"Brahma Muhurta\" range={range(data.brahma)} note=\"Before dawn, traditionally for prayer and meditation\"", "label={t('hora.brahma')} range={range(data.brahma)} note={t('hora.brahmaNote')}")
rep("<Card title=\"Timings to avoid\">", "<Card title={t('hora.avoid')}>")
rep("label=\"Rahu Kalam\"", "label={t('hora.rahu')}")
rep("label=\"Yamagandam\"", "label={t('hora.yamagandam')}")
rep("label=\"Gulika Kalam\"", "label={t('hora.gulika')}")
rep("label={`Dur Muhurat${d.isDay ? '' : ' (night)'}`}", "label={d.isDay ? t('hora.durMuhurat') : t('hora.durMuhuratNight')}")
rep(">Dur Muhurat: coming soon.</p>", ">{t('hora.durSoon')}</p>")
rep("<Card title=\"24-hour planetary hora\">", "<Card title={t('hora.table24')}>")
rep("12 day horas from sunrise and 12 night horas from sunset. Notes are traditional associations.", "{t('hora.table24Note')}")
s = s.replace("{isDay ? 'Day' : 'Night'}</p>", "{isDay ? t('hora.day') : t('hora.night')}</p>")
rep("<span className=\"font-semibold text-gray-800\">{h.lord}</span>\n                          <span className=\"block text-xs text-gray-500\">{HORA_NOTES[h.lord]}</span>", "<span className=\"font-semibold text-gray-800\">{planet(h.lord)}</span>\n                          <span className=\"block text-xs text-gray-500\">{note(h.lord)}</span>")
rep("<Card title=\"Choghadiya\">", "<Card title={t('hora.choghadiya')}>")
rep("{c.name} <span className=\"text-xs font-normal\">({CHOG_LABEL[c.quality]})</span>", "{chogName(c.name)} <span className=\"text-xs font-normal\">({quality(c.quality)})</span>")
rep("          Timings follow the Vedic day (sunrise to sunrise) at the selected location and use the common\n          north- and south-Indian calculation rules. Regional almanacs can differ by a few minutes. Tithi, Nakshatra\n          and Yoga will be added later. For guidance and tradition only.", "          {t('hora.disclaimer')}")
open(p, 'w', encoding='utf-8').write(s)

planets = {'Sun': 'Sun', 'Moon': 'Moon', 'Mars': 'Mars', 'Mercury': 'Mercury', 'Jupiter': 'Jupiter', 'Venus': 'Venus', 'Saturn': 'Saturn'}
notes = {'Sun': 'Authority, government work, health', 'Moon': 'Travel, creativity, family matters', 'Mars': 'Courage and action; avoid disputes', 'Mercury': 'Business, learning, communication', 'Jupiter': 'Teaching, finance, auspicious beginnings', 'Venus': 'Arts, relationships, purchases', 'Saturn': 'Slow, long-term and routine work'}
weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
add = [(f'hora.planet.{k}', v) for k, v in planets.items()] + [(f'hora.note.{k}', v) for k, v in notes.items()]
add += [(f'hora.weekday.{i}', d) for i, d in enumerate(weekdays)]
add += [(f'hora.chog.{n}', n) for n in ['Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog']]
add += [('hora.quality.best', 'Best'), ('hora.quality.good', 'Good'), ('hora.quality.avoid', 'Avoid')]
add += [
('hora.now', 'Now'), ('hora.yourLocation', 'Your location'), ('hora.geoUnavailable', 'Location is not available in this browser.'),
('hora.geoFailed', 'Could not read your location. Please choose a city instead.'),
('hora.intro', 'Your daily guide to traditional Vedic timings, calculated for your location from local sunrise and sunset.'),
('hora.location', 'Location'), ('hora.groupIndia', 'India'), ('hora.groupWorld', 'Around the world'), ('hora.date', 'Date'),
('hora.today', 'Today'), ('hora.nearMe', 'Near me'),
('hora.privacy', 'Your location is used only in your browser to calculate sunrise and sunset. It is not stored.'),
('hora.noSun', 'The sun does not rise or set on this date at this location, so the daily timings cannot be calculated. Please choose another location.'),
('hora.ruledBy', 'Ruled by {{planet}}'), ('hora.sunrise', 'Sunrise'), ('hora.sunset', 'Sunset'), ('hora.daylight', 'Daylight'),
('hora.duration', '{{h}}h {{m}}m'), ('hora.oneMuhurta', 'One muhurta'), ('hora.minutes_one', '{{count}} min'), ('hora.minutes_other', '{{count}} min'),
('hora.currentHora', 'Current hora'), ('hora.choghadiyaNow', 'Choghadiya now:'),
('hora.auspicious', 'Auspicious timings'), ('hora.abhijit', 'Abhijit Muhurat'), ('hora.abhijitNote', 'Around local midday, traditionally favourable'),
('hora.abhijitOff', 'Abhijit Muhurat: not used today'), ('hora.abhijitOffNote', 'On Wednesdays this midday slot ({{range}}) is not treated as auspicious.'),
('hora.brahma', 'Brahma Muhurta'), ('hora.brahmaNote', 'Before dawn, traditionally for prayer and meditation'),
('hora.avoid', 'Timings to avoid'), ('hora.rahu', 'Rahu Kalam'), ('hora.yamagandam', 'Yamagandam'), ('hora.gulika', 'Gulika Kalam'),
('hora.durMuhurat', 'Dur Muhurat'), ('hora.durMuhuratNight', 'Dur Muhurat (night)'), ('hora.durSoon', 'Dur Muhurat: coming soon.'),
('hora.table24', '24-hour planetary hora'), ('hora.table24Note', '12 day horas from sunrise and 12 night horas from sunset. Notes are traditional associations.'),
('hora.day', 'Day'), ('hora.night', 'Night'), ('hora.choghadiya', 'Choghadiya'),
('hora.disclaimer', 'Timings follow the Vedic day (sunrise to sunrise) at the selected location and use the common north- and south-Indian calculation rules. Regional almanacs can differ by a few minutes. Tithi, Nakshatra and Yoga will be added later. For guidance and tradition only.'),
]
X.add(add)
s = X.hook(open(p, encoding='utf-8').read(), [])
# formatClock
f = open('src/i18n/format.js', encoding='utf-8').read()
if 'formatClock' not in f:
    f += """
// Clock time in a named time zone (the place the timings are calculated for), in the selected language
export function formatClock(ms, timeZone, lang = i18n.language) {
  try {
    const out = new Intl.DateTimeFormat(lang, { timeZone, hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(ms));
    return lang === 'en' ? out.toUpperCase() : out;
  } catch { return ''; }
}
"""
    open('src/i18n/format.js', 'w', encoding='utf-8').write(f)
print('ok')

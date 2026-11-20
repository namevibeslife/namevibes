import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Sunrise, Sunset, Clock, Navigation } from 'lucide-react';
import { PANCHANG_CITIES, DEFAULT_CITY_ID } from '../data/panchangCities';
import {
  computePanchang, currentVedicDate, findCurrent,
} from '../utils/panchangEngine';
import { useTranslation } from 'react-i18next';
import { formatClock } from '../i18n/format';

const GREEN = '#105717';

const HORA_NOTE_KEYS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

const CHOG_STYLE = {
  best: 'text-green-800 bg-green-600/10 border-green-700/40',
  good: 'text-brand-800 bg-brand-200/20 border-brand-300/50',
  avoid: 'text-red-800 bg-red-600/10 border-red-700/30',
};

const pad = (n) => String(n).padStart(2, '0');
const toInput = (d) => `${d.year}-${pad(d.month)}-${pad(d.day)}`;
const fromInput = (s) => {
  const [year, month, day] = s.split('-').map(Number);
  return { year, month, day };
};

function Card({ title, children, className = '' }) {
  return (
    <section className={`bg-transparent rounded-2xl border border-brand-200/60 p-5 ${className}`}>
      {title && <h3 className="text-xl font-bold text-gray-800 mb-3">{title}</h3>}
      {children}
    </section>
  );
}

function Window({ label, note, range, tone, active }) {
  const { t } = useTranslation();
  const color = tone === 'good' ? 'text-green-800' : 'text-red-800';
  return (
    <div className={`flex items-start justify-between gap-3 py-2 px-2 -mx-2 rounded-lg border-b border-brand-200/40 last:border-0 ${
      active ? 'bg-red-600/10 ring-1 ring-red-700/40' : ''
    }`}>
      <div>
        <p className={`font-semibold ${color}`}>
          {label}
          {active && <span className="ml-2 text-xs font-bold uppercase tracking-wide">· {t('hora.now')}</span>}
        </p>
        {note && <p className="text-xs text-gray-600 mt-0.5">{note}</p>}
      </div>
      <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">{range}</p>
    </div>
  );
}

export default function HoraMuhurat() {
  const { t } = useTranslation();
  const note = (lord) => t(`hora.note.${lord}`);
  const planet = (lord) => t(`hora.planet.${lord}`);
  const chogName = (name) => t(`hora.chog.${name}`);
  const quality = (q) => t(`hora.quality.${q}`);
  const [cityId, setCityId] = useState(DEFAULT_CITY_ID);
  const [custom, setCustom] = useState(null); // { lat, lon, tz } from the browser, kept in memory only
  const [geoError, setGeoError] = useState('');
  const [now, setNow] = useState(Date.now());

  const city = PANCHANG_CITIES.find((c) => c.id === cityId) || PANCHANG_CITIES[0];
  const place = custom ? { lat: custom.lat, lon: custom.lon } : { lat: city.lat, lon: city.lon };
  const tz = custom ? custom.tz : city.tz;
  const placeName = custom ? t('hora.yourLocation') : city.name;

  const [dateStr, setDateStr] = useState(() => toInput(currentVedicDate(
    { lat: city.lat, lon: city.lon }, city.tz,
  )));

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const resetToToday = (p, z) => setDateStr(toInput(currentVedicDate(p, z)));

  const onCity = (id) => {
    const c = PANCHANG_CITIES.find((x) => x.id === id);
    setCustom(null);
    setGeoError('');
    setCityId(id);
    resetToToday({ lat: c.lat, lon: c.lon }, c.tz);
  };

  const useMyLocation = () => {
    setGeoError('');
    if (!navigator.geolocation) { setGeoError(t('hora.geoUnavailable')); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
        setCustom(c);
        resetToToday({ lat: c.lat, lon: c.lon }, c.tz);
      },
      () => setGeoError(t('hora.geoFailed')),
      { timeout: 10000, maximumAge: 600000 },
    );
  };

  const data = useMemo(
    () => computePanchang(fromInput(dateStr), place),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dateStr, place.lat, place.lon],
  );

  const ft = (ms) => formatClock(ms, tz);
  const range = (p) => `${ft(p.start)} – ${ft(p.end)}`;

  const viewingToday = !data.error && now >= data.sunrise && now < data.nextSunrise;
  const curHora = viewingToday ? findCurrent(data.horas, now) : -1;
  const curChog = viewingToday ? findCurrent(data.choghadiya, now) : -1;

  return (
    <div className="min-h-screen site-background">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-1">{t('dashboard.horaTitle')}</h2>
          <p className="text-gray-600 text-sm">
            {t('hora.intro')}
          </p>
        </div>

        {/* Controls */}
        <Card>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] items-end">
            <label className="block">
              <span className="text-xs font-semibold text-gray-600 flex items-center gap-1 mb-1">
                <MapPin size={14} /> {t('hora.location')}
              </span>
              <select
                value={custom ? '' : cityId}
                onChange={(e) => onCity(e.target.value)}
                style={{ colorScheme: 'light', backgroundColor: '#fffdf7', color: '#392b1a' }}
                className="w-full border border-brand-300 rounded-lg px-3 py-2 text-sm"
              >
                {custom && <option value="" style={{ backgroundColor: '#fffdf7', color: '#392b1a' }}>{t('hora.yourLocation')}</option>}
                {['India', 'Around the world'].map((g) => (
                  <optgroup key={g} label={g === 'India' ? t('hora.groupIndia') : t('hora.groupWorld')}>
                    {PANCHANG_CITIES.filter((c) => c.group === g).map((c) => (
                      <option key={c.id} value={c.id} style={{ backgroundColor: '#fffdf7', color: '#392b1a' }}>{c.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600 mb-1 block">{t('hora.date')}</span>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => e.target.value && setDateStr(e.target.value)}
                style={{ colorScheme: 'light', color: '#392b1a' }}
                className="w-full border border-brand-300 rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => resetToToday(place, tz)}
                className="px-3 py-2 rounded-lg text-sm font-semibold border border-brand-300 text-brand-800 hover:bg-brand-100/40"
              >
                {t('hora.today')}
              </button>
              <button
                type="button"
                onClick={useMyLocation}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-1"
                style={{ backgroundColor: GREEN }}
              >
                <Navigation size={14} /> {t('hora.nearMe')}
              </button>
            </div>
          </div>
          {geoError && <p className="text-xs text-red-700 mt-2">{geoError}</p>}
          <p className="text-xs text-gray-500 mt-2">
            {t('hora.privacy')}
          </p>
        </Card>

        {data.error ? (
          <Card>
            <p className="text-gray-700">
              {t('hora.noSun')}
            </p>
          </Card>
        ) : (
          <>
            {/* Summary */}
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p className="font-bold text-gray-800">
                  {t(`hora.weekday.${data.weekday}`)}, {dateStr} · {placeName}
                </p>
                <p className="text-xs text-gray-600">{t('hora.ruledBy', { planet: planet(data.dayLord) })}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div>
                  <Sunrise className="mx-auto text-brand-600" size={22} />
                  <p className="text-xs text-gray-600">{t('hora.sunrise')}</p>
                  <p className="font-bold text-gray-800">{ft(data.sunrise)}</p>
                </div>
                <div>
                  <Sunset className="mx-auto text-brand-600" size={22} />
                  <p className="text-xs text-gray-600">{t('hora.sunset')}</p>
                  <p className="font-bold text-gray-800">{ft(data.sunset)}</p>
                </div>
                <div>
                  <Clock className="mx-auto text-brand-600" size={22} />
                  <p className="text-xs text-gray-600">{t('hora.daylight')}</p>
                  <p className="font-bold text-gray-800">
                    {t('hora.duration', { h: Math.floor(data.dayLengthMin / 60), m: Math.round(data.dayLengthMin % 60) })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mt-7">{t('hora.oneMuhurta')}</p>
                  <p className="font-bold text-gray-800">{t('hora.minutes', { count: Math.round(data.muhurtaMin) })}</p>
                </div>
              </div>
            </Card>

            {viewingToday && curHora >= 0 && (
              <Card className="text-center">
                <p className="hora-label text-sm md:text-base uppercase tracking-widest font-semibold">{t('hora.currentHora')}</p>
                <p className="text-3xl font-bold font-serif" style={{ color: GREEN }}>
                  {planet(data.horas[curHora].lord)}
                </p>
                <p className="text-sm text-gray-700">
                  {range(data.horas[curHora])} · {note(data.horas[curHora].lord)}
                </p>
                {curChog >= 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    {t('hora.choghadiyaNow')} <strong>{chogName(data.choghadiya[curChog].name)}</strong> ({quality(data.choghadiya[curChog].quality)})
                  </p>
                )}
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-5">
              <Card title={t('hora.auspicious')}>
                {data.abhijit.applicable ? (
                  <Window
                    tone="good"
                    label={t('hora.abhijit')}
                    range={range(data.abhijit)}
                    note={t('hora.abhijitNote')}
                  />
                ) : (
                  <div className="py-2 border-b border-brand-200/40">
                    <p className="font-semibold text-gray-500">{t('hora.abhijitOff')}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t('hora.abhijitOffNote', { range: range(data.abhijit) })}
                    </p>
                  </div>
                )}
                <Window tone="good" label={t('hora.brahma')} range={range(data.brahma)} note={t('hora.brahmaNote')} />
              </Card>

              <Card title={t('hora.avoid')}>
                <Window tone="avoid" label={t('hora.rahu')} range={range(data.rahu)} />
                <Window tone="avoid" label={t('hora.yamagandam')} range={range(data.yamagandam)} />
                <Window tone="avoid" label={t('hora.gulika')} range={range(data.gulika)} />
                {data.durMuhurta ? (
                  data.durMuhurta.map((d) => (
                    <Window
                      key={`${d.isDay ? 'd' : 'n'}${d.slot}`}
                      tone="avoid"
                      label={d.isDay ? t('hora.durMuhurat') : t('hora.durMuhuratNight')}
                      range={range(d)}
                      active={viewingToday && now >= d.start && now < d.end}
                    />
                  ))
                ) : (
                  <p className="text-xs text-gray-500 pt-2">{t('hora.durSoon')}</p>
                )}
              </Card>
            </div>

            <Card title={t('hora.table24')}>
              <p className="text-xs text-gray-600 mb-3">
                {t('hora.table24Note')}
              </p>
              <div className="grid md:grid-cols-2 gap-x-6">
                {[true, false].map((isDay) => (
                  <div key={String(isDay)}>
                    <p className="text-sm font-bold text-gray-700 mb-1">{isDay ? t('hora.day') : t('hora.night')}</p>
                    {data.horas.filter((h) => h.isDay === isDay).map((h) => (
                      <div
                        key={h.n}
                        className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg border ${
                          h.n - 1 === curHora ? 'border-green-700 bg-green-600/10' : 'border-transparent'
                        }`}
                      >
                        <div>
                          <span className="font-semibold text-gray-800">{planet(h.lord)}</span>
                          <span className="block text-xs text-gray-500">{note(h.lord)}</span>
                        </div>
                        <span className="text-sm text-gray-800 whitespace-nowrap">{range(h)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Card>

            <Card title={t('hora.choghadiya')}>
              <div className="grid md:grid-cols-2 gap-x-6">
                {[true, false].map((isDay) => (
                  <div key={String(isDay)}>
                    <p className="text-sm font-bold text-gray-700 mb-1">{isDay ? t('hora.day') : t('hora.night')}</p>
                    {data.choghadiya.filter((c) => c.isDay === isDay).map((c, i) => {
                      const idx = (isDay ? 0 : 8) + i;
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between gap-2 px-2 py-1.5 mb-1 rounded-lg border ${CHOG_STYLE[c.quality]} ${
                            idx === curChog ? 'ring-2 ring-green-700' : ''
                          }`}
                        >
                          <span className="font-semibold">{chogName(c.name)} <span className="text-xs font-normal">({quality(c.quality)})</span></span>
                          <span className="text-sm whitespace-nowrap">{range(c)}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        <p className="text-xs text-gray-500 text-center pb-6">
          {t('hora.disclaimer')}
        </p>
      </div>
    </div>
  );
}

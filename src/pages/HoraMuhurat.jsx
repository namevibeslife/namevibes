import React, { useEffect, useMemo, useState } from 'react';
import UserNav from '../components/UserNav';
import { MapPin, Sunrise, Sunset, Clock, Navigation } from 'lucide-react';
import { PANCHANG_CITIES, DEFAULT_CITY_ID } from '../data/panchangCities';
import {
  computePanchang, currentVedicDate, findCurrent, formatTime, WEEKDAYS,
} from '../utils/panchangEngine';

const GREEN = '#105717';

const HORA_NOTES = {
  Sun: 'Authority, government work, health',
  Moon: 'Travel, creativity, family matters',
  Mars: 'Courage and action; avoid disputes',
  Mercury: 'Business, learning, communication',
  Jupiter: 'Teaching, finance, auspicious beginnings',
  Venus: 'Arts, relationships, purchases',
  Saturn: 'Slow, long-term and routine work',
};

const CHOG_STYLE = {
  best: 'text-green-800 bg-green-600/10 border-green-700/40',
  good: 'text-brand-800 bg-brand-200/20 border-brand-300/50',
  avoid: 'text-red-800 bg-red-600/10 border-red-700/30',
};
const CHOG_LABEL = { best: 'Best', good: 'Good', avoid: 'Avoid' };

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
  const color = tone === 'good' ? 'text-green-800' : 'text-red-800';
  return (
    <div className={`flex items-start justify-between gap-3 py-2 px-2 -mx-2 rounded-lg border-b border-brand-200/40 last:border-0 ${
      active ? 'bg-red-600/10 ring-1 ring-red-700/40' : ''
    }`}>
      <div>
        <p className={`font-semibold ${color}`}>
          {label}
          {active && <span className="ml-2 text-xs font-bold uppercase tracking-wide">· Now</span>}
        </p>
        {note && <p className="text-xs text-gray-600 mt-0.5">{note}</p>}
      </div>
      <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">{range}</p>
    </div>
  );
}

export default function HoraMuhurat() {
  const [cityId, setCityId] = useState(DEFAULT_CITY_ID);
  const [custom, setCustom] = useState(null); // { lat, lon, tz } from the browser, kept in memory only
  const [geoError, setGeoError] = useState('');
  const [now, setNow] = useState(Date.now());

  const city = PANCHANG_CITIES.find((c) => c.id === cityId) || PANCHANG_CITIES[0];
  const place = custom ? { lat: custom.lat, lon: custom.lon } : { lat: city.lat, lon: city.lon };
  const tz = custom ? custom.tz : city.tz;
  const placeName = custom ? 'Your location' : city.name;

  const [dateStr, setDateStr] = useState(() => toInput(currentVedicDate(
    { lat: city.lat, lon: city.lon }, city.tz,
  )));

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
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
    if (!navigator.geolocation) { setGeoError('Location is not available in this browser.'); return; }
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
      () => setGeoError('Could not read your location. Please choose a city instead.'),
      { timeout: 10000, maximumAge: 600000 },
    );
  };

  const data = useMemo(
    () => computePanchang(fromInput(dateStr), place),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dateStr, place.lat, place.lon],
  );

  const t = (ms) => formatTime(ms, tz);
  const range = (p) => `${t(p.start)} – ${t(p.end)}`;

  const viewingToday = !data.error && now >= data.sunrise && now < data.nextSunrise;
  const curHora = viewingToday ? findCurrent(data.horas, now) : -1;
  const curChog = viewingToday ? findCurrent(data.choghadiya, now) : -1;

  return (
    <div className="min-h-screen site-background">
      <UserNav />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-1">Today&apos;s Hora &amp; Muhurat</h2>
          <p className="text-gray-600 text-sm">
            Your daily guide to traditional Vedic timings, calculated for your location from local sunrise and sunset.
          </p>
        </div>

        {/* Controls */}
        <Card>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] items-end">
            <label className="block">
              <span className="text-xs font-semibold text-gray-600 flex items-center gap-1 mb-1">
                <MapPin size={14} /> Location
              </span>
              <select
                value={custom ? '' : cityId}
                onChange={(e) => onCity(e.target.value)}
                style={{ colorScheme: 'light', backgroundColor: '#fffdf7', color: '#392b1a' }}
                className="w-full border border-brand-300 rounded-lg px-3 py-2 text-sm"
              >
                {custom && <option value="" style={{ backgroundColor: '#fffdf7', color: '#392b1a' }}>Your location</option>}
                {['India', 'Around the world'].map((g) => (
                  <optgroup key={g} label={g}>
                    {PANCHANG_CITIES.filter((c) => c.group === g).map((c) => (
                      <option key={c.id} value={c.id} style={{ backgroundColor: '#fffdf7', color: '#392b1a' }}>{c.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600 mb-1 block">Date</span>
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
                Today
              </button>
              <button
                type="button"
                onClick={useMyLocation}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-1"
                style={{ backgroundColor: GREEN }}
              >
                <Navigation size={14} /> Near me
              </button>
            </div>
          </div>
          {geoError && <p className="text-xs text-red-700 mt-2">{geoError}</p>}
          <p className="text-xs text-gray-500 mt-2">
            Your location is used only in your browser to calculate sunrise and sunset. It is not stored.
          </p>
        </Card>

        {data.error ? (
          <Card>
            <p className="text-gray-700">
              The sun does not rise or set on this date at this location, so the daily timings cannot be calculated.
              Please choose another location.
            </p>
          </Card>
        ) : (
          <>
            {/* Summary */}
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p className="font-bold text-gray-800">
                  {WEEKDAYS[data.weekday]}, {dateStr} · {placeName}
                </p>
                <p className="text-xs text-gray-600">Ruled by {data.dayLord}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div>
                  <Sunrise className="mx-auto text-brand-600" size={22} />
                  <p className="text-xs text-gray-600">Sunrise</p>
                  <p className="font-bold text-gray-800">{t(data.sunrise)}</p>
                </div>
                <div>
                  <Sunset className="mx-auto text-brand-600" size={22} />
                  <p className="text-xs text-gray-600">Sunset</p>
                  <p className="font-bold text-gray-800">{t(data.sunset)}</p>
                </div>
                <div>
                  <Clock className="mx-auto text-brand-600" size={22} />
                  <p className="text-xs text-gray-600">Daylight</p>
                  <p className="font-bold text-gray-800">
                    {Math.floor(data.dayLengthMin / 60)}h {Math.round(data.dayLengthMin % 60)}m
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mt-7">One muhurta</p>
                  <p className="font-bold text-gray-800">{Math.round(data.muhurtaMin)} min</p>
                </div>
              </div>
            </Card>

            {viewingToday && curHora >= 0 && (
              <Card className="text-center">
                <p className="text-xs uppercase tracking-widest text-gray-600">Current hora</p>
                <p className="text-3xl font-bold font-serif" style={{ color: GREEN }}>
                  {data.horas[curHora].lord}
                </p>
                <p className="text-sm text-gray-700">
                  {range(data.horas[curHora])} · {HORA_NOTES[data.horas[curHora].lord]}
                </p>
                {curChog >= 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    Choghadiya now: <strong>{data.choghadiya[curChog].name}</strong> ({CHOG_LABEL[data.choghadiya[curChog].quality]})
                  </p>
                )}
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-5">
              <Card title="Auspicious timings">
                {data.abhijit.applicable ? (
                  <Window
                    tone="good"
                    label="Abhijit Muhurat"
                    range={range(data.abhijit)}
                    note="Around local midday, traditionally favourable"
                  />
                ) : (
                  <div className="py-2 border-b border-brand-200/40">
                    <p className="font-semibold text-gray-500">Abhijit Muhurat: not used today</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      On Wednesdays this midday slot ({range(data.abhijit)}) is not treated as auspicious.
                    </p>
                  </div>
                )}
                <Window tone="good" label="Brahma Muhurta" range={range(data.brahma)} note="Before dawn, traditionally for prayer and meditation" />
              </Card>

              <Card title="Timings to avoid">
                <Window tone="avoid" label="Rahu Kalam" range={range(data.rahu)} />
                <Window tone="avoid" label="Yamagandam" range={range(data.yamagandam)} />
                <Window tone="avoid" label="Gulika Kalam" range={range(data.gulika)} />
                {data.durMuhurta ? (
                  data.durMuhurta.map((d) => (
                    <Window
                      key={`${d.isDay ? 'd' : 'n'}${d.slot}`}
                      tone="avoid"
                      label={`Dur Muhurat${d.isDay ? '' : ' (night)'}`}
                      range={range(d)}
                      active={viewingToday && now >= d.start && now < d.end}
                    />
                  ))
                ) : (
                  <p className="text-xs text-gray-500 pt-2">Dur Muhurat: coming soon.</p>
                )}
              </Card>
            </div>

            <Card title="24-hour planetary hora">
              <p className="text-xs text-gray-600 mb-3">
                12 day horas from sunrise and 12 night horas from sunset. Notes are traditional associations.
              </p>
              <div className="grid md:grid-cols-2 gap-x-6">
                {[true, false].map((isDay) => (
                  <div key={String(isDay)}>
                    <p className="text-sm font-bold text-gray-700 mb-1">{isDay ? 'Day' : 'Night'}</p>
                    {data.horas.filter((h) => h.isDay === isDay).map((h) => (
                      <div
                        key={h.n}
                        className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg border ${
                          h.n - 1 === curHora ? 'border-green-700 bg-green-600/10' : 'border-transparent'
                        }`}
                      >
                        <div>
                          <span className="font-semibold text-gray-800">{h.lord}</span>
                          <span className="block text-xs text-gray-500">{HORA_NOTES[h.lord]}</span>
                        </div>
                        <span className="text-sm text-gray-800 whitespace-nowrap">{range(h)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Choghadiya">
              <div className="grid md:grid-cols-2 gap-x-6">
                {[true, false].map((isDay) => (
                  <div key={String(isDay)}>
                    <p className="text-sm font-bold text-gray-700 mb-1">{isDay ? 'Day' : 'Night'}</p>
                    {data.choghadiya.filter((c) => c.isDay === isDay).map((c, i) => {
                      const idx = (isDay ? 0 : 8) + i;
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between gap-2 px-2 py-1.5 mb-1 rounded-lg border ${CHOG_STYLE[c.quality]} ${
                            idx === curChog ? 'ring-2 ring-green-700' : ''
                          }`}
                        >
                          <span className="font-semibold">{c.name} <span className="text-xs font-normal">({CHOG_LABEL[c.quality]})</span></span>
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
          Timings follow the Vedic day (sunrise to sunrise) at the selected location and use the common
          north- and south-Indian calculation rules. Regional almanacs can differ by a few minutes. Tithi, Nakshatra
          and Yoga will be added later. For guidance and tradition only.
        </p>
      </div>
    </div>
  );
}

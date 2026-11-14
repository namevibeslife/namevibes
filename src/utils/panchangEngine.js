// NameVibes Panchang engine - daily Hora & Muhurat timings.
// Pure JavaScript, no network calls and no third-party dependencies.
// Sunrise/sunset use the NOAA solar position algorithm (accurate to about a minute).
// Day = sunrise to the next sunrise (the Vedic day), in the selected location.

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const MIN = 60000;

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Day lord of each weekday (index 0 = Sunday)
const DAY_LORD = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
// Chaldean order used for planetary hours
const CHALDEAN = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];

// Which 1/8th of the daytime (1-8) is Rahu Kalam, Yamagandam and Gulika Kalam, by weekday (Sun..Sat)
const RAHU_PART = [8, 2, 7, 5, 6, 4, 3];
const YAMA_PART = [5, 4, 3, 2, 1, 7, 6];
const GULIKA_PART = [7, 6, 5, 4, 3, 2, 1];

// Choghadiya: day starts with this name by weekday; names then follow the cycle below
const CHOG_DAY_CYCLE = ['Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog'];
const CHOG_DAY_START = ['Udveg', 'Amrit', 'Rog', 'Labh', 'Shubh', 'Char', 'Kaal'];
const CHOG_NIGHT_CYCLE = ['Shubh', 'Amrit', 'Char', 'Rog', 'Kaal', 'Labh', 'Udveg'];
const CHOG_NIGHT_START = ['Shubh', 'Char', 'Kaal', 'Udveg', 'Amrit', 'Rog', 'Labh'];
export const CHOG_QUALITY = {
  Amrit: 'best', Shubh: 'good', Labh: 'good', Char: 'good',
  Udveg: 'avoid', Rog: 'avoid', Kaal: 'avoid',
};

// Dur Muhurat: which of the 15 equal muhurtas are inauspicious, by weekday (Sun..Sat).
// Day muhurtas run from sunrise to sunset; night muhurtas from sunset to the next sunrise.
// CONVENTION: sunrise-based 15-muhurta grid (day = sunrise to sunset, night = sunset to next sunrise)
// with the weekday table below. It is unrelated to ayanamsa.
// Validated 14 Nov 2026 against published daily almanac timings (hindu-blog.com daily panchang and
// Deccan Chronicle Astroguide) for all seven weekdays; every window agreed to within 3 minutes.
// Some regional almanacs use a different table. Do not change a row without a published almanac
// timing to compare against.
export const DUR_MUHURTA_SLOTS = [
  [{ part: 'day', slot: 14 }],                                  // Sunday
  [{ part: 'day', slot: 9 }, { part: 'day', slot: 12 }],         // Monday
  [{ part: 'day', slot: 4 }, { part: 'night', slot: 7 }],        // Tuesday
  [{ part: 'day', slot: 8 }],                                    // Wednesday
  [{ part: 'day', slot: 6 }, { part: 'day', slot: 12 }],         // Thursday
  [{ part: 'day', slot: 4 }, { part: 'day', slot: 9 }],          // Friday
  [{ part: 'day', slot: 1 }, { part: 'day', slot: 2 }],          // Saturday
];

// ---------- solar calculation (NOAA) ----------
function julianDay0h(y, m, d) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

function solarTerms(jd) {
  const T = (jd - 2451545) / 36525;
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const Mr = M * RAD;
  const C = Math.sin(Mr) * (1.914602 - T * (0.004817 + 0.000014 * T))
    + Math.sin(2 * Mr) * (0.019993 - 0.000101 * T) + Math.sin(3 * Mr) * 0.000289;
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * RAD);
  const decl = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD)) * DEG;
  const y = Math.tan((eps * RAD) / 2) ** 2;
  const L0r = L0 * RAD;
  const eqTime = 4 * DEG * (y * Math.sin(2 * L0r) - 2 * e * Math.sin(Mr)
    + 4 * e * y * Math.sin(Mr) * Math.cos(2 * L0r) - 0.5 * y * y * Math.sin(4 * L0r)
    - 1.25 * e * e * Math.sin(2 * Mr));
  return { decl, eqTime };
}

// Returns minutes (UTC, relative to 0h UT of the given date) of local solar noon, sunrise, sunset.
// sunrise/sunset are null when the sun never rises or sets that day (polar regions).
function sunMinutes(y, m, d, lat, lon) {
  const jd0 = julianDay0h(y, m, d);
  let noon = 720 - 4 * lon;
  let rise = null;
  let set = null;
  const hourAngle = (decl) => {
    const c = Math.cos(90.833 * RAD) / (Math.cos(lat * RAD) * Math.cos(decl * RAD))
      - Math.tan(lat * RAD) * Math.tan(decl * RAD);
    return c < -1 || c > 1 ? null : Math.acos(c) * DEG;
  };
  // refine twice: terms are evaluated at the moment of the event itself
  let tNoon = noon;
  for (let i = 0; i < 2; i++) {
    const { eqTime } = solarTerms(jd0 + tNoon / 1440);
    noon = 720 - 4 * lon - eqTime;
    tNoon = noon;
  }
  let tRise = noon - 360;
  let tSet = noon + 360;
  for (let i = 0; i < 3; i++) {
    const a = solarTerms(jd0 + tRise / 1440);
    const ha = hourAngle(a.decl);
    if (ha === null) { rise = null; set = null; break; }
    rise = 720 - 4 * (lon + ha) - a.eqTime;
    tRise = rise;
    const b = solarTerms(jd0 + tSet / 1440);
    const hb = hourAngle(b.decl);
    if (hb === null) { rise = null; set = null; break; }
    set = 720 - 4 * (lon - hb) - b.eqTime;
    tSet = set;
  }
  return { noon, rise, set };
}

function sunEvents(y, m, d, lat, lon) {
  const base = Date.UTC(y, m - 1, d);
  const s = sunMinutes(y, m, d, lat, lon);
  if (s.rise === null) return null;
  return { sunrise: base + s.rise * MIN, sunset: base + s.set * MIN };
}

export function addDays(y, m, d, n) {
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

// ---------- main calculation ----------
/**
 * @param {{year:number, month:number, day:number}} date  calendar date at the location
 * @param {{lat:number, lon:number}} place               lon is positive east
 */
export function computePanchang(date, place) {
  const { year: y, month: m, day: d } = date;
  const { lat, lon } = place;
  const today = sunEvents(y, m, d, lat, lon);
  const nx = addDays(y, m, d, 1);
  const next = sunEvents(nx.y, nx.m, nx.d, lat, lon);
  if (!today || !next) return { error: 'polar' };

  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const { sunrise, sunset } = today;
  const nextSunrise = next.sunrise;
  const dayLen = sunset - sunrise;
  const nightLen = nextSunrise - sunset;

  // 24 planetary horas: 12 by day, 12 by night, Chaldean sequence starting from the day lord
  const startIdx = CHALDEAN.indexOf(DAY_LORD[weekday]);
  const horas = [];
  for (let i = 0; i < 24; i++) {
    const isDay = i < 12;
    const len = (isDay ? dayLen : nightLen) / 12;
    const from = isDay ? sunrise + i * len : sunset + (i - 12) * len;
    horas.push({
      n: i + 1,
      lord: CHALDEAN[(startIdx + i) % 7],
      isDay,
      start: Math.round(from),
      end: Math.round(from + len),
    });
  }

  const eighth = dayLen / 8;
  const part = (n) => ({ start: Math.round(sunrise + (n - 1) * eighth), end: Math.round(sunrise + n * eighth) });
  const rahu = part(RAHU_PART[weekday]);
  const yamagandam = part(YAMA_PART[weekday]);
  const gulika = part(GULIKA_PART[weekday]);

  // Daytime muhurta = 1/15 of daylight. Abhijit is the 8th, centred on local midday.
  const muhurta = dayLen / 15;
  const abhijit = {
    start: Math.round(sunrise + 7 * muhurta),
    end: Math.round(sunrise + 8 * muhurta),
    applicable: weekday !== 3, // traditionally not used on Wednesdays
  };
  // Brahma Muhurta: 1h36m to 48m before sunrise
  const brahma = { start: Math.round(sunrise - 96 * MIN), end: Math.round(sunrise - 48 * MIN) };

  // Choghadiya: 8 day + 8 night periods
  const choghadiya = [];
  const dayStart = CHOG_DAY_CYCLE.indexOf(CHOG_DAY_START[weekday]);
  const nightStart = CHOG_NIGHT_CYCLE.indexOf(CHOG_NIGHT_START[weekday]);
  for (let i = 0; i < 16; i++) {
    const isDay = i < 8;
    const len = (isDay ? dayLen : nightLen) / 8;
    const from = isDay ? sunrise + i * len : sunset + (i - 8) * len;
    const name = isDay
      ? CHOG_DAY_CYCLE[(dayStart + i) % 7]
      : CHOG_NIGHT_CYCLE[(nightStart + (i - 8)) % 7];
    choghadiya.push({ name, quality: CHOG_QUALITY[name], isDay, start: Math.round(from), end: Math.round(from + len) });
  }

  let durMuhurta = null;
  if (DUR_MUHURTA_SLOTS) {
    const nightMuhurta = nightLen / 15;
    durMuhurta = DUR_MUHURTA_SLOTS[weekday].map(({ part, slot }) => {
      const isDay = part === 'day';
      const base = isDay ? sunrise : sunset;
      const len = isDay ? muhurta : nightMuhurta;
      return {
        slot,
        isDay,
        start: Math.round(base + (slot - 1) * len),
        end: Math.round(base + slot * len),
      };
    });
  }

  return {
    weekday,
    weekdayName: WEEKDAYS[weekday],
    dayLord: DAY_LORD[weekday],
    sunrise, sunset, nextSunrise,
    dayLengthMin: dayLen / MIN,
    muhurtaMin: muhurta / MIN,
    horas, rahu, yamagandam, gulika, abhijit, brahma, choghadiya, durMuhurta,
  };
}

// ---------- helpers for display ----------
export function formatTime(ms, timeZone) {
  return new Intl.DateTimeFormat('en-IN', { timeZone, hour: '2-digit', minute: '2-digit', hour12: true })
    .format(new Date(ms)).toUpperCase();
}

export function localDateParts(ms, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(ms));
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

/** The Vedic "today": before local sunrise the previous calendar date is still running. */
export function currentVedicDate(place, timeZone, nowMs = Date.now()) {
  const cal = localDateParts(nowMs, timeZone);
  const ev = sunEvents(cal.year, cal.month, cal.day, place.lat, place.lon);
  if (ev && nowMs < ev.sunrise) {
    const p = addDays(cal.year, cal.month, cal.day, -1);
    return { year: p.y, month: p.m, day: p.d };
  }
  return cal;
}

export function findCurrent(list, nowMs = Date.now()) {
  return list.findIndex((p) => nowMs >= p.start && nowMs < p.end);
}

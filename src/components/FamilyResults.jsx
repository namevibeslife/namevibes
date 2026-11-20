import React from 'react';
import UnmatchedLetters from './UnmatchedLetters';
import { textColorFor } from '../utils/elements';
import { posterColorFor } from '../utils/posterPalette';
import { findSharedElements } from '../utils/commonElements';
import { elementMeaning } from '../i18n/elements';
import { relationLabel, sharedLabel } from '../i18n/poster';
import { useTranslation } from 'react-i18next';

// Same jewel colours as the poster. `box` sets the tile size, `symbol` the symbol's text size.
function BigTile({ element, box, symbol }) {
  const color = posterColorFor(element);
  return <div
    aria-hidden="true"
    className={`shrink-0 flex flex-col items-center justify-between rounded-xl border-2 border-brand-300/80 shadow-sm p-2 ${box}`}
    style={{ backgroundColor: color, color: textColorFor(color) }}
  >
    <span className="self-start text-sm font-semibold leading-none">{element.number}</span>
    <strong className={`font-serif leading-none ${symbol}`}>{element.symbol}</strong>
    <span className="text-[11px] font-semibold leading-none text-center break-words">{element.name}</span>
  </div>;
}

// One large card per person: name, relation, and every element with its tile, atomic number and
// meaning showing at once. 2 columns on desktop, 1 on mobile. Any number of people works, so older
// analyses with more than FAMILY_MAX_NAMES members still show in full.
export function FamilyPersonCards({ people }) {
  const { t } = useTranslation();
  const odd = people.length > 1 && people.length % 2 === 1;
  return <section aria-label={t('results.colorsMeanings')} className="mt-8 mb-8">
    <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-5 text-center">{t('results.colorsMeanings')}</h2>
    <div className={people.length === 1 ? 'grid grid-cols-1 gap-6 max-w-2xl mx-auto' : 'grid grid-cols-1 gap-6 md:grid-cols-2'}>
      {people.map((person, index) => {
        const elements = person.elements || [];
        const lastOdd = odd && index === people.length - 1;
        return <article
          key={index}
          className={`min-w-0 bg-transparent p-4 sm:p-5 md:p-6 ${lastOdd ? 'md:col-span-2 md:w-[calc(50%-0.75rem)] md:justify-self-center' : ''}`}
        >
          <p className="text-sm md:text-base uppercase tracking-widest font-semibold text-brand-700 text-center">
            {people.length > 1 ? relationLabel(person.relation, t) : ''}
          </p>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 text-center break-words mt-1 mb-3">{person.fullName}</h3>
          <UnmatchedLetters name={person.fullName || ''} className="mb-3" />
          {elements.length === 0 && <p className="text-center text-gray-600">{t('poster.noElements')}</p>}
          <ul className="space-y-4">
            {elements.map((el, i) => <li key={i} className="flex items-center gap-4">
              <BigTile element={el} box="w-24 h-24" symbol="text-5xl" />
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-bold text-gray-900 leading-tight break-words">
                  {el.name} ({el.symbol})
                </p>
                <p className="text-sm font-semibold text-gray-600">{t('results.atomicNumberValue', { number: el.number })}</p>
                <p className="text-base text-gray-700 leading-snug mt-1">{elementMeaning(el)}</p>
                <p className="inline-flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                  <span className="w-3.5 h-3.5 rounded border border-gray-400" style={{ backgroundColor: el.color }} />
                  <span className="font-mono">{el.color}</span>
                </p>
              </div>
            </li>)}
          </ul>
        </article>;
      })}
    </div>
  </section>;
}

// Full-width card under the grid: the elements two or more members share, as large chips with
// who shares them and what they mean. `children` holds the optional interpretation flow.
export function FamilyHarmonyCard({ people, children }) {
  const { t } = useTranslation();
  if (people.length < 2) return null;
  const shared = findSharedElements(people);
  return <section aria-label={t('poster.harmony')} className="mt-8 bg-transparent p-6 md:p-8">
    <h2 className="text-3xl md:text-4xl font-bold text-brand-700 text-center">{t('poster.harmony')}</h2>
    <p className="text-center italic text-gray-700 text-lg mt-1 mb-6">
      {shared.length ? t('poster.quoteShared') : t('poster.quoteUnique')}
    </p>
    {shared.length === 0
      ? <p className="text-center text-gray-700 text-lg">{t('poster.noSharedTop')}</p>
      : <ul className="flex flex-wrap justify-center gap-x-6 gap-y-8">
        {shared.map(el => <li key={el.symbol} className="w-56 max-w-full flex flex-col items-center text-center">
          <BigTile element={el} box="w-28 h-28" symbol="text-6xl" />
          <p className="text-lg font-bold text-gray-900 mt-3 leading-tight">{el.name} ({el.symbol})</p>
          <p className="text-sm font-semibold text-brand-700">
            {sharedLabel(el.memberCount, people.length, t)}
          </p>
          <p className="text-base text-gray-700 leading-snug mt-1">{elementMeaning(el)}</p>
        </li>)}
      </ul>}
    {children && <div className="mt-8 pt-6 border-t-2 border-brand-200">{children}</div>}
  </section>;
}

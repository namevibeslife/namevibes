import React, { useEffect, useState } from 'react';
import { gemTileData, loadGemTexture } from '../utils/posterArtwork';
import Logo from './Logo';
import { elementMeaning } from '../i18n/elements';
import { relationLabel, sharedLabel } from '../i18n/poster';
import { textColorFor } from '../utils/elements';
import { findSharedElements } from '../utils/commonElements';
import { posterColorFor } from '../utils/posterPalette';
import { SITE_HOST } from '../config/site.js';
import { useTranslation } from 'react-i18next';

export function ElementTile({ element }) {
  const color = posterColorFor(element);
  const [textureReady, setTextureReady] = useState(false);
  useEffect(() => { let active = true; loadGemTexture().then(() => { if (active) setTextureReady(true); }); return () => { active = false; }; }, []);
  return <div className="element-tile" style={{ backgroundColor: color, color: textColorFor(color), backgroundImage: textureReady ? `url("${gemTileData(color)}")` : undefined }}>
    <span className="element-number">{element.number}</span>
    <strong className="element-symbol">{element.symbol}</strong>
    <span className="element-name" style={{ fontSize: element.name.length > 10 ? 9 : element.name.length > 7 ? 10 : undefined }}>{element.name}</span>
  </div>;
}

// Live text and real analysis data keep every poster personal, accessible and responsive.
export default function ChemistryPoster({ people, family: requestedFamily = false, theme = requestedFamily ? 'gold' : 'dark', minimal = false }) {
  const { t } = useTranslation();
  const family = requestedFamily && people.length > 1;
  const elements = people.flatMap(person => person.elements || []);
  const unique = [...new Map(elements.map(el => [el.symbol, el])).values()];
  const common = family ? findSharedElements(people) : [];
  return <article className={`chemistry-poster ${theme === 'gold' ? 'poster-ivory' : 'poster-midnight'}`} aria-label={family ? t('poster.ariaFamily') : t('poster.ariaSingle')}>
    <header className="poster-heading">
      <Logo variant={theme === 'gold' ? 'light' : 'dark'} className="poster-logo" />
      <p className="poster-eyebrow">{t('poster.eyebrow')}</p>
      <div className="poster-rule" aria-hidden="true">◇</div>
      <h2 className="poster-identity-heading">{t('poster.heading')}</h2>
    </header>
    <div className={family ? 'poster-family-grid' : ''}>
      {people.map((person, index) => <section className="poster-person" key={index}>
        {family && <p className="poster-eyebrow">{relationLabel(person.relation, t)}</p>}
        <h3>{person.fullName}</h3>
        <p className="poster-eyebrow">{family ? t('poster.elementsInNames') : t('poster.yourProfile')}</p>
        <div className="poster-elements">
          {(person.elements || []).map((el, i) => <ElementTile element={el} key={i} />)}
        </div>
        {!person.elements?.length && <p>{t('poster.noElements')}</p>}
      </section>)}
    </div>
    {!minimal && <div className="poster-stats">
      <span><strong>{elements.length}</strong> {t('poster.totalElements')}</span>
      <span><strong>{unique.length}</strong> {t('poster.uniqueElements')}</span>
      {family && <span><strong>{people.length}</strong> {t('poster.connectedNames')}</span>}
    </div>}
    {family ? <section className="poster-harmony poster-meanings mt-6">
      <h3>{t('poster.commonTitle')}</h3>
      <p className="mb-4">{people.length < 2 ? t('poster.addMember') : common.length ? t('poster.sharedSubtitleCounts') : t('poster.noSharedTop')}</p>
      <div>{common.map(el => <p key={el.symbol}>
        <strong>{el.symbol} · {el.name}</strong>
        <span className="block mb-2">{sharedLabel(el.memberCount, people.length, t)}</span>
        <span>{elementMeaning(el)}</span>
      </p>)}</div>
    </section> : !minimal && unique.length > 0 && <section className="poster-meanings">
      <h3>{t('poster.elementsThatMake')}</h3>
      <div>{unique.map(el => <p key={el.symbol}><strong>{el.symbol} · {el.name}</strong><span>{elementMeaning(el)}</span></p>)}</div>
    </section>}
    <footer className="poster-footer">
      <div className="poster-rule" aria-hidden="true">◇</div>
      <p>{t('poster.footerSingle')}</p>
      <small>{t('poster.footerTagline')} &nbsp; / &nbsp; {SITE_HOST}</small>
    </footer>
  </article>;
}

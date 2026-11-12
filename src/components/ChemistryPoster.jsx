import React from 'react';
import Logo from './Logo';
import { textColorFor } from '../utils/elements';
import { findSharedElements } from '../utils/commonElements';
import { posterColorFor } from '../utils/posterPalette';

export function ElementTile({ element }) {
  const color = posterColorFor(element);
  return <div className="element-tile" style={{ backgroundColor: color, color: textColorFor(color) }}>
    <span className="element-number">{element.number}</span>
    <strong className="element-symbol">{element.symbol}</strong>
    <span className="element-name">{element.name}</span>
  </div>;
}

// Live text and real analysis data keep every poster personal, accessible and responsive.
export default function ChemistryPoster({ people, family = false, theme = family ? 'gold' : 'dark', minimal = false }) {
  const elements = people.flatMap(person => person.elements || []);
  const unique = [...new Map(elements.map(el => [el.symbol, el])).values()];
  const common = family ? findSharedElements(people) : [];
  return <article className={`chemistry-poster ${theme === 'gold' ? 'poster-ivory' : 'poster-midnight'}`} aria-label={family ? 'Family chemistry poster' : 'Personal chemistry poster'}>
    <header className="poster-heading">
      <Logo variant={theme === 'gold' ? 'light' : 'dark'} className="poster-logo" />
      <p className="poster-eyebrow">Every name has a chemistry</p>
      <div className="poster-rule" aria-hidden="true">◇</div>
      <h2>{family ? 'Our Family Chemistry' : 'The Chemistry of Your Name'}</h2>
    </header>
    <div className={family ? 'poster-family-grid' : ''}>
      {people.map((person, index) => <section className="poster-person" key={index}>
        {family && <p className="poster-eyebrow">{person.relation || 'Family member'}</p>}
        <h3>{person.fullName}</h3>
        <p className="poster-eyebrow">{family ? 'Elements in our names' : 'Your elemental profile'}</p>
        <div className="poster-elements">
          {(person.elements || []).map((el, i) => <ElementTile element={el} key={i} />)}
        </div>
        {!person.elements?.length && <p>No periodic elements found in this name.</p>}
      </section>)}
    </div>
    {!minimal && <div className="poster-stats">
      <span><strong>{elements.length}</strong> Total elements</span>
      <span><strong>{unique.length}</strong> Unique elements</span>
      {family && <span><strong>{people.length}</strong> Connected names</span>}
    </div>}
    {family ? <section className="poster-harmony poster-meanings mt-6">
      <h3>Common elements &amp; their meaning</h3>
      <p className="mb-4">{people.length < 2 ? 'Add another family member to discover your shared elements.' : common.length ? 'Elements shared by two or more family members. Counts show how many names contain each element.' : 'No elements are shared between these names. Each member brings their own unique elemental combination.'}</p>
      <div>{common.map(el => <p key={el.symbol}>
        <strong>{el.symbol} · {el.name}</strong>
        <span className="block mb-2">{el.memberCount === people.length ? `Shared by all ${people.length} members` : `Shared by ${el.memberCount} of ${people.length} members`}</span>
        <span>{el.meaning}</span>
      </p>)}</div>
    </section> : !minimal && unique.length > 0 && <section className="poster-meanings">
      <h3>The elements that make your name</h3>
      <div>{unique.map(el => <p key={el.symbol}><strong>{el.symbol} · {el.name}</strong><span>{el.meaning}</span></p>)}</div>
    </section>}
    <footer className="poster-footer">
      <div className="poster-rule" aria-hidden="true">◇</div>
      <p>More than a name. A higher you.</p>
      <small>DISCOVER · EXPLORE · BE YOU &nbsp; / &nbsp; namevibes.life</small>
    </footer>
  </article>;
}

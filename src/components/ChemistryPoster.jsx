import React from 'react';
import { Atom } from 'lucide-react';
import { textColorFor } from '../utils/elements';
import { findCommonElements } from '../utils/commonElements';
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
export default function ChemistryPoster({ people, family = false }) {
  const elements = people.flatMap(person => person.elements || []);
  const unique = [...new Map(elements.map(el => [el.symbol, el])).values()];
  const common = family ? findCommonElements(people) : [];
  return <article className={`chemistry-poster ${family ? 'poster-ivory' : 'poster-midnight'}`} aria-label={family ? 'Family chemistry poster' : 'Personal chemistry poster'}>
    <header className="poster-heading">
      <Atom size={44} strokeWidth={1} aria-hidden="true" />
      <p className="poster-brand">NAMEVIBES</p>
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
    <div className="poster-stats">
      <span><strong>{elements.length}</strong> Total elements</span>
      <span><strong>{unique.length}</strong> Unique elements</span>
      {family && <span><strong>{people.length}</strong> Connected names</span>}
    </div>
    {family ? <section className="poster-harmony">
      <h3>Different elements. A stronger us.</h3>
      <p>{common.length ? `Our shared elements: ${common.map(el => `${el.name} (${el.symbol})`).join(' · ')}` : 'Unique individuals. Beautifully connected.'}</p>
    </section> : unique.length > 0 && <section className="poster-meanings">
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

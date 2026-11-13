import React from 'react';
import UnmatchedLetters from './UnmatchedLetters';

export default function ElementMeanings({ people }) {
  return <section aria-label="Element Colors & Meanings" className="mb-8">
    <h2 className="text-2xl font-bold text-gray-800 mb-4">Element Colors &amp; Meanings</h2>
    {people.map((person, index) => <div key={index} className="mb-8">
      {people.length > 1 && <h3 className="text-xl font-bold text-gray-800 mb-3">{person.fullName}{person.relation ? ` (${person.relation})` : ''}</h3>}
      <UnmatchedLetters name={person.fullName || ''} className="mb-4" />
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <caption className="sr-only">Element meanings for {person.fullName}</caption>
          <thead><tr className="bg-brand-600 text-white">
            {['Element', 'Atomic Number', 'Color', 'Life Meaning'].map(label => <th key={label} scope="col" className="border border-gray-300 px-4 py-3 text-left">{label}</th>)}
          </tr></thead>
          <tbody>{(person.elements || []).map((el, i) => <tr key={i} className="hover:bg-gray-50">
            <td className="border border-gray-300 px-4 py-3 font-semibold">{el.name} ({el.symbol})</td>
            <td className="border border-gray-300 px-4 py-3">{el.number}</td>
            <td className="border border-gray-300 px-4 py-3"><span className="inline-flex items-center gap-2"><span className="w-8 h-8 rounded border border-gray-400 shrink-0" style={{ backgroundColor: el.color }} /><span className="font-mono text-sm">{el.color}</span></span></td>
            <td className="border border-gray-300 px-4 py-3 text-gray-700">{el.meaning}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>)}
  </section>;
}

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Type-ahead country picker. Type 1 or more letters of the name or the two-letter code; matches are
// ranked (code, name start, word start, anywhere) and shown as "Sweden (SE)".
// Keyboard: ArrowUp/ArrowDown move, Enter picks, Escape closes. Works with touch (44px rows).
// `countries` is an array of { code, name }; `value` and `onChange` use the country code.
export function filterCountries(countries, query, limit = 80) {
  const q = query.trim().toLowerCase();
  if (!q) return countries.slice(0, limit);
  const scored = [];
  for (const c of countries) {
    const name = c.name.toLowerCase();
    const code = c.code.toLowerCase();
    let score = 0;
    if (code === q) score = 100;
    else if (name.startsWith(q)) score = 90;
    else if (name.split(/[\s,()-]+/).some(w => w.startsWith(q))) score = 70;
    else if (code.startsWith(q)) score = 60;
    else if (name.includes(q)) score = 40;
    if (score) scored.push([score, c]);
  }
  return scored.sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name)).slice(0, limit).map(x => x[1]);
}

export default function CountryCombobox({ countries, value, onChange, disabled = false, id, placeholder = 'Type a country name or code (e.g. swe)', label = 'Country' }) {
  const uid = useId();
  const listId = `${uid}-list`;
  const selected = useMemo(() => countries.find(c => c.code === value), [countries, value]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef(null);
  const listRef = useRef(null);
  const results = useMemo(() => filterCountries(countries, query), [countries, query]);

  useEffect(() => { setActive(0); }, [query, open]);
  useEffect(() => {
    const away = (e) => { if (box.current && !box.current.contains(e.target)) { setOpen(false); setQuery(''); } };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, []);
  useEffect(() => {
    if (open) listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const choose = (c) => { onChange(c.code); setOpen(false); setQuery(''); };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && open && results[active]) { e.preventDefault(); choose(results[active]); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  };

  return (
    <div ref={box} className="relative">
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${uid}-opt-${results[active].code}` : undefined}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          disabled={disabled}
          value={open ? query : (selected ? `${selected.name} (${selected.code})` : '')}
          placeholder={placeholder}
          onFocus={() => { setOpen(true); }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={onKeyDown}
          className="w-full px-4 py-2 pr-10 border-2 border-gray-300 rounded-lg disabled:bg-gray-100 min-h-[44px]"
        />
        <ChevronDown size={18} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
      </div>
      {open && !disabled && (
        <ul id={listId} ref={listRef} role="listbox" aria-label={label} className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-paper border-2 border-gray-300 rounded-lg shadow-lg">
          {results.length === 0 && <li className="px-4 py-3 text-sm text-gray-500" role="presentation">No country matches "{query}"</li>}
          {results.map((c, i) => (
            <li
              key={c.code}
              id={`${uid}-opt-${c.code}`}
              role="option"
              aria-selected={i === active}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => choose(c)}
              onMouseEnter={() => setActive(i)}
              className={`flex items-center justify-between gap-3 px-4 min-h-[44px] cursor-pointer ${i === active ? 'bg-brand-100' : ''} ${c.code === value ? 'font-semibold' : ''}`}
            >
              <span>{c.name}</span>
              <span className="text-xs text-gray-500 font-mono">{c.code}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import React from 'react';
import { analyzeName } from '../utils/elements';

// Letters in a name that no element symbol could cover (e.g. a lone "A"), shown so nothing is silently dropped
export default function UnmatchedLetters({ name, className = '' }) {
  const { unmatched } = analyzeName(name);
  if (unmatched.length === 0) return null;

  return (
    <p className={`text-center text-sm text-gray-500 ${className}`}>
      Letters with no matching element: <span className="font-mono font-semibold">{unmatched.join(', ')}</span>
    </p>
  );
}

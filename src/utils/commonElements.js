export function findCommonElements(results) {
  if (!results || results.length < 2) return [];

  const allElementSymbols = results.map(r => r.elements.map(e => e.symbol));
  const firstSet = new Set(allElementSymbols[0]);
  const commonSymbols = [...firstSet].filter(symbol =>
    allElementSymbols.every(symbols => symbols.includes(symbol))
  );

  // Get all unique elements that match the common symbols
  const uniqueCommon = [];
  const seenSymbols = new Set();
  for (const element of results.flatMap(r => r.elements)) {
    if (commonSymbols.includes(element.symbol) && !seenSymbols.has(element.symbol)) {
      uniqueCommon.push(element);
      seenSymbols.add(element.symbol);
    }
  }
  return uniqueCommon;
}

// Count each person once, even when an element repeats within their name.
export function findSharedElements(results = []) {
  const shared = new Map();
  results.forEach(person => {
    const seen = new Set();
    (person.elements || []).forEach(element => {
      if (seen.has(element.symbol)) return;
      seen.add(element.symbol);
      const entry = shared.get(element.symbol) || { ...element, memberCount: 0 };
      entry.memberCount += 1;
      shared.set(element.symbol, entry);
    });
  });
  return [...shared.values()].filter(element => element.memberCount > 1)
    .sort((a, b) => b.memberCount - a.memberCount || a.number - b.number);
}

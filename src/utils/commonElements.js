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

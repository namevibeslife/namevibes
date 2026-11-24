// Display helpers for sizes and money keys. Sizes are shown as they are on Qikink's list: "A4", "A3", or "8 x 10 in".
export function sizeLabel(size) {
  if (!size || size === 'NA') return '';
  const m = /^(\d+)x(\d+)$/.exec(size);
  return m ? `${m[1]} × ${m[2]} in` : size.replace(/^(\d+)(oz|ml)$/i, '$1 $2');
}

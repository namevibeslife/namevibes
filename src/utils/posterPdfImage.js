import jsPDF from 'jspdf';

// Indian-script languages: jsPDF cannot shape conjuncts or vowel signs, so those PDFs are built
// from the same canvas poster used for PNG (drawn by the browser with the bundled Noto Sans font).
// A poster that is not too tall fits on one A4 page; a very tall one is cut across pages.
export async function buildPosterImagePDF(people, { theme = 'gold', family = false } = {}) {
  const file = family && people.length > 1
    ? await (await import('./familyPosterImage')).buildFamilyPosterImage(people, theme)
    : await (await import('./posterImage')).buildPosterImage(people[0], false, theme);
  const bitmap = await createImageBitmap(file);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pageW = 210; const pageH = 297;
  const ratio = bitmap.height / bitmap.width;
  const canvas = document.createElement('canvas');
  const draw = (sy, sh) => {
    canvas.width = bitmap.width; canvas.height = Math.round(sh);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, sy, bitmap.width, sh, 0, 0, bitmap.width, sh);
    return canvas.toDataURL('image/png');
  };
  if (ratio <= 2.0) {
    // whole poster on one page, as large as fits, centred
    const h = Math.min(pageH, pageW * ratio); const w = h / ratio;
    pdf.addImage(draw(0, bitmap.height), 'PNG', (pageW - w) / 2, (pageH - h) / 2, w, h, undefined, 'FAST');
  } else {
    const slice = Math.round(bitmap.width * (pageH / pageW));
    for (let y = 0, first = true; y < bitmap.height; y += slice, first = false) {
      if (!first) pdf.addPage();
      const sh = Math.min(slice, bitmap.height - y);
      pdf.addImage(draw(y, sh), 'PNG', 0, 0, pageW, pageW * (sh / bitmap.width), undefined, 'FAST');
    }
  }
  bitmap.close?.();
  return pdf;
}

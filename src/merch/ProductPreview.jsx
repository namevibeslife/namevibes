import React, { useEffect, useState } from 'react';
import { productPreviewSvg } from './render.js';
import { artworkBox, DEFAULT_INSET_MM } from './frames.js';

// The preview is generated from the same design definition as the print file. Frame designs (framed posters) are painted by
// framePaint.js (the same operations as the print file, at preview size) and placed on the poster.
// The markup is built by our own code with every user-supplied string XML-escaped.
export default function ProductPreview({ product, colorHex, design, label, layout, spec, insetMm, size }) {
  const [image, setImage] = useState(null);
  const isFrame = design?.template === 'frame';
  const aspect = spec ? Number(spec.maxHeightInches) / Number(spec.maxWidthInches) : 1.414;
  const key = isFrame ? JSON.stringify([design.frame, design.people, design.familyName, Math.round(aspect * 1000), insetMm, size, spec?.maxWidthInches]) : '';
  useEffect(() => {
    if (!isFrame) { setImage(null); return undefined; }
    let live = true;
    (async () => {
      const { renderFrameCanvas } = await import('./framePaint.js');
      const h = Math.round(520 * aspect);
      const art = spec ? artworkBox({ width: 520, height: h, areaInches: { width: Number(spec.maxWidthInches), height: Number(spec.maxHeightInches) }, size, insetMm: insetMm ?? DEFAULT_INSET_MM }) : undefined;
      const r = await renderFrameCanvas({ design, width: 520, height: h, art });
      if (live) setImage(r.canvas.toDataURL('image/jpeg', 0.88));
    })().catch(() => live && setImage(null));
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!product || !design) return null;
  return <div role="img" aria-label={label} className="mx-auto w-full max-w-xs" data-frame-ready={isFrame ? String(!!image) : undefined} dangerouslySetInnerHTML={{ __html: productPreviewSvg(product, colorHex, design, { layout, spec, showArea: true, designImage: image }) }} />;
}

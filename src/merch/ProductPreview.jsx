import React from 'react';
import { productPreviewSvg } from './render.js';

// The preview is generated from the same design definition as the print file (render.js).
// The markup is built by our own code with every user-supplied string XML-escaped.
export default function ProductPreview({ product, colorHex, design, label, layout, spec }) {
  if (!product || !design) return null;
  return <div role="img" aria-label={label} className="mx-auto w-full max-w-xs" dangerouslySetInnerHTML={{ __html: productPreviewSvg(product, colorHex, design, { layout, spec, showArea: true }) }} />;
}

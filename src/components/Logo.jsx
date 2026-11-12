import React from 'react';

// The NameVibes wordmark. The PNGs have transparent backgrounds, so it sits directly on any surface.
// Use variant="dark" on midnight surfaces: the same logo with a light "Name" for contrast.
export default function Logo({ variant = 'light', className = '', ...rest }) {
  const src = variant === 'dark' ? '/brand/logo-dark.png' : '/brand/logo.png';
  return <img src={src} alt="NameVibes" width="800" height="270" draggable="false" className={className} {...rest} />;
}

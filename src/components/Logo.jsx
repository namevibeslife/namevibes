import React from 'react';

// The NameVibes glossy green/blue logo (approved master: /brand/namevibes-green-transparent.png).
// Transparent PNG; sits directly on light surfaces. variant="dark" uses the same unchanged logo on a
// discreet ivory backing so the blue "Name" stays readable on midnight surfaces.
export default function Logo({ variant = 'light', className = '', ...rest }) {
  const dark = variant === 'dark';
  const src = dark ? '/brand/logo-green-dark.png' : '/brand/logo-green.png';
  return <img src={src} alt="NameVibes" width="800" height={dark ? 315 : 272} draggable="false" className={className} {...rest} />;
}

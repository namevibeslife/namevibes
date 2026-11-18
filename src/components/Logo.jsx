import React from 'react';

// The approved transparent master is shared by both themes; no baked-in backing.
export default function Logo({ variant = 'light', className = '', ...rest }) {
  return <img src="/brand/logo-green.png" alt="NameVibes" width="800" height="272" draggable="false" className={className} style={variant === 'dark' ? { filter: 'drop-shadow(0 0 3px #ffffff90)' } : undefined} {...rest} />;
}

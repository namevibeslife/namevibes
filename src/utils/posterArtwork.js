let crystalTexture = null;
let texturePromise;
export function loadGemTexture() {
  if (!texturePromise) texturePromise = new Promise(resolve => {
    const image = new Image();
    image.onload = () => { crystalTexture = image; tileCache.clear(); resolve(); };
    image.onerror = () => { texturePromise = null; resolve(); };
    image.src = '/theme/element-crystal-texture.png';
  });
  return texturePromise;
}

// Shared artwork for the on-screen, image and printable posters.
export function artworkUrl(theme) {
  return `/theme/poster-${theme === 'gold' ? 'gold' : 'dark'}-art.png`;
}

export async function drawPosterBackground(ctx, width, height, theme) {
  await loadGemTexture();
  ctx.fillStyle = theme === 'gold' ? '#fbf2da' : '#081716';
  ctx.fillRect(0, 0, width, height);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = reject;
      img.src = artworkUrl(theme);
    });
    // Keep the corner artwork proportional even on very tall family posters.
    const scaledHeight = width * image.height / image.width;
    if (height <= scaledHeight * 1.4) ctx.drawImage(image, 0, 0, width, height);
    else {
      ctx.drawImage(image, 0, 0, image.width, image.height / 2, 0, 0, width, scaledHeight / 2);
      ctx.drawImage(image, 0, image.height / 2, image.width, image.height / 2, 0, height - scaledHeight / 2, width, scaledHeight / 2);
    }
  } catch { /* Plain theme remains usable offline. */ }
}

export function drawGemTile(ctx, x, y, width, height, color) {
  ctx.save();
  const inset = width * .012, radius = width * .085;
  ctx.beginPath(); ctx.roundRect(x + inset, y + inset, width - inset * 2, height - inset * 2, radius);
  ctx.shadowColor = color; ctx.shadowBlur = width * .07;
  ctx.fillStyle = color; ctx.fill(); ctx.shadowBlur = 0;
  ctx.save(); ctx.clip();
  if (crystalTexture) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(crystalTexture, x, y, width, height);
    ctx.globalCompositeOperation = 'source-over';
  }
  const sheen = ctx.createLinearGradient(x, y, x + width, y + height);
  sheen.addColorStop(0, '#ffffff80'); sheen.addColorStop(.22, '#ffffff08');
  sheen.addColorStop(.65, '#ffffff00'); sheen.addColorStop(1, '#ffffff30');
  ctx.fillStyle = sheen; ctx.fillRect(x, y, width, height);
  ctx.restore();
  const edge = ctx.createLinearGradient(x, y, x + width, y + height);
  edge.addColorStop(0, '#ffffff'); edge.addColorStop(.25, color);
  edge.addColorStop(.5, '#ffffffdd'); edge.addColorStop(.75, color); edge.addColorStop(1, '#ffffff');
  ctx.strokeStyle = edge; ctx.lineWidth = width * .022; ctx.stroke();
  ctx.beginPath(); const bevel = width * .035;
  ctx.roundRect(x + bevel, y + bevel, width - bevel * 2, height - bevel * 2, radius * .8);
  ctx.strokeStyle = '#ffffff88'; ctx.lineWidth = width * .012; ctx.stroke();
  ctx.restore();
}

const tileCache = new Map();
export function gemTileData(color) {
  if (!tileCache.has(color)) {
    const canvas = document.createElement('canvas'); canvas.width = 240; canvas.height = 280;
    drawGemTile(canvas.getContext('2d'), 0, 0, 240, 280, color);
    tileCache.set(color, canvas.toDataURL('image/png'));
  }
  return tileCache.get(color);
}

export async function loadPosterArtwork(theme) {
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1527;
  await drawPosterBackground(canvas.getContext('2d'), canvas.width, canvas.height, theme);
  return canvas.toDataURL('image/jpeg', .92);
}

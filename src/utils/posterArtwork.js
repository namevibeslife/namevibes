// Shared artwork for the on-screen, image and printable posters.
export function artworkUrl(theme) {
  return `/theme/poster-${theme === 'gold' ? 'gold' : 'dark'}-art.png`;
}

export async function drawPosterBackground(ctx, width, height, theme) {
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
  ctx.shadowColor = '#00000045'; ctx.shadowBlur = width * .08; ctx.shadowOffsetY = width * .04;
  ctx.fillStyle = color; ctx.fillRect(x, y, width, height);
  ctx.shadowColor = 'transparent';
  const sheen = ctx.createLinearGradient(x, y, x + width, y + height);
  sheen.addColorStop(0, '#ffffff70'); sheen.addColorStop(.38, '#ffffff08');
  sheen.addColorStop(.65, '#00000008'); sheen.addColorStop(1, '#00000045');
  ctx.fillStyle = sheen; ctx.fillRect(x, y, width, height);
  const bevel = Math.max(3, width * .045);
  ctx.strokeStyle = '#f7df9c'; ctx.lineWidth = Math.max(1, width * .012);
  ctx.strokeRect(x, y, width, height);
  ctx.strokeStyle = '#ffffff65'; ctx.strokeRect(x + bevel, y + bevel, width - bevel * 2, height - bevel * 2);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width - bevel, y + bevel);
  ctx.lineTo(x + bevel, y + bevel); ctx.lineTo(x + bevel, y + height - bevel); ctx.lineTo(x, y + height);
  ctx.closePath(); ctx.fillStyle = '#ffffff35'; ctx.fill();
  ctx.restore();
}

const tileCache = new Map();
export function gemTileData(color) {
  if (!tileCache.has(color)) {
    const canvas = document.createElement('canvas'); canvas.width = 240; canvas.height = 240;
    drawGemTile(canvas.getContext('2d'), 0, 0, 240, 240, color);
    tileCache.set(color, canvas.toDataURL('image/png'));
  }
  return tileCache.get(color);
}

export async function loadPosterArtwork(theme) {
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1527;
  await drawPosterBackground(canvas.getContext('2d'), canvas.width, canvas.height, theme);
  return canvas.toDataURL('image/jpeg', .92);
}

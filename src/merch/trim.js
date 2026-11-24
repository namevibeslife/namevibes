// "Trim unnecessary extra space around the design" (Qikink, ticket 136313): a poster/frame print file must not contain transparent or
// accidental blank margins. The intentional flat-colour mat border from designInsetMm is artwork and is allowed; any edge pixel that is
// not fully opaque is refused. Pure functions on RGBA strips so the same rule runs in the browser and in tests.
// (The server cannot cheaply decode a 15 MB PNG inside a Pages Function, so this is enforced where the file is rendered.)

/** Edge strips from a 2D canvas context: { top, bottom, left, right } as RGBA arrays. */
export function readEdges(ctx, width, height) {
  return {
    top: ctx.getImageData(0, 0, width, 1).data, bottom: ctx.getImageData(0, height - 1, width, 1).data,
    left: ctx.getImageData(0, 0, 1, height).data, right: ctx.getImageData(width - 1, 0, 1, height).data
  };
}

/** -> names of the edges that contain any pixel that is not fully opaque ([] = clean). */
export function transparentEdges(strips) {
  return Object.entries(strips).filter(([, d]) => { for (let i = 3; i < d.length; i += 4) if (d[i] !== 255) return true; return false; }).map(([k]) => k);
}

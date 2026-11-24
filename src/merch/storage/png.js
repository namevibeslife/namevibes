// A PNG is recognised by its 8-byte signature and its IHDR chunk, never by the Content-Type header a client sends.
const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
export function readPng(bytes) {
  if (!bytes || bytes.length < 33) return null;
  for (let i = 0; i < 8; i++) if (bytes[i] !== SIG[i]) return null;
  if (String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]) !== 'IHDR') return null;
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = v.getUint32(16); const height = v.getUint32(20);
  return width > 0 && height > 0 && width < 40000 && height < 40000 ? { width, height } : null;
}

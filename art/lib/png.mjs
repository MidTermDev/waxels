// Minimal PNG encoder — no dependencies, just node:zlib.
// Supports truecolor RGBA (for the big crayon renders) and 8/4-bit
// indexed color (for the tiny on-chain waxels, where every byte counts).
import { deflateSync } from 'node:zlib';

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Encode RGBA pixels (Uint8Array, length w*h*4) as a truecolor PNG. */
export function encodeRGBA(width, height, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const row = y * (1 + width * 4);
    raw[row] = 0; // filter: none
    pixels.subarray
      ? raw.set(pixels.subarray(y * width * 4, (y + 1) * width * 4), row + 1)
      : null;
  }
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Encode indexed-color PNG from a palette (array of [r,g,b]) and an index
 * map (Uint8Array, length w*h). Uses 4-bit depth when the palette allows —
 * on a 4096-byte canvas, that's the difference between fitting and not.
 */
export function encodeIndexed(width, height, palette, indices) {
  if (palette.length > 256) throw new Error('palette too large');
  const depth = palette.length <= 16 ? 4 : 8;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = depth;
  ihdr[9] = 3; // color type: palette
  const plte = Buffer.alloc(palette.length * 3);
  palette.forEach(([r, g, b], i) => {
    plte[i * 3] = r;
    plte[i * 3 + 1] = g;
    plte[i * 3 + 2] = b;
  });
  const rowBytes = depth === 4 ? Math.ceil(width / 2) : width;
  const raw = Buffer.alloc(height * (1 + rowBytes));
  for (let y = 0; y < height; y++) {
    const row = y * (1 + rowBytes);
    raw[row] = 0;
    if (depth === 8) {
      raw.set(indices.subarray(y * width, (y + 1) * width), row + 1);
    } else {
      for (let x = 0; x < width; x++) {
        const i = indices[y * width + x] & 0x0f;
        const byte = row + 1 + (x >> 1);
        raw[byte] |= x % 2 === 0 ? i << 4 : i;
      }
    }
  }
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('PLTE', plte),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

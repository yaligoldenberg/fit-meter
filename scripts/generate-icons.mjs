/**
 * Writes every app icon from one geometry table: the SVG favicon, the iOS home-screen PNG
 * and the manifest PNGs. Run `node scripts/generate-icons.mjs` after changing the mark.
 *
 * The mark is a heavy "F" standing on the signal baseline — the same zero line the
 * Wordmark sits on. It is all axis-aligned rectangles, so it is rasterised here directly
 * (each pixel's colour weighted by how much of it a rectangle covers) with no image
 * library, and the PNGs are static files rather than rendered on request.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const INK = [0x0a, 0x0a, 0x0a];
const PAPER = [0xff, 0xff, 0xff];
const SIGNAL = [0x00, 0xa8, 0x5d];
const hex = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();

// 100-unit grid.
const RECTS = [
  { x: 31, y: 20, w: 15, h: 51, fill: PAPER }, // stem
  { x: 31, y: 20, w: 41, h: 14, fill: PAPER }, // top arm
  { x: 31, y: 41, w: 32, h: 13, fill: PAPER }, // middle arm
  { x: 22, y: 76, w: 56, h: 8, fill: SIGNAL }, // baseline
];

function svg() {
  const rects = RECTS.map(
    (r) => `  <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${hex(r.fill)}"/>`
  ).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="18" fill="${hex(INK)}"/>
${rects}
</svg>
`;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Opaque, full-bleed square: iOS and Android apply their own corner masks. */
function png(size) {
  const u = size / 100;
  const rects = RECTS.map((r) => ({ ...r, x0: r.x * u, y0: r.y * u, x1: (r.x + r.w) * u, y1: (r.y + r.h) * u }));
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let py = 0; py < size; py++) {
    const row = py * (1 + size * 3);
    raw[row] = 0; // filter: none
    for (let px = 0; px < size; px++) {
      const color = [...INK];
      for (const r of rects) {
        const cover =
          Math.max(0, Math.min(px + 1, r.x1) - Math.max(px, r.x0)) *
          Math.max(0, Math.min(py + 1, r.y1) - Math.max(py, r.y0));
        if (cover > 0) for (let i = 0; i < 3; i++) color[i] += (r.fill[i] - color[i]) * cover;
      }
      for (let i = 0; i < 3; i++) raw[row + 1 + px * 3 + i] = Math.round(color[i]);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("src/app/icon.svg", svg());
writeFileSync("src/app/apple-icon.png", png(180));
writeFileSync("public/icons/icon-192.png", png(192));
writeFileSync("public/icons/icon-512.png", png(512));
console.log("Wrote src/app/icon.svg, src/app/apple-icon.png, public/icons/icon-{192,512}.png");

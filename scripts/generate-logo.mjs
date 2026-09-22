import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Helper to compute CRC32
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPNG(width, height, pixelFn) {
  // 1 byte filter per line + width * 4 bytes RGBA
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = Math.max(0, Math.min(255, Math.round(r)));
      rawData[pxOffset + 1] = Math.max(0, Math.min(255, Math.round(g)));
      rawData[pxOffset + 2] = Math.max(0, Math.min(255, Math.round(b)));
      rawData[pxOffset + 3] = Math.max(0, Math.min(255, Math.round(a)));
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // Color type (RGBA)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const ihdrType = Buffer.from('IHDR');
  const ihdrCrc = Buffer.alloc(4);
  ihdrCrc.writeUInt32BE(crc32(Buffer.concat([ihdrType, ihdrData])), 0);
  const ihdrLength = Buffer.alloc(4);
  ihdrLength.writeUInt32BE(13, 0);
  const ihdrChunk = Buffer.concat([ihdrLength, ihdrType, ihdrData, ihdrCrc]);

  // IDAT chunk
  const idatType = Buffer.from('IDAT');
  const idatCrc = Buffer.alloc(4);
  idatCrc.writeUInt32BE(crc32(Buffer.concat([idatType, compressed])), 0);
  const idatLength = Buffer.alloc(4);
  idatLength.writeUInt32BE(compressed.length, 0);
  const idatChunk = Buffer.concat([idatLength, idatType, compressed, idatCrc]);

  // IEND chunk
  const iendType = Buffer.from('IEND');
  const iendCrc = Buffer.alloc(4);
  iendCrc.writeUInt32BE(crc32(iendType), 0);
  const iendLength = Buffer.alloc(4);
  iendLength.writeUInt32BE(0, 0);
  const iendChunk = Buffer.concat([iendLength, iendType, iendCrc]);

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Distance to line segment
function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

// Point in polygon
function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Distance to polygon boundary
function distToPolyBoundary(px, py, poly) {
  let minDist = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const d = distToSegment(px, py, poly[i][0], poly[i][1], poly[j][0], poly[j][1]);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

// Design the Precursor Emblem:
// An iconic cybernetic defense shield with forward intercept vector (Precursor delta)
function renderLogoPixel(x, y, w, h) {
  // Normalize coords to [-1, 1]
  const nx = (x - w / 2) / (w / 2);
  const ny = (y - h / 2) / (h / 2);

  // Outer shield polygon vertices
  const shieldPoly = [
    [0, -0.88],       // Top center peak
    [0.72, -0.58],    // Top right shoulder
    [0.72, 0.16],     // Right mid
    [0.36, 0.68],     // Lower right taper
    [0, 0.90],        // Bottom apex
    [-0.36, 0.68],    // Lower left taper
    [-0.72, 0.16],    // Left mid
    [-0.72, -0.58],   // Top left shoulder
  ];

  // Inner shield polygon (for border & inset)
  const innerPoly = [
    [0, -0.78],
    [0.60, -0.50],
    [0.60, 0.12],
    [0.30, 0.58],
    [0, 0.78],
    [-0.30, 0.58],
    [-0.60, 0.12],
    [-0.60, -0.50],
  ];

  // Forward intercept vector (Chevron / Delta): represents early-stage intercept
  const deltaPoly1 = [
    [0, -0.42],       // Top tip of primary vector
    [0.38, 0.05],     // Right wing
    [0.26, 0.15],
    [0, -0.15],       // Inner notch
    [-0.26, 0.15],
    [-0.38, 0.05],    // Left wing
  ];

  const deltaPoly2 = [
    [0, -0.05],       // Second forward pulse
    [0.42, 0.40],
    [0.28, 0.48],
    [0, 0.18],        // Inner notch
    [-0.28, 0.48],
    [-0.42, 0.40],
  ];

  const inShield = pointInPoly(nx, ny, shieldPoly);
  const inInner = pointInPoly(nx, ny, innerPoly);
  const shieldDist = distToPolyBoundary(nx, ny, shieldPoly);
  const innerDist = distToPolyBoundary(nx, ny, innerPoly);

  // Outer glow / anti-aliasing
  if (!inShield) {
    if (shieldDist < 0.05) {
      // Glow halo
      const t = 1 - (shieldDist / 0.05);
      // Neon Emerald (#00F5A0) to Cyan (#00D2FF) glow
      const alpha = Math.pow(t, 2) * 180;
      return [0, 245, 160, alpha];
    }
    return [0, 0, 0, 0];
  }

  // Inside the shield
  // 1. Check if on the outer shield border ring
  if (!inInner) {
    // Border rim: Gradient from Cyan at top to Emerald at bottom
    const gradT = (ny + 0.88) / 1.78; // 0 at top, 1 at bottom
    const r = Math.round(0 * (1 - gradT) + 0 * gradT);
    const g = Math.round(210 * (1 - gradT) + 245 * gradT);
    const b = Math.round(255 * (1 - gradT) + 160 * gradT);
    return [r, g, b, 255];
  }

  // Inside the inner shield body
  // Dark obsidian surface with subtle radar grid & gradients
  let baseR = 10;
  let baseG = 14;
  let baseB = 22;
  let baseA = 240;

  // Subtle radial gradient inside the shield
  const radialDist = Math.hypot(nx, ny + 0.1);
  const coreGlow = Math.max(0, 1 - radialDist * 1.4);
  baseR += Math.round(coreGlow * 15);
  baseG += Math.round(coreGlow * 45);
  baseB += Math.round(coreGlow * 40);

  // Inner border highlight line
  if (innerDist < 0.02) {
    return [0, 245, 160, 200];
  }

  // Check Delta Vectors (The Precursor Symbol)
  const inDelta1 = pointInPoly(nx, ny, deltaPoly1);
  const inDelta2 = pointInPoly(nx, ny, deltaPoly2);
  const distDelta1 = distToPolyBoundary(nx, ny, deltaPoly1);
  const distDelta2 = distToPolyBoundary(nx, ny, deltaPoly2);

  // Primary upper delta vector: Bright Cyber White with Mint edge
  if (inDelta1) {
    // Bright white core, emerald edges
    const core = Math.min(1, distDelta1 / 0.04);
    const r = Math.round(240 + core * 15);
    const g = Math.round(255);
    const b = Math.round(240 + core * 15);
    return [r, g, b, 255];
  }
  if (distDelta1 < 0.025) {
    // Glow around vector 1
    return [0, 245, 160, 220];
  }

  // Secondary lower delta vector: Electric Emerald (#00F5A0)
  if (inDelta2) {
    return [0, 245, 160, 255];
  }
  if (distDelta2 < 0.02) {
    return [0, 210, 255, 180];
  }

  // Center intercept node: diamond dot at (0, 0.46)
  const dDot = Math.hypot(nx, ny - 0.44);
  if (dDot < 0.04) {
    return [255, 255, 255, 255];
  } else if (dDot < 0.07) {
    return [0, 245, 160, 220];
  }

  // Subtle horizontal radar scanning line across the middle
  const scanLineDist = Math.abs(ny + 0.05);
  if (scanLineDist < 0.006) {
    return [0, 210, 255, 140];
  }

  return [baseR, baseG, baseB, baseA];
}

// Generate files
const publicDir = path.resolve('apps/web/public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating 512x512 PNG logo...');
const logo512 = createPNG(512, 512, renderLogoPixel);
fs.writeFileSync(path.join(publicDir, 'logo.png'), logo512);

console.log('Generating 64x64 PNG logo (for favicon/nav)...');
const logo64 = createPNG(64, 64, renderLogoPixel);
fs.writeFileSync(path.join(publicDir, 'logo-sm.png'), logo64);

// Also write SVG version for ultra crisp vector scaling
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00D2FF" />
      <stop offset="100%" stop-color="#00F5A0" />
    </linearGradient>
    <radialGradient id="coreGrad" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="#00F5A0" stop-opacity="0.18" />
      <stop offset="100%" stop-color="#06080C" stop-opacity="0.95" />
    </radialGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Outer Shield Halo Glow -->
  <polygon points="256,32 440,108 440,296 348,430 256,486 164,430 72,296 72,108"
    fill="none" stroke="#00F5A0" stroke-width="12" stroke-opacity="0.3" filter="url(#glow)" />

  <!-- Shield Outer Border -->
  <polygon points="256,32 440,108 440,296 348,430 256,486 164,430 72,296 72,108"
    fill="url(#shieldGrad)" />

  <!-- Shield Inner Body -->
  <polygon points="256,58 410,126 410,286 332,398 256,448 180,398 102,286 102,126"
    fill="url(#coreGrad)" stroke="rgba(0, 245, 160, 0.4)" stroke-width="2" />

  <!-- Radar Scan Crossline -->
  <line x1="120" y1="244" x2="392" y2="244" stroke="#00D2FF" stroke-width="1.5" stroke-dasharray="4 4" stroke-opacity="0.4" />
  <circle cx="256" cy="244" r="70" fill="none" stroke="#00F5A0" stroke-width="1" stroke-opacity="0.25" />

  <!-- Precursor Intercept Vectors (Forward Chevrons) -->
  <!-- Primary Chevron (Lead Delta) -->
  <polygon points="256,150 352,268 322,294 256,220 190,294 160,268"
    fill="#FFFFFF" filter="url(#glow)" />
  <polygon points="256,154 346,266 322,290 256,224 190,290 166,266"
    fill="#00F5A0" />

  <!-- Secondary Echo Chevron -->
  <polygon points="256,244 362,358 328,378 256,306 184,378 150,358"
    fill="#00F5A0" />

  <!-- Defense Node Intercept Core -->
  <circle cx="256" cy="368" r="10" fill="#FFFFFF" filter="url(#glow)" />
  <circle cx="256" cy="368" r="6" fill="#00D2FF" />
</svg>`;

fs.writeFileSync(path.join(publicDir, 'logo.svg'), svgContent);
console.log('Saved logo.png, logo-sm.png, and logo.svg to apps/web/public!');

import assert from 'node:assert/strict';
import {inflateSync} from 'node:zlib';

const SIGNATURE = Buffer.from([137,80,78,71,13,10,26,10]);

export function readPng(buffer) {
  assert.ok(Buffer.isBuffer(buffer) && buffer.subarray(0,8).equals(SIGNATURE), 'expected a PNG');
  let offset = 8, width, height, bitDepth, colorType, interlace;
  const idat = [];
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    offset += 12 + length;
  }
  return {width, height, bitDepth, colorType, interlace, idat: Buffer.concat(idat)};
}

function paeth(left, up, upperLeft) {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  if (upDistance <= upperLeftDistance) return up;
  return upperLeft;
}

export function rgbaPixels(png) {
  assert.equal(png.bitDepth, 8, 'PNG bit depth');
  assert.equal(png.interlace, 0, 'PNG interlace');
  assert.equal(png.colorType, 6, 'PNG color type');
  const raw = inflateSync(png.idat);
  const channels = 4;
  const stride = png.width * channels;
  const rows = [];
  let source = 0;
  let previous = Buffer.alloc(stride);
  for (let y = 0; y < png.height; y++) {
    const filter = raw[source++];
    const row = raw.subarray(source, source + stride);
    source += stride;
    const out = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const left = i >= channels ? out[i - channels] : 0;
      const up = previous[i];
      const upperLeft = i >= channels ? previous[i - channels] : 0;
      let value = row[i];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += Math.floor((left + up) / 2);
      else if (filter === 4) value += paeth(left, up, upperLeft);
      else if (filter !== 0) throw new Error(`unsupported PNG filter ${filter}`);
      out[i] = value & 255;
    }
    rows.push(out);
    previous = out;
  }
  return Buffer.concat(rows);
}

export function pixel(png, pixels, x, y) {
  const index = (y * png.width + x) * 4;
  return {r: pixels[index], g: pixels[index + 1], b: pixels[index + 2], a: pixels[index + 3]};
}

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';
import * as deeplab from '@tensorflow-models/deeplab';

let modelPromise = null;

async function getModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await tf.ready();
      return deeplab.load({ base: 'ade20k', quantizationBytes: 2 });
    })();
  }
  return modelPromise;
}

async function loadImageTensor(uri) {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Could not read selected image');
  const buffer = await response.arrayBuffer();
  return decodeJpeg(new Uint8Array(buffer), 3);
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function adler32(bytes) {
  let a = 1;
  let b = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    a = (a + bytes[i]) % 65521;
    b = (b + a) % 65521;
  }
  return (((b << 16) | a) >>> 0);
}

function writeUint32(bytes, offset, value) {
  bytes[offset] = (value >>> 24) & 255;
  bytes[offset + 1] = (value >>> 16) & 255;
  bytes[offset + 2] = (value >>> 8) & 255;
  bytes[offset + 3] = value & 255;
}

function pngChunk(type, data) {
  const typeBytes = new Uint8Array([
    type.charCodeAt(0), type.charCodeAt(1), type.charCodeAt(2), type.charCodeAt(3),
  ]);
  const chunk = new Uint8Array(8 + data.length + 4);
  writeUint32(chunk, 0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  const crcInput = new Uint8Array(typeBytes.length + data.length);
  crcInput.set(typeBytes, 0);
  crcInput.set(data, 4);
  writeUint32(chunk, 8 + data.length, crc32(crcInput));
  return chunk;
}

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function bytesToBase64(bytes) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const value = (a << 16) | (b << 8) | c;
    output += alphabet[(value >> 18) & 63];
    output += alphabet[(value >> 12) & 63];
    output += i + 1 < bytes.length ? alphabet[(value >> 6) & 63] : '=';
    output += i + 2 < bytes.length ? alphabet[value & 63] : '=';
  }
  return output;
}

function layerToPngDataUri(mask, width, height, rgb) {
  const raw = new Uint8Array(height * (width * 4 + 1));
  let rawOffset = 0;
  for (let y = 0; y < height; y += 1) {
    raw[rawOffset++] = 0;
    const row = mask[y];
    for (let x = 0; x < width; x += 1) {
      const visible = row[x] === 1;
      const pixelOffset = (y * width + x) * 3;
      raw[rawOffset++] = visible ? rgb[pixelOffset] : 0;
      raw[rawOffset++] = visible ? rgb[pixelOffset + 1] : 0;
      raw[rawOffset++] = visible ? rgb[pixelOffset + 2] : 0;
      raw[rawOffset++] = visible ? 255 : 0;
    }
  }

  const zlibParts = [new Uint8Array([0x78, 0x01])];
  for (let offset = 0; offset < raw.length; offset += 65535) {
    const size = Math.min(65535, raw.length - offset);
    const block = new Uint8Array(5 + size);
    block[0] = offset + size >= raw.length ? 1 : 0;
    block[1] = size & 255;
    block[2] = (size >>> 8) & 255;
    const inverse = 65535 - size;
    block[3] = inverse & 255;
    block[4] = (inverse >>> 8) & 255;
    block.set(raw.subarray(offset, offset + size), 5);
    zlibParts.push(block);
  }
  const adler = new Uint8Array(4);
  writeUint32(adler, 0, adler32(raw));
  zlibParts.push(adler);

  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = new Uint8Array(13);
  writeUint32(header, 0, width);
  writeUint32(header, 4, height);
  header[8] = 8;
  header[9] = 6;

  const png = concatBytes([
    signature,
    pngChunk('IHDR', header),
    pngChunk('IDAT', concatBytes(zlibParts)),
    pngChunk('IEND', new Uint8Array(0)),
  ]);
  return 'data:image/png;base64,' + bytesToBase64(png);
}

function colorKey(r, g, b) {
  return r + ',' + g + ',' + b;
}

function smoothMask(mask, width, height) {
  const output = new Array(height);

  for (let y = 0; y < height; y += 1) {
    const row = new Uint8Array(width);

    for (let x = 0; x < width; x += 1) {
      let visible = 0;
      let total = 0;

      for (let dy = -1; dy <= 1; dy += 1) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;

        const sourceRow = mask[ny];
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          total += 1;
          if (sourceRow[nx] === 1) visible += 1;
        }
      }

      // Remove isolated pixels and tiny holes while keeping real object edges.
      row[x] = visible >= Math.ceil(total * 0.56) ? 1 : 0;
    }

    output[y] = row;
  }

  return output;
}

function humanizeLabel(label) {
  return String(label || 'Object')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function analyzeLayers(imageUri) {
  const model = await getModel();
  const imageTensor = await loadImageTensor(imageUri);

  try {
    const sourceRgb = imageTensor.dataSync();
    const result = await model.segment(imageTensor);
    const { width, height, segmentationMap, legend } = result;

    if (!width || !height || !segmentationMap || !legend) {
      throw new Error('AI layer model returned no usable segmentation');
    }

    const colorToLabel = new Map(
      Object.entries(legend).map(([label, rgb]) => [
        colorKey(rgb[0], rgb[1], rgb[2]),
        label,
      ]),
    );

    const stats = new Map();
    for (let i = 0; i < segmentationMap.length; i += 3) {
      const label = colorToLabel.get(
        colorKey(segmentationMap[i], segmentationMap[i + 1], segmentationMap[i + 2]),
      );
      if (label) stats.set(label, (stats.get(label) || 0) + 1);
    }

    const totalPixels = width * height;
    const candidates = [...stats.entries()]
      .filter(([label, count]) =>
        label.toLowerCase() !== 'background' && count / totalPixels > 0.008,
      )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    if (!candidates.length) {
      throw new Error('AI could not find distinct visible layers');
    }

    return candidates.map(([label], index) => {
      const target = colorKey(...legend[label]);
      const mask = new Array(height);

      for (let y = 0; y < height; y += 1) {
        const row = new Uint8Array(width);
        for (let x = 0; x < width; x += 1) {
          const offset = (y * width + x) * 3;
          row[x] = colorKey(
            segmentationMap[offset],
            segmentationMap[offset + 1],
            segmentationMap[offset + 2],
          ) === target ? 1 : 0;
        }
        mask[y] = row;
      }

      const cleanedMask = smoothMask(mask, width, height);

      return {
        id: 'local-ai-layer-' + (index + 1),
        label: humanizeLabel(label),
        above: false,
        imageUri: layerToPngDataUri(cleanedMask, width, height, sourceRgb),
        width,
        height,
      };
    });
  } finally {
    imageTensor.dispose();
  }
}

// Inspect bounded metadata before ANY browser image decoder allocates pixels.
// This does not transform, upload, or persist the original file.
export const IMAGE_MEMORY_LIMITS = Object.freeze({
  maxPixels: 32_000_000,
  maxDimension: 16_384,
  maxHeaderBytes: 1_048_576,
});

const unreadable = () => Error('This image’s dimensions could not be checked safely. Choose a JPEG, PNG or static WebP photo. Your original file was not changed.');
function checked(width, height, format) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) throw unreadable();
  if (width > IMAGE_MEMORY_LIMITS.maxDimension || height > IMAGE_MEMORY_LIMITS.maxDimension || width * height > IMAGE_MEMORY_LIMITS.maxPixels) {
    throw Error('This photo is too large to decode safely on this device. Choose a copy at 32 megapixels or less, with neither side over 16,384 pixels. Your original file was not changed.');
  }
  return {width, height, format};
}

export async function inspectImageDimensions(file) {
  if (!file || !Number.isSafeInteger(file.size) || file.size < 12 || typeof file.slice !== 'function') throw unreadable();
  const bytes = new Uint8Array(await file.slice(0, Math.min(file.size, IMAGE_MEMORY_LIMITS.maxHeaderBytes)).arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const has = (offset, length) => Number.isSafeInteger(offset) && offset >= 0 && offset + length <= bytes.length;
  const text = (offset, value) => has(offset, value.length) && [...value].every((char, index) => bytes[offset + index] === char.charCodeAt(0));

  if (has(0, 24) && bytes[0] === 137 && text(1, 'PNG\r\n\x1a\n')) {
    if (view.getUint32(8) !== 13 || !text(12, 'IHDR') || file.size < 33) throw unreadable();
    return checked(view.getUint32(16), view.getUint32(20), 'png');
  }

  if (bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (has(offset, 2)) {
      if (bytes[offset++] !== 255) throw unreadable();
      while (has(offset, 1) && bytes[offset] === 255) offset++;
      if (!has(offset, 1)) break;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218 || marker === 0) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (!has(offset, 2)) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > file.size) throw unreadable();
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
        if (length < 8 || !has(offset, 8)) throw unreadable();
        return checked(view.getUint16(offset + 5), view.getUint16(offset + 3), 'jpeg');
      }
      offset += length;
    }
    throw unreadable();
  }

  if (text(0, 'RIFF') && text(8, 'WEBP')) {
    const end = view.getUint32(4, true) + 8;
    if (end > file.size || end < 20) throw unreadable();
    let offset = 12, canvas = null;
    while (has(offset, 8) && offset + 8 <= end) {
      const length = view.getUint32(offset + 4, true), start = offset + 8;
      if (start + length > end) throw unreadable();
      if (text(offset, 'VP8X')) {
        if (canvas || length !== 10 || !has(start, 10) || (bytes[start] & 2)) throw unreadable();
        const uint24 = position => bytes[position] + bytes[position + 1] * 256 + bytes[position + 2] * 65536;
        canvas = checked(uint24(start + 4) + 1, uint24(start + 7) + 1, 'webp');
      } else if (text(offset, 'VP8 ') || text(offset, 'VP8L')) {
        let dimensions;
        if (text(offset, 'VP8 ')) {
          if (length < 10 || !has(start, 10) || (bytes[start] & 1) || bytes[start + 3] !== 157 || bytes[start + 4] !== 1 || bytes[start + 5] !== 42) throw unreadable();
          dimensions = checked(view.getUint16(start + 6, true) & 16383, view.getUint16(start + 8, true) & 16383, 'webp');
        } else {
          if (length < 5 || !has(start, 5) || bytes[start] !== 47) throw unreadable();
          const bits = view.getUint32(start + 1, true);
          if (bits >>> 29) throw unreadable();
          dimensions = checked((bits & 16383) + 1, ((bits >>> 14) & 16383) + 1, 'webp');
        }
        if (canvas && (canvas.width !== dimensions.width || canvas.height !== dimensions.height)) throw unreadable();
        return dimensions;
      } else if (text(offset, 'ANIM') || text(offset, 'ANMF')) throw unreadable();
      offset = start + length + (length & 1);
    }
  }
  throw unreadable();
}

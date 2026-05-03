/**
 * Scanline flood fill on an ImageData buffer. We work in-place on the
 * passed buffer so the caller can `putImageData` once at the end.
 *
 * Tolerance is small (16 per channel) to absorb anti-aliased edges at the
 * stroke boundary — without it, the fill leaks rings of pixels around
 * every brush mark.
 */

const TOLERANCE = 32;

function hexToRgba(hex: string): [number, number, number, number] {
  const cleaned = hex.replace("#", "");
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return [r, g, b, 255];
}

function colorMatches(
  data: Uint8ClampedArray,
  idx: number,
  target: [number, number, number, number],
): boolean {
  return (
    Math.abs(data[idx]     - target[0]) <= TOLERANCE &&
    Math.abs(data[idx + 1] - target[1]) <= TOLERANCE &&
    Math.abs(data[idx + 2] - target[2]) <= TOLERANCE &&
    Math.abs(data[idx + 3] - target[3]) <= TOLERANCE
  );
}

function setColor(
  data: Uint8ClampedArray,
  idx: number,
  fill: [number, number, number, number],
): void {
  data[idx]     = fill[0];
  data[idx + 1] = fill[1];
  data[idx + 2] = fill[2];
  data[idx + 3] = fill[3];
}

export function floodFill(
  imageData: ImageData,
  startX: number,
  startY: number,
  fillHex: string,
): void {
  const { width, height, data } = imageData;
  const sx = Math.floor(startX);
  const sy = Math.floor(startY);
  if (sx < 0 || sx >= width || sy < 0 || sy >= height) return;

  const startIdx = (sy * width + sx) * 4;
  const target: [number, number, number, number] = [
    data[startIdx],
    data[startIdx + 1],
    data[startIdx + 2],
    data[startIdx + 3],
  ];
  const fill = hexToRgba(fillHex);

  // No-op if user clicks a pixel that already matches — also avoids an
  // infinite loop because the queue would re-add the same pixel.
  if (
    Math.abs(target[0] - fill[0]) <= 1 &&
    Math.abs(target[1] - fill[1]) <= 1 &&
    Math.abs(target[2] - fill[2]) <= 1 &&
    Math.abs(target[3] - fill[3]) <= 1
  ) {
    return;
  }

  // Scanline queue: each entry is [x, y]. Fast, low memory.
  const stack: number[] = [sx, sy];

  while (stack.length > 0) {
    const y = stack.pop() as number;
    const x = stack.pop() as number;

    let lx = x;
    let idx = (y * width + lx) * 4;
    while (lx >= 0 && colorMatches(data, idx, target)) {
      lx--;
      idx -= 4;
    }
    lx++;
    idx += 4;

    let spanAbove = false;
    let spanBelow = false;
    while (lx < width) {
      const here = (y * width + lx) * 4;
      if (!colorMatches(data, here, target)) break;
      setColor(data, here, fill);

      if (y > 0) {
        const upIdx = ((y - 1) * width + lx) * 4;
        const upMatches = colorMatches(data, upIdx, target);
        if (!spanAbove && upMatches) {
          stack.push(lx, y - 1);
          spanAbove = true;
        } else if (spanAbove && !upMatches) {
          spanAbove = false;
        }
      }
      if (y < height - 1) {
        const downIdx = ((y + 1) * width + lx) * 4;
        const downMatches = colorMatches(data, downIdx, target);
        if (!spanBelow && downMatches) {
          stack.push(lx, y + 1);
          spanBelow = true;
        } else if (spanBelow && !downMatches) {
          spanBelow = false;
        }
      }
      lx++;
    }
  }
}

import { get, set, del } from "idb-keyval";

/**
 * Per-user paint persistence. We only store the rendered PNG — not the
 * stroke history — because the rendered bitmap is what the user expects
 * to see when they reopen the app. History is kept in memory for the
 * current session only.
 */

const KEY_PREFIX = "paint:painting:";

export function paintingKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

export async function loadPainting(userId: string): Promise<Blob | null> {
  try {
    const blob = await get<Blob>(paintingKey(userId));
    return blob ?? null;
  } catch (error) {
    console.error("Paint: failed to load painting from IndexedDB", error);
    return null;
  }
}

export async function savePainting(userId: string, blob: Blob): Promise<void> {
  try {
    await set(paintingKey(userId), blob);
  } catch (error) {
    console.error("Paint: failed to save painting to IndexedDB", error);
  }
}

export async function clearPainting(userId: string): Promise<void> {
  try {
    await del(paintingKey(userId));
  } catch (error) {
    console.error("Paint: failed to clear painting from IndexedDB", error);
  }
}

/**
 * Promise-returning helper to read a canvas as a PNG blob. Uses the modern
 * `toBlob` API (toDataURL is slower and balloons memory for 1200×800).
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/png",
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob returned null"));
      },
      type,
      quality,
    );
  });
}

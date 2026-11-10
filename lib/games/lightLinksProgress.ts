export interface LightLinksProgress {
  levelIndex: number;
  boardIndices: number[];
}

interface ProgressStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

function validIndex(value: unknown, length: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < length;
}

function normalise(value: unknown, boardCounts: readonly number[]): LightLinksProgress {
  const saved = value && typeof value === "object" ? value as Partial<LightLinksProgress> : {};
  const indices = Array.isArray(saved.boardIndices) ? saved.boardIndices : [];
  return {
    levelIndex: validIndex(saved.levelIndex, boardCounts.length) ? saved.levelIndex : 0,
    boardIndices: boardCounts.map((count, index) => validIndex(indices[index], count) ? indices[index] : 0),
  };
}

function browserStorage(): ProgressStorage | null {
  try {
    return typeof globalThis.window === "undefined" ? null : globalThis.window.localStorage;
  } catch {
    return null;
  }
}

function storageKey(userId: string): string {
  return `learn-buddy:light-links:v1:${encodeURIComponent(userId)}`;
}

/** Resume positions belong to the selected child on this browser. */
export function loadLightLinksProgress(
  userId: string,
  boardCounts: readonly number[],
  storage: ProgressStorage | null = browserStorage(),
): LightLinksProgress {
  try {
    const raw = userId && storage?.getItem(storageKey(userId));
    const saved: unknown = raw ? JSON.parse(raw) : null;
    if (saved && typeof saved === "object" && "version" in saved && saved.version === 1) {
      return normalise(saved, boardCounts);
    }
  } catch {
    // A damaged or blocked save must not stop the child from playing.
  }
  return normalise(null, boardCounts);
}

export function saveLightLinksProgress(
  userId: string,
  progress: LightLinksProgress,
  boardCounts: readonly number[],
  storage: ProgressStorage | null = browserStorage(),
): boolean {
  if (!userId || !storage) return false;
  try {
    storage.setItem(storageKey(userId), JSON.stringify({ version: 1, ...normalise(progress, boardCounts) }));
    return true;
  } catch {
    return false;
  }
}

export function selectLightLinksLevel(
  progress: LightLinksProgress,
  levelIndex: number,
  boardCounts: readonly number[],
): LightLinksProgress {
  const next = normalise(progress, boardCounts);
  if (validIndex(levelIndex, boardCounts.length)) next.levelIndex = levelIndex;
  return next;
}

/** Save this after a win without replacing the visible completed board. */
export function advanceLightLinksBoard(
  progress: LightLinksProgress,
  boardCounts: readonly number[],
): LightLinksProgress {
  const next = normalise(progress, boardCounts);
  const count = boardCounts[next.levelIndex];
  if (Number.isInteger(count) && count > 0) {
    next.boardIndices[next.levelIndex] = (next.boardIndices[next.levelIndex] + 1) % count;
  }
  return next;
}

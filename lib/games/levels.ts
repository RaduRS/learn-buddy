/**
 * Per-game player level, derived from the running totalScore on
 * GameProgress. The DB still has a `level` column from the original
 * schema; we keep writing 1 to it (so existing data stays untouched)
 * and use this client-side helper for any UI surfacing of "Level".
 *
 * Tiers mirror the trophy thresholds on the achievements page:
 *   bronze 10  ·  silver 50  ·  gold 100
 * plus a top tier at 200 to give returning kids something to climb to.
 */

export interface LevelInfo {
  level: 1 | 2 | 3 | 4 | 5;
  label: "Starter" | "Bronze" | "Silver" | "Gold" | "Master";
  /** Total stars required to reach this level. */
  threshold: number;
  /** Stars from the start of this level toward the next, or null when maxed. */
  toNext: number | null;
  /** Total stars in this band (current threshold → next threshold). */
  bandSize: number | null;
  /** 0..1 progress toward the next level, or 1 when maxed. */
  progress: number;
}

const TIERS: { level: 1 | 2 | 3 | 4 | 5; label: LevelInfo["label"]; threshold: number }[] = [
  { level: 1, label: "Starter", threshold: 0 },
  { level: 2, label: "Bronze",  threshold: 10 },
  { level: 3, label: "Silver",  threshold: 50 },
  { level: 4, label: "Gold",    threshold: 100 },
  { level: 5, label: "Master",  threshold: 200 },
];

export function levelFromScore(totalScore: number): LevelInfo {
  let i = 0;
  while (i + 1 < TIERS.length && totalScore >= TIERS[i + 1].threshold) i++;
  const cur = TIERS[i];
  const next = TIERS[i + 1];

  if (!next) {
    return {
      level: cur.level,
      label: cur.label,
      threshold: cur.threshold,
      toNext: null,
      bandSize: null,
      progress: 1,
    };
  }

  const bandSize = next.threshold - cur.threshold;
  const into = totalScore - cur.threshold;
  return {
    level: cur.level,
    label: cur.label,
    threshold: cur.threshold,
    toNext: Math.max(0, next.threshold - totalScore),
    bandSize,
    progress: Math.max(0, Math.min(1, into / bandSize)),
  };
}

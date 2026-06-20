/**
 * Per-child game visibility. Some games are restricted to specific children
 * (matched by name, case-insensitive). Games not listed here are visible to
 * everyone. Keyed by the game's title, lower-cased.
 */
const RESTRICTED_GAMES: Record<string, string[]> = {
  "story time": ["robert"],
};

/** Whether the given child is allowed to see/play a game. */
export function canSeeGame(gameTitle: string, userName?: string | null): boolean {
  const allowed = RESTRICTED_GAMES[gameTitle.trim().toLowerCase()];
  if (!allowed) return true;
  return allowed.includes((userName ?? "").trim().toLowerCase());
}

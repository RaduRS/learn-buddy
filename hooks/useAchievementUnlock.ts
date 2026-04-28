"use client";

import { useCallback, useRef } from "react";

export interface AchievementInput {
  title: string;
  description: string;
  icon: string;
  /** When omitted, the achievement is global (not tied to a specific game). */
  gameId?: string | null;
}

interface UnlockedAchievement {
  id: string;
  userId: string;
  gameId: string | null;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

/**
 * Shared helper to POST a new achievement for the current user.
 * Deduplicates within the lifetime of the hook so spamming the same
 * unlock during a single round only sends one network request.
 */
export function useAchievementUnlock(userId: string | null | undefined) {
  const sentRef = useRef<Set<string>>(new Set());

  const unlock = useCallback(
    async (input: AchievementInput): Promise<UnlockedAchievement | null> => {
      if (!userId) return null;
      const key = `${input.gameId ?? "*"}::${input.title}`;
      if (sentRef.current.has(key)) return null;
      sentRef.current.add(key);

      try {
        const res = await fetch("/api/achievements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            gameId: input.gameId ?? null,
            title: input.title,
            description: input.description,
            icon: input.icon,
          }),
        });
        if (!res.ok) {
          // On server-side dedupe / error, allow retry next time.
          sentRef.current.delete(key);
          return null;
        }
        return (await res.json()) as UnlockedAchievement;
      } catch {
        sentRef.current.delete(key);
        return null;
      }
    },
    [userId],
  );

  return { unlock };
}

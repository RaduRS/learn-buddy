"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Sparkles, Star, Trophy as TrophyIcon } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { LoadingScreen } from "@/components/game/LoadingScreen";
import { Buddy } from "@/components/mascot/Buddy";
import { Trophy, type TrophyTier } from "@/components/achievements/Trophy";
import { CATEGORIES, toCategoryKey } from "@/lib/games/categories";
import { GameIconFor } from "@/lib/games/icons";
import { useSfx } from "@/components/sound/SoundProvider";
import type { Achievement, Game, GameProgress, User } from "@/types";

interface GameAchievement {
  game: Game;
  totalScore: number;
  timesPlayed: number;
  lastPlayed: Date;
  tiers: Record<TrophyTier, { unlocked: boolean; unlockedAt?: Date }>;
}

const THRESHOLDS: Record<TrophyTier, number> = {
  bronze: 10,
  silver: 50,
  gold: 100,
};

export default function AchievementsPage() {
  const router = useRouter();
  const { play } = useSfx();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [items, setItems] = useState<GameAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const savedUserId = localStorage.getItem("selectedUserId");
      if (!savedUserId) {
        router.push("/");
        return;
      }

      const usersResponse = await fetch("/api/users");
      const users = (await usersResponse.json()) as User[];
      const user = users.find((u) => u.id === savedUserId);
      if (!user) {
        router.push("/");
        return;
      }
      setCurrentUser(user);

      const [gamesResponse, progressResponse, achievementsResponse] = await Promise.all([
        fetch("/api/games"),
        fetch(`/api/game-progress?userId=${savedUserId}`),
        fetch(`/api/achievements?userId=${savedUserId}`),
      ]);

      if (
        !gamesResponse.ok ||
        !progressResponse.ok ||
        !achievementsResponse.ok
      ) {
        throw new Error("Failed to fetch data");
      }

      const games = (await gamesResponse.json()) as Game[];
      const progress = (await progressResponse.json()) as GameProgress[];
      const achievements = (await achievementsResponse.json()) as Achievement[];

      const gamesArr = Array.isArray(games) ? games : [];
      const progArr = Array.isArray(progress) ? progress : [];
      const achArr = Array.isArray(achievements) ? achievements : [];

      const data: GameAchievement[] = gamesArr
        .filter((g) => g.isActive)
        .map((game) => {
          const p = progArr.find((x) => x.gameId === game.id);
          const gameAchs = achArr.filter((a) => a.gameId === game.id);
          const totalScore = p?.totalScore ?? 0;

          const findUnlockDate = (tier: TrophyTier) => {
            const threshold = THRESHOLDS[tier];
            const match = gameAchs.find((a) => {
              const descNum = parseInt(a.description, 10);
              return descNum === threshold || a.description.includes(`${threshold}`);
            });
            return match?.unlockedAt ? new Date(match.unlockedAt) : undefined;
          };

          return {
            game,
            totalScore,
            timesPlayed: p?.timesPlayed ?? 0,
            lastPlayed: p?.lastPlayedAt ? new Date(p.lastPlayedAt) : new Date(),
            tiers: {
              bronze: { unlocked: totalScore >= THRESHOLDS.bronze, unlockedAt: findUnlockDate("bronze") },
              silver: { unlocked: totalScore >= THRESHOLDS.silver, unlockedAt: findUnlockDate("silver") },
              gold:   { unlocked: totalScore >= THRESHOLDS.gold,   unlockedAt: findUnlockDate("gold") },
            },
          };
        })
        .filter((ga) => ga.totalScore > 0);

      setItems(data);
    } catch (error) {
      console.error("Failed to load achievements:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleNavigate = (page: string) => {
    play("tap");
    if (page === "home") router.push("/");
    else if (page === "profile") router.push("/");
    else if (page === "settings") router.push("/");
    // achievements: stay on this page
  };

  if (loading) {
    return (
      <LoadingScreen
        tone="loading"
        message="Polishing your trophies…"
        subMessage="Buddy is counting your stars."
        fullscreen
      />
    );
  }

  const totalUnlocked = items.reduce(
    (sum, ga) => sum + Object.values(ga.tiers).filter((t) => t.unlocked).length,
    0,
  );
  const totalScore = items.reduce((sum, ga) => sum + ga.totalScore, 0);

  return (
    <div className="bg-arcade min-h-screen">
      <Header currentUser={currentUser} onNavigate={handleNavigate} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-12">
        {/* Hero */}
        <section className="surface-card cat-gold relative overflow-hidden p-5 sm:p-8 mb-6 sm:mb-8">
          <div className="grid sm:grid-cols-[auto_1fr] gap-5 sm:gap-8 items-center">
            <div className="hidden sm:block"><Buddy mood="celebrate" size="lg" /></div>
            <div className="sm:hidden flex justify-center"><Buddy mood="celebrate" size="md" /></div>
            <div className="text-center sm:text-left">
              <p className="text-xs uppercase tracking-[0.22em] font-display" style={{ color: "var(--joy-gold)" }}>
                Your trophy room
              </p>
              <h1 className="mt-1 font-display text-3xl sm:text-5xl text-arcade-strong leading-[1.05]">
                Achievements
              </h1>
              <p className="mt-2 text-arcade-mid">
                Every star you earn fills a trophy. Keep playing to unlock them all.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
                <span className="chip chip-gold">
                  <TrophyIcon className="w-4 h-4" aria-hidden />
                  <span className="font-display">{totalUnlocked}</span>
                  <span className="text-sm opacity-80">unlocked</span>
                </span>
                <span className="chip">
                  <Star className="w-4 h-4" style={{ color: "var(--joy-gold)" }} aria-hidden />
                  <span className="font-display">{totalScore}</span>
                  <span className="text-sm opacity-80">stars</span>
                </span>
                <span className="chip">
                  <Sparkles className="w-4 h-4" style={{ color: "var(--cat-music)" }} aria-hidden />
                  <span className="font-display">{items.length}</span>
                  <span className="text-sm opacity-80">games</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Empty state */}
        {items.length === 0 ? (
          <div className="surface-card cat-music p-8 sm:p-12 text-center max-w-xl mx-auto">
            <div className="flex justify-center mb-4"><Buddy mood="wave" size="lg" /></div>
            <h2 className="font-display text-2xl sm:text-3xl text-arcade-strong mb-2">
              No trophies yet — let&apos;s change that!
            </h2>
            <p className="text-arcade-mid mb-6">
              Play any game to earn your first stars. Bronze unlocks at 10, silver at 50, gold at 100.
            </p>
            <button
              type="button"
              onClick={() => {
                play("whoosh");
                router.push("/");
              }}
              className="font-display text-lg px-6 py-3 rounded-full
                         text-[var(--ink-on-color)]
                         bg-[var(--cat-music)]
                         hover:brightness-105 active:scale-[0.97]
                         shadow-[0_8px_22px_-10px_var(--cat-music-glow),inset_0_1px_0_oklch(1_0_0_/_0.4)]
                         border border-[oklch(0.45_0.10_160)]"
            >
              Start playing
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {items.map((ga) => (
              <GameAchievementCard key={ga.game.id} ga={ga} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function GameAchievementCard({ ga }: { ga: GameAchievement }) {
  const cat = CATEGORIES[toCategoryKey(ga.game.category)];

  const nextTier =
    !ga.tiers.bronze.unlocked ? "bronze"
    : !ga.tiers.silver.unlocked ? "silver"
    : !ga.tiers.gold.unlocked ? "gold"
    : null;
  const nextThreshold = nextTier ? THRESHOLDS[nextTier] : null;
  const remaining = nextThreshold !== null ? Math.max(0, nextThreshold - ga.totalScore) : 0;

  // Progress for the next-tier ring (locked tiers can show a visible fill).
  const tierProgress = (tier: TrophyTier) =>
    Math.min(100, Math.round((ga.totalScore / THRESHOLDS[tier]) * 100));

  return (
    <article className={`surface-card cat-${cat.key} overflow-hidden`}>
      {/* Header strip */}
      <div
        className="relative px-5 sm:px-6 py-4 flex items-center gap-4 border-b border-[var(--arcade-edge)]"
        style={{
          background: `linear-gradient(180deg, var(${cat.cssGlowVar}) 0%, transparent 100%)`,
        }}
      >
        <span
          aria-hidden
          className="grid place-items-center w-12 h-12 rounded-2xl
                     bg-[oklch(0.20_0.06_285_/_0.6)]
                     border border-[var(--arcade-edge)]"
        >
          <GameIconFor
            title={ga.game.title}
            className="w-6 h-6"
            strokeWidth={1.7}
            style={{ color: `var(${cat.cssVar})` }}
          />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[0.7rem] uppercase tracking-[0.18em] font-display"
             style={{ color: `var(${cat.cssVar})` }}>
            {cat.label}
          </p>
          <h2 className="font-display text-xl sm:text-2xl text-arcade-strong truncate">
            {ga.game.title}
          </h2>
        </div>
        <span className="chip chip-gold shrink-0">
          <Star className="w-4 h-4" aria-hidden />
          <span className="font-display">{ga.totalScore}</span>
        </span>
      </div>

      {/* Trophies */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 p-5 sm:p-6">
        {(["bronze", "silver", "gold"] as TrophyTier[]).map((tier) => (
          <div key={tier} className="text-center">
            <Trophy
              tier={tier}
              unlocked={ga.tiers[tier].unlocked}
              progress={tierProgress(tier)}
              size={88}
              className="mx-auto"
            />
            <div className="mt-2 font-display text-arcade-strong capitalize">
              {tier}
            </div>
            <div className="text-xs text-arcade-soft">
              {THRESHOLDS[tier]} stars
            </div>
            {ga.tiers[tier].unlocked && ga.tiers[tier].unlockedAt && (
              <div className="text-[0.7rem] mt-1 inline-flex items-center gap-1 text-arcade-soft">
                <Calendar className="w-3 h-3" aria-hidden />
                {ga.tiers[tier].unlockedAt!.toLocaleDateString()}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 sm:px-6 pb-5 sm:pb-6 flex items-center justify-between gap-3 text-sm">
        <div className="text-arcade-soft">
          Played <span className="font-display text-arcade-mid">{ga.timesPlayed}</span>{" "}
          · Last <span className="font-display text-arcade-mid">{ga.lastPlayed.toLocaleDateString()}</span>
        </div>
        {nextTier ? (
          <div className="text-arcade-mid font-display">
            {remaining} <span className="text-arcade-soft text-xs uppercase tracking-wide">to {nextTier}</span>
          </div>
        ) : (
          <div className="font-display" style={{ color: "var(--joy-gold)" }}>
            All trophies earned!
          </div>
        )}
      </div>
    </article>
  );
}

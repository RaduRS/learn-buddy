"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { GameShell } from "@/components/game/GameShell";
import { LoadingScreen } from "@/components/game/LoadingScreen";
import { resolveGameEntry } from "@/lib/games/registry";
import { Buddy } from "@/components/mascot/Buddy";
import { CATEGORIES, toCategoryKey } from "@/lib/games/categories";
import type { Game, User } from "@/types";

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  // Hydrate synchronously from sessionStorage to avoid a loading flash when
  // the user just clicked through from the home page.
  const initial = readSessionCache(gameId);
  const [game, setGame] = useState<Game | null>(initial.game);
  const [currentUser, setCurrentUser] = useState<User | null>(initial.user);
  const [loading, setLoading] = useState(initial.loading);

  const loadGameData = useCallback(async () => {
    try {
      const cachedGame = sessionStorage.getItem("pendingGameData");
      if (cachedGame) {
        const parsed = JSON.parse(cachedGame) as Game;
        if (parsed.id === gameId) {
          setGame(parsed);
          sessionStorage.removeItem("pendingGameData");
          return;
        }
      }
      const response = await fetch("/api/games");
      const games = (await response.json()) as Game[];
      setGame(games.find((g) => g.id === gameId) ?? null);
    } catch (error) {
      console.error("Failed to load game:", error);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  const loadCurrentUser = useCallback(async () => {
    try {
      const cachedUser = sessionStorage.getItem("pendingUserData");
      if (cachedUser) {
        const parsed = JSON.parse(cachedUser) as User;
        if (parsed) {
          setCurrentUser(parsed);
          sessionStorage.removeItem("pendingUserData");
          return;
        }
      }
      const savedUserId = localStorage.getItem("selectedUserId");
      if (!savedUserId) {
        router.push("/");
        return;
      }
      const response = await fetch("/api/users");
      const users = (await response.json()) as User[];
      const user = users.find((u) => u.id === savedUserId);
      if (!user) {
        router.push("/");
        return;
      }
      setCurrentUser(user);
    } catch (error) {
      console.error("Failed to load user:", error);
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    void loadGameData();
    void loadCurrentUser();
  }, [gameId, loadGameData, loadCurrentUser]);

  const handleGameComplete = useCallback(
    async (score: number) => {
      if (!currentUser || !game) return;
      try {
        const response = await fetch("/api/game-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            gameId: game.id,
            score,
            level: 1,
          }),
        });
        if (!response.ok) {
          throw new Error("Failed to save game progress");
        }
      } catch (error) {
        console.error("Error saving game progress:", error);
      }
    },
    [currentUser, game],
  );

  const handleExit = useCallback(() => router.push("/"), [router]);

  if (loading) {
    return (
      <LoadingScreen
        tone="loading"
        message="Loading game…"
        subMessage="Buddy is rolling out the dice."
        fullscreen
      />
    );
  }

  if (!game) {
    return <NotFoundShell title="Game not found" onHome={handleExit} />;
  }

  if (!currentUser) {
    return (
      <LoadingScreen
        tone="thinking"
        message="Heading home…"
        subMessage="Looking for your profile."
        fullscreen
      />
    );
  }

  const entry = resolveGameEntry(game);
  if (!entry) {
    return <NotFoundShell title="Game not available" onHome={handleExit} />;
  }

  const category = entry.category ?? toCategoryKey(game.category);
  const meta = CATEGORIES[category];
  const { Component } = entry;

  return (
    <GameShell
      title={game.title}
      kicker={meta.label}
      category={category}
      backHref="/"
      // The wrapped game still owns its own internal header (score/progress).
      // Hide the shell's hero strip until each game adopts GameShell in Phase 3.
      showHero={false}
    >
      <Suspense fallback={<LoadingScreen tone="loading" />}>
        <Component
          userId={currentUser.id}
          gameId={game.id}
          userAge={currentUser.age ?? 6}
          onGameComplete={handleGameComplete}
          onExit={handleExit}
        />
      </Suspense>
    </GameShell>
  );
}

function NotFoundShell({ title, onHome }: { title: string; onHome: () => void }) {
  return (
    <div className="bg-arcade min-h-screen flex items-center justify-center p-4">
      <div className="surface-card cat-spatial p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <Buddy mood="sad" size="lg" />
        </div>
        <h1 className="font-display text-2xl text-arcade-strong">{title}</h1>
        <p className="mt-2 text-arcade-mid">
          Buddy looked everywhere but couldn&apos;t find that game.
        </p>
        <button
          type="button"
          onClick={onHome}
          className="mt-6 inline-flex items-center gap-2 font-display px-6 py-3 rounded-full
                     text-[var(--ink-on-color)]
                     bg-[var(--cat-music)]
                     border border-[oklch(0.45_0.10_160)]
                     shadow-[0_8px_22px_-10px_var(--cat-music-glow),inset_0_1px_0_oklch(1_0_0_/_0.4)]
                     active:scale-[0.97]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back home
        </button>
      </div>
    </div>
  );
}

function readSessionCache(gameId: string) {
  if (typeof window === "undefined") {
    return { game: null as Game | null, user: null as User | null, loading: true };
  }
  try {
    const cachedGame = sessionStorage.getItem("pendingGameData");
    const cachedUser = sessionStorage.getItem("pendingUserData");
    const game = cachedGame ? (JSON.parse(cachedGame) as Game) : null;
    const user = cachedUser ? (JSON.parse(cachedUser) as User) : null;
    const cached = !!(game && game.id === gameId && user);
    if (cached) {
      sessionStorage.removeItem("pendingGameData");
      sessionStorage.removeItem("pendingUserData");
    }
    return cached
      ? { game, user, loading: false }
      : { game: null, user: null, loading: true };
  } catch {
    return { game: null, user: null, loading: true };
  }
}

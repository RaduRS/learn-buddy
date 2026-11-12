"use client";

import { Suspense, useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { GameShell } from "@/components/game/GameShell";
import { LoadingScreen } from "@/components/game/LoadingScreen";
import { UserSelectionDialog } from "@/components/user/UserSelectionDialog";
import { resolveGameEntry, slugifyTitle } from "@/lib/games/registry";
import { canSeeGame } from "@/lib/games/visibility";
import { Buddy } from "@/components/mascot/Buddy";
import { CATEGORIES, toCategoryKey } from "@/lib/games/categories";
import { useScore } from "@/hooks/useScore";
import type { CreateUserForm, Game, User } from "@/types";

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  return <GameSession key={gameId} gameId={gameId} />;
}

function GameSession({ gameId }: { gameId: string }) {
  const router = useRouter();
  const { loadUserScore } = useScore();
  const [game, setGame] = useState<Game | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [scoreWarning, setScoreWarning] = useState(false);
  const finishingProfile = useRef(false);

  const loadSession = useEffectEvent(async (signal: AbortSignal) => {
    try {
      await Promise.resolve();
      if (signal.aborted) return;
      const handoff = takeGameHandoff(gameId);
      if (handoff) {
        setGame(handoff.game);
        setCurrentUser(handoff.user);
        return;
      }

      const [gamesResponse, usersResponse] = await Promise.all([
        fetch("/api/games", { signal }),
        fetch("/api/users", { signal }),
      ]);
      if (!gamesResponse.ok || !usersResponse.ok) throw new Error("Could not load the game or profiles");
      const games = (await gamesResponse.json()) as Game[];
      const profiles = (await usersResponse.json()) as User[];
      if (signal.aborted) return;
      if (!Array.isArray(games) || !Array.isArray(profiles)) throw new Error("Invalid catalogue or profiles");
      const match = games.find((item) => item.id === gameId) ?? games.find((item) => slugifyTitle(item.title) === gameId);
      setGame(match ?? null);
      setUsers(profiles);

      let savedUserId: string | null = null;
      try { savedUserId = localStorage.getItem("selectedUserId"); } catch { /* Storage may be blocked. */ }
      const user = profiles.find((item) => item.id === savedUserId);
      if (user) {
        setCurrentUser(user);
        void loadUserScore(user.id);
      }
    } catch (error) {
      if (signal.aborted) return;
      console.error("Failed to load game session:", error);
      setLoadFailed(true);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  });

  useEffect(() => {
    const controller = new AbortController();
    void loadSession(controller.signal);
    return () => controller.abort();
  }, [gameId]);

  function chooseProfile(user: User) {
    finishingProfile.current = true;
    setCurrentUser(user);
    try { localStorage.setItem("selectedUserId", user.id); } catch { /* Keep this selection in memory. */ }
    void loadUserScore(user.id);
  }

  async function createProfile(userData: CreateUserForm) {
    if (finishingProfile.current) return;
    finishingProfile.current = true;
    setCreatingProfile(true);
    setProfileError(false);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      if (!response.ok) throw new Error("Could not save profile");
      chooseProfile((await response.json()) as User);
    } catch (error) {
      console.error("Failed to create user:", error);
      finishingProfile.current = false;
      setProfileError(true);
    } finally {
      setCreatingProfile(false);
    }
  }

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
        setScoreWarning(true);
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

  if (loadFailed) {
    return <NotFoundShell title="The game couldn’t load" message="Check your connection and try opening it again." onHome={handleExit} />;
  }

  if (!game) {
    return <NotFoundShell title="Game not found" onHome={handleExit} />;
  }

  const entry = resolveGameEntry(game);
  if (!game.isActive || !entry) {
    return <NotFoundShell title="Game not available" onHome={handleExit} />;
  }

  if (currentUser && !canSeeGame(game.title, currentUser.name)) {
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
      showScoreChip={Boolean(currentUser)}
    >
      {currentUser ? (
        <>
          {scoreWarning && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#b38e5d] bg-[#3d2f46] p-3 text-[#fff0d0]">
              <AlertCircle size={18} aria-hidden="true" className="shrink-0" />
              <p role="alert" className="min-w-0 flex-1 text-sm">We couldn’t confirm your stars were saved. Check your connection before your next round.</p>
              <button type="button" onClick={() => setScoreWarning(false)} aria-label="Dismiss score save notice"
                className="min-h-11 rounded-lg px-2 text-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">
                Dismiss
              </button>
            </div>
          )}
          <Suspense fallback={<LoadingScreen tone="loading" />}>
            <Component
              userId={currentUser.id}
              gameId={game.id}
              userAge={currentUser.age ?? 6}
              userName={currentUser.name}
              onGameComplete={handleGameComplete}
              onExit={handleExit}
            />
          </Suspense>
        </>
      ) : creatingProfile ? (
        <LoadingScreen tone="thinking" message="Creating your profile…" />
      ) : profileError ? (
        <div className="surface-card p-5 text-arcade-strong">
          <p role="alert">We couldn’t save your profile. Check your connection and try again.</p>
          <button type="button" onClick={() => setProfileError(false)}
            className="mt-3 min-h-11 rounded-xl border border-[var(--arcade-edge)] bg-[var(--arcade-card-soft)] px-4 font-display focus-visible:outline-2 focus-visible:outline-offset-2">
            Choose a profile
          </button>
        </div>
      ) : (
        <UserSelectionDialog isOpen users={users} onSelectUser={chooseProfile} onCreateUser={createProfile}
          onClose={() => { if (!finishingProfile.current) router.replace("/"); }} />
      )}
    </GameShell>
  );
}

function NotFoundShell({ title, message = "Buddy looked everywhere but couldn’t find that game.", onHome }: { title: string; message?: string; onHome: () => void }) {
  return (
    <div className="bg-arcade min-h-screen flex items-center justify-center p-4">
      <div className="surface-card cat-spatial p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <Buddy mood="sad" size="lg" />
        </div>
        <h1 className="font-display text-2xl text-arcade-strong">{title}</h1>
        <p className="mt-2 text-arcade-mid">
          {message}
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

function takeGameHandoff(gameId: string): { game: Game; user: User } | null {
  try {
    const cached = sessionStorage.getItem("pendingGameSession");
    if (!cached) return null;
    sessionStorage.removeItem("pendingGameSession");
    const handoff = JSON.parse(cached) as { game?: Game; user?: User } | null;
    if (handoff?.game?.id === gameId && handoff.user?.id) return { game: handoff.game, user: handoff.user };
  } catch {
    // Storage may be blocked or the handoff malformed. Load from the catalogue instead.
  }
  return null;
}

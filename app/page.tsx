"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Sparkles } from "lucide-react";
import { GameCard } from "@/components/game/GameCard";
import { Header } from "@/components/layout/Header";
import { UserSelectionDialog } from "@/components/user/UserSelectionDialog";
import { LoadingScreen } from "@/components/game/LoadingScreen";
import { Buddy } from "@/components/mascot/Buddy";
import { useScore } from "@/hooks/useScore";
import { useSfx } from "@/components/sound/SoundProvider";
import type { CreateUserForm, Game, User } from "@/types";

export default function Home() {
  const router = useRouter();
  const { loadUserScore, totalScore, scoreLoaded } = useScore();
  const { play } = useSfx();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  // Hydrate the saved profile once the user list is available.
  useEffect(() => {
    if (users.length === 0) return;
    const savedUserId = localStorage.getItem("selectedUserId");
    if (!savedUserId) return;
    const savedUser = users.find((user) => user.id === savedUserId);
    if (savedUser) {
      setCurrentUser(savedUser);
      void loadUserScore(savedUser.id);
    }
  }, [users, loadUserScore]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [usersResponse, gamesResponse] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/games"),
      ]);
      const usersData = (await usersResponse.json()) as User[];
      const gamesData = (await gamesResponse.json()) as Game[];
      setUsers(usersData);
      setGames(gamesData);
      if (usersData.length === 0) setShowUserDialog(true);
    } catch (error) {
      console.error("Failed to load data:", error);
      setErrorMessage("Couldn't load games. Please refresh and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (userData: CreateUserForm) => {
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      if (!response.ok) throw new Error("Failed to create user");
      const newUser = (await response.json()) as User;
      setUsers((prev) => [newUser, ...prev]);
      setCurrentUser(newUser);
      localStorage.setItem("selectedUserId", newUser.id);
      void loadUserScore(newUser.id);
    } catch (error) {
      console.error("Failed to create user:", error);
      setErrorMessage("Couldn't save the new profile. Please try again.");
    }
  };

  const handleSelectUser = (user: User) => {
    play("ding");
    setCurrentUser(user);
    localStorage.setItem("selectedUserId", user.id);
    void loadUserScore(user.id);
  };

  const handlePlayGame = (gameId: string) => {
    if (!currentUser) {
      setShowUserDialog(true);
      return;
    }
    const game = games.find((g) => g.id === gameId);
    if (!game?.isActive) return;
    try {
      sessionStorage.setItem("pendingGameData", JSON.stringify(game));
      sessionStorage.setItem("pendingUserData", JSON.stringify(currentUser));
    } catch {
      // sessionStorage may be unavailable — game page falls back to API fetch
    }
    router.push(`/game/${gameId}`);
  };

  const handleNavigation = (page: string) => {
    switch (page) {
      case "profile":
        setShowUserDialog(true);
        break;
      case "achievements":
        router.push("/achievements");
        break;
      case "settings":
        // Settings live in the profile dialog for now (mute is in header).
        setShowUserDialog(true);
        break;
      default:
        break;
    }
  };

  if (isLoading) {
    return (
      <LoadingScreen
        tone="preparing"
        message="Loading Learn Buddy…"
        subMessage="Buddy is rolling out the red carpet."
        fullscreen
      />
    );
  }

  const greeting = currentUser
    ? `Hi, ${currentUser.name}!`
    : "Welcome, friend!";
  const subline = currentUser
    ? "Pick a game and let's play."
    : "Choose your profile to start playing.";

  return (
    <div className="bg-arcade min-h-screen">
      <Header currentUser={currentUser} onNavigate={handleNavigation} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-12">
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 surface-card cat-spatial p-4 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 shrink-0" style={{ color: "var(--cat-spatial)" }} />
            <span className="flex-1 text-arcade-mid">{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              aria-label="Dismiss"
              className="text-arcade-soft hover:text-arcade-strong px-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Hero */}
        <section className="relative mt-2 sm:mt-4 mb-8 sm:mb-10">
          <div className="surface-card cat-music relative overflow-hidden p-5 sm:p-8 lg:p-10">
            <div className="grid sm:grid-cols-[auto_1fr] gap-5 sm:gap-8 items-center">
              <div className="hidden sm:block">
                <Buddy mood={currentUser ? "cheer" : "wave"} size="xl" />
              </div>
              <div className="sm:hidden flex justify-center">
                <Buddy mood={currentUser ? "cheer" : "wave"} size="lg" />
              </div>

              <div className="text-center sm:text-left">
                <p
                  className="text-xs uppercase tracking-[0.22em] font-display"
                  style={{ color: "var(--cat-music)" }}
                >
                  Your learning playground
                </p>
                <h1 className="mt-1 font-display text-3xl sm:text-5xl text-arcade-strong leading-[1.05] flex items-baseline gap-2 sm:gap-3 justify-center sm:justify-start flex-wrap">
                  <span>{greeting}</span>
                  <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 self-center" style={{ color: "var(--joy-gold)" }} />
                </h1>
                <p className="mt-2 text-arcade-mid text-base sm:text-lg max-w-md mx-auto sm:mx-0">
                  {subline}
                </p>

                {currentUser && scoreLoaded && (
                  <div className="mt-5 flex flex-wrap gap-2 justify-center sm:justify-start">
                    <span className="chip chip-gold">
                      <span className="font-display text-base leading-none">
                        {totalScore}
                      </span>
                      <span className="text-sm opacity-80">stars</span>
                    </span>
                    <span className="chip">
                      <span className="text-sm opacity-80">Profile:</span>
                      <span className="font-display text-base leading-none">
                        {currentUser.name}
                      </span>
                    </span>
                  </div>
                )}

                {!currentUser && (
                  <button
                    type="button"
                    onClick={() => {
                      play("tap");
                      setShowUserDialog(true);
                    }}
                    className="mt-5 font-display text-lg px-6 py-3 rounded-full
                               text-[var(--ink-on-color)]
                               bg-[var(--joy-gold)]
                               hover:brightness-105 active:scale-[0.97]
                               shadow-[0_8px_22px_-10px_var(--joy-gold-glow),inset_0_1px_0_oklch(1_0_0_/_0.4)]
                               border border-[oklch(0.65_0.16_75)]"
                  >
                    Choose your profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Games grid */}
        {games.length > 0 && (
          <section>
            <h2 className="font-display text-2xl sm:text-3xl text-arcade-strong mb-4 sm:mb-6 flex items-baseline gap-2">
              Choose your game
              <span className="text-sm font-display text-arcade-soft">
                {games.filter((g) => g.isActive).length} ready to play
              </span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {games.map((game) => {
                const progress = currentUser?.gameProgress?.find(
                  (p) => p.gameId === game.id,
                );
                return (
                  <GameCard
                    key={game.id}
                    game={game}
                    progress={progress}
                    onPlay={handlePlayGame}
                  />
                );
              })}
            </div>
          </section>
        )}
      </main>

      <UserSelectionDialog
        isOpen={showUserDialog}
        onClose={() => setShowUserDialog(false)}
        users={users}
        onSelectUser={handleSelectUser}
        onCreateUser={handleCreateUser}
      />
    </div>
  );
}

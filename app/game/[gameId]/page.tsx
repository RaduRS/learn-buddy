"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { LoadingScreen } from "@/components/game/LoadingScreen";
import { ArrowLeft } from "lucide-react";
import { resolveGameEntry } from "@/lib/games/registry";
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
    loadGameData();
    loadCurrentUser();
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

  const handleNavigate = useCallback(
    (page: string) => {
      switch (page) {
        case "home":
          router.push("/");
          break;
        case "achievements":
          router.push("/achievements");
          break;
        case "profile":
        case "settings":
        default:
          router.push("/");
      }
    },
    [router],
  );

  const handleExit = useCallback(() => router.push("/"), [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <LoadingSkeleton message="Loading game..." subMessage="Getting everything ready" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="text-center p-6">
            <h1 className="text-xl font-semibold mb-4">Game not found</h1>
            <Button onClick={() => router.push("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-600">
            Redirecting to homepage...
          </div>
        </div>
      </div>
    );
  }

  const entry = resolveGameEntry(game);
  if (!entry) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="text-center p-6">
            <h1 className="text-xl font-semibold mb-4">Game not available</h1>
            <Button onClick={() => router.push("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { Component } = entry;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header currentUser={currentUser} onNavigate={handleNavigate} />

      <div className="max-w-4xl mx-auto p-4">
        <Suspense fallback={<LoadingScreen tone="loading" />}>
          <Component
            userId={currentUser.id}
            gameId={game.id}
            userAge={currentUser.age ?? 6}
            onGameComplete={handleGameComplete}
            onExit={handleExit}
          />
        </Suspense>
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

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import TrueFalseGame from "@/components/game/TrueFalseGame";
import SubitizingGame from "@/components/game/SubitizingGame";
import PuzzleGame from "@/components/game/PuzzleGame";
import MemoryMatchGame from "@/components/game/MemoryMatchGame";
import MemoryMatchConfig from "@/components/game/MemoryMatchConfig";
import NumberFunGame from "@/components/game/NumberFunGame";
import MusicLearningGame from "@/components/game/MusicLearningGame";
import ShapesGame from "@/components/game/ShapesGame";
import ReadingHelperGame from "@/components/game/ReadingHelperGame";
import MathSparkGame from "@/components/game/MathSparkGame";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ArrowLeft } from "lucide-react";
import type { User, Game } from "@/types";

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  // Check sessionStorage synchronously before first render to avoid loading flash
  const getInitialData = () => {
    if (typeof window === "undefined") return { game: null, user: null, loading: true };
    try {
      const cachedGame = sessionStorage.getItem("pendingGameData");
      const cachedUser = sessionStorage.getItem("pendingUserData");
      const game = cachedGame ? (JSON.parse(cachedGame) as Game) : null;
      const user = cachedUser ? (JSON.parse(cachedUser) as User) : null;
      // If both are cached and game matches, skip loading entirely
      const cached = !!(game && game.id === gameId && user);
      if (cached) {
        sessionStorage.removeItem("pendingGameData");
        sessionStorage.removeItem("pendingUserData");
      }
      return cached ? { game, user, loading: false } : { game: null, user: null, loading: true };
    } catch {
      return { game: null, user: null, loading: true };
    }
  };

  const initial = getInitialData();
  const [game, setGame] = useState<Game | null>(initial.game);
  const [currentUser, setCurrentUser] = useState<User | null>(initial.user);
  const [loading, setLoading] = useState(initial.loading);
  const [memoryMatchConfig, setMemoryMatchConfig] = useState<{
    rows: number;
    cols: number;
    pairs: number;
  } | null>(null);

  const loadGameData = useCallback(async () => {
    try {
      // Try sessionStorage cache first (instant, no network)
      const cachedGame = sessionStorage.getItem("pendingGameData");
      if (cachedGame) {
        const parsed = JSON.parse(cachedGame) as Game;
        if (parsed.id === gameId) {
          setGame(parsed);
          sessionStorage.removeItem("pendingGameData");
          return;
        }
      }
      // Fallback: fetch from API
      const response = await fetch("/api/games");
      const games = await response.json();
      const currentGame = games.find((g: Game) => g.id === gameId);
      setGame(currentGame || null);
    } catch (error) {
      console.error("Failed to load game:", error);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  const loadCurrentUser = useCallback(async () => {
    try {
      // Try sessionStorage cache first (instant, no network)
      const cachedUser = sessionStorage.getItem("pendingUserData");
      if (cachedUser) {
        const parsed = JSON.parse(cachedUser) as User;
        if (parsed) {
          setCurrentUser(parsed);
          sessionStorage.removeItem("pendingUserData");
          return;
        }
      }
      // Fallback: fetch from API
      const savedUserId = localStorage.getItem("selectedUserId");
      if (!savedUserId) {
        router.push("/");
        return;
      }

      const response = await fetch("/api/users");
      const users = await response.json();
      const user = users.find((u: User) => u.id === savedUserId);

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

  const handleGameComplete = async (score: number, _totalQuestions: number) => {
    if (!currentUser || !game) return;

    try {
      // Save game progress to database with the actual score from the game
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

      console.log(`Game completed with score: ${score}/${_totalQuestions}`);
    } catch (error) {
      console.error("Error saving game progress:", error);
    }
  };

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

  const renderGame = () => {
    const normalizedTitle = game.title.toLowerCase().replace(/\s+/g, "");
    if (game.title === "Subitizing") {
      return (
        <SubitizingGame
          userId={currentUser.id}
          gameId={game.id}
          userAge={currentUser.age || 6}
          onGameComplete={handleGameComplete}
        />
      );
    }

    if (game.title === "Puzzle") {
      return (
        <PuzzleGame
          userId={currentUser.id}
          gameId={game.id}
          userAge={currentUser.age || 6}
          onGameComplete={handleGameComplete}
        />
      );
    }

    if (game.title === "Memory Match") {
      if (!memoryMatchConfig) {
        return (
          <MemoryMatchConfig
            onConfigSelect={setMemoryMatchConfig}
            onCancel={() => router.push("/")}
          />
        );
      }

      return (
        <MemoryMatchGame
          userId={currentUser.id}
          gameId={game.id}
          userAge={currentUser.age || 6}
          gridConfig={memoryMatchConfig}
          onGameComplete={handleGameComplete}
        />
      );
    }

    if (game.title === "Number Fun") {
      return (
        <NumberFunGame
          userId={currentUser.id}
          gameId={game.id}
          userAge={currentUser.age || 6}
          onGameComplete={handleGameComplete}
        />
      );
    }

    if (game.title === "Music Maker") {
      return (
        <MusicLearningGame
          userId={currentUser.id}
          gameId={game.id}
          userAge={currentUser.age || 6}
          onGameComplete={handleGameComplete}
        />
      );
    }

    if (game.title === "Shapes") {
      return (
        <ShapesGame
          userId={currentUser.id}
          gameId={game.id}
          userAge={currentUser.age || 6}
          onGameComplete={handleGameComplete}
        />
      );
    }

    if (game.category.toLowerCase() === "reading") {
      return (
        <ReadingHelperGame
          userId={currentUser.id}
          gameId={game.id}
          userAge={currentUser.age || 6}
          onGameComplete={handleGameComplete}
        />
      );
    }

    if (normalizedTitle === "mathspark") {
      return (
        <MathSparkGame gameId={game.id} onGameComplete={handleGameComplete} />
      );
    }

    return (
      <TrueFalseGame
        userId={currentUser.id}
        gameId={game.id}
        userAge={currentUser.age || 6}
        onGameComplete={handleGameComplete}
      />
    );
  };

  const handleNavigate = (page: string) => {
    switch (page) {
      case "home":
        router.push("/");
        break;
      case "achievements":
        router.push("/achievements");
        break;
      case "profile":
        router.push("/");
        break;
      case "settings":
        router.push("/");
        break;
      default:
        router.push("/");
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header currentUser={currentUser} onNavigate={handleNavigate} />

      <div className="max-w-4xl mx-auto p-4">
        {/* Game Component */}
        {renderGame()}
      </div>
    </div>
  );
}

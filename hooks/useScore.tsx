"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { GameProgress } from "@/types";

interface ScoreContextType {
  totalScore: number;
  incrementScore: (gameId: string, points?: number) => void;
  setTotalScore: (score: number) => void;
  loadUserScore: (userId: string) => Promise<void>;
}

const ScoreContext = createContext<ScoreContextType | undefined>(undefined);

interface ScoreProviderProps {
  children: ReactNode;
}

export function ScoreProvider({ children }: ScoreProviderProps) {
  const [totalScore, setTotalScore] = useState<number>(0);

  const incrementScore = async (gameId: string, points: number = 1) => {
    const currentUserId = localStorage.getItem("selectedUserId");
    if (!currentUserId) return;

    try {
      // Update score in database
      const response = await fetch("/api/game-progress/update-total", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUserId,
          gameId: gameId,
          pointsToAdd: points,
        }),
      });

      if (response.ok) {
        await response.json();
        // Reload the user's total score to get the updated total across all games
        await loadUserScore(currentUserId);
      }
    } catch (error) {
      console.error("Failed to increment score:", error);
      // Fallback: increment locally
      setTotalScore((prev) => prev + points);
    }
  };

  const loadUserScore = async (userId: string) => {
    try {
      const response = await fetch(`/api/game-progress?userId=${userId}`);
      if (response.ok) {
        const progress = await response.json();
        const total = progress.reduce(
          (sum: number, p: GameProgress) => sum + (p.totalScore || 0),
          0
        );
        setTotalScore(total);
      }
    } catch (error) {
      console.error("Failed to load user score:", error);
      setTotalScore(0);
    }
  };

  const contextValue: ScoreContextType = {
    totalScore,
    incrementScore,
    setTotalScore,
    loadUserScore,
  };

  return (
    <ScoreContext.Provider value={contextValue}>
      {children}
    </ScoreContext.Provider>
  );
}

export function useScore(): ScoreContextType {
  const context = useContext(ScoreContext);
  if (context === undefined) {
    throw new Error("useScore must be used within a ScoreProvider");
  }
  return context;
}

"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { GameProgress } from "@/types";

interface ScoreContextType {
  totalScore: number;
  scoreLoaded: boolean;
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
  const [scoreLoaded, setScoreLoaded] = useState(false);

  const incrementScore = async (gameId: string, points: number = 1) => {
    const currentUserId = localStorage.getItem("selectedUserId");
    if (!currentUserId) return;

    // Optimistically update local state immediately
    setTotalScore((prev) => prev + points);

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

      if (!response.ok) {
        // Revert on failure
        setTotalScore((prev) => prev - points);
      }
    } catch (error) {
      console.error("Failed to increment score:", error);
      // Already optimistically updated, no revert for network errors
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
      setScoreLoaded(true);
    } catch (error) {
      console.error("Failed to load user score:", error);
      setTotalScore(0);
      setScoreLoaded(true);
    }
  };

  const contextValue: ScoreContextType = {
    totalScore,
    scoreLoaded,
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

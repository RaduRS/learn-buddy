"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RotateCcw, Trophy, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShapesGameProps {
  userId?: string;
  gameId?: string;
  userAge: number;
  onGameComplete: (score: number, totalShapes: number) => void;
}

type ShapeConfig = {
  id: string;
  label: string;
  colorClass: string;
  sizeClass?: string;
  className?: string;
  style?: CSSProperties;
};

const shapes: ShapeConfig[] = [
  {
    id: "circle",
    label: "Circle",
    colorClass: "bg-rose-400",
    className: "rounded-full",
  },
  {
    id: "square",
    label: "Square",
    colorClass: "bg-blue-400",
  },
  {
    id: "rectangle",
    label: "Rectangle",
    colorClass: "bg-green-400",
    sizeClass: "w-24 h-14 sm:w-28 sm:h-16",
  },
  {
    id: "triangle",
    label: "Triangle",
    colorClass: "bg-yellow-400",
    style: {
      clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
    },
  },
  {
    id: "oval",
    label: "Oval",
    colorClass: "bg-purple-400",
    sizeClass: "w-14 h-24 sm:w-16 sm:h-28",
    className: "rounded-full",
  },
  {
    id: "diamond",
    label: "Diamond",
    colorClass: "bg-pink-400",
    className: "rotate-45",
  },
  {
    id: "pentagon",
    label: "Pentagon",
    colorClass: "bg-orange-400",
    style: {
      clipPath: "polygon(50% 0%, 0% 38%, 18% 100%, 82% 100%, 100% 38%)",
    },
  },
  {
    id: "hexagon",
    label: "Hexagon",
    colorClass: "bg-teal-400",
    style: {
      clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
    },
  },
  {
    id: "octagon",
    label: "Octagon",
    colorClass: "bg-indigo-400",
    style: {
      clipPath:
        "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
    },
  },
  {
    id: "star",
    label: "Star",
    colorClass: "bg-amber-400",
    style: {
      clipPath:
        "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
    },
  },
  {
    id: "trapezoid",
    label: "Trapezoid",
    colorClass: "bg-lime-400",
    style: {
      clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)",
    },
  },
  {
    id: "parallelogram",
    label: "Parallelogram",
    colorClass: "bg-cyan-400",
    style: {
      clipPath: "polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)",
    },
  },
];

export default function ShapesGame({ onGameComplete }: ShapesGameProps) {
  const [lastSpoken, setLastSpoken] = useState<string | null>(null);
  const [clickCount, setClickCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const speak = (text: string) => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) {
      setError("Speech is not supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  };

  const handleShapeClick = (shape: ShapeConfig) => {
    setError(null);
    setLastSpoken(shape.label);
    setClickCount((prev) => prev + 1);
    speak(shape.label);
  };

  const handleRepeat = () => {
    if (lastSpoken) {
      speak(lastSpoken);
    }
  };

  const handleFinish = () => {
    setIsComplete(true);
    onGameComplete(clickCount, shapes.length);
  };

  const handleReset = () => {
    setIsComplete(false);
    setClickCount(0);
    setLastSpoken(null);
    setError(null);
  };

  if (isComplete) {
    return (
      <div className="text-center p-8 space-y-6">
        <div className="space-y-4">
          <Trophy className="h-16 w-16 text-yellow-500 mx-auto" />
          <h2 className="text-3xl font-bold text-green-600">Great Job!</h2>
          <p className="text-xl">
            You explored {clickCount} shape{clickCount === 1 ? "" : "s"}!
          </p>
        </div>
        <Button onClick={handleReset} size="lg">
          <RotateCcw className="h-4 w-4 mr-2" />
          Play Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card className="mb-6">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-gray-800">
                Tap a shape to hear its name
              </h2>
              <p className="text-sm text-gray-600">
                Explore circles, squares, triangles, and more.
              </p>
            </div>
            <Badge className="w-fit">Shapes</Badge>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">Clicks: {clickCount}</Badge>
            {lastSpoken && (
              <Badge variant="secondary">Last: {lastSpoken}</Badge>
            )}
            <Button
              onClick={handleRepeat}
              variant="outline"
              size="sm"
              disabled={!lastSpoken}
            >
              <Volume2 className="h-4 w-4 mr-2" />
              Repeat
            </Button>
            <Button onClick={handleFinish} size="sm">
              Finish
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {shapes.map((shape) => {
          const sizeClass = shape.sizeClass ?? "w-16 h-16 sm:w-20 sm:h-20";
          const shapeClassName = cn(
            "shadow-sm",
            sizeClass,
            shape.colorClass,
            shape.className,
          );

          return (
            <button
              key={shape.id}
              type="button"
              onClick={() => handleShapeClick(shape)}
              className="w-full text-left focus:outline-none"
              aria-label={shape.label}
            >
              <Card
                className={cn(
                  "transition hover:shadow-md",
                  lastSpoken === shape.label
                    ? "ring-2 ring-indigo-400"
                    : "ring-1 ring-transparent",
                )}
              >
                <CardContent className="p-4 flex flex-col items-center justify-center gap-3">
                  <div className={shapeClassName} style={shape.style} />
                  <span className="text-sm font-semibold text-gray-700">
                    {shape.label}
                  </span>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}

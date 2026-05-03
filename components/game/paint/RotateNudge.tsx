"use client";

import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import { Buddy } from "@/components/mascot/Buddy";

/**
 * Shown when the device is in portrait. Hidden once landscape is detected.
 * Uses matchMedia so it stays in sync with rotation without polling.
 */
export function RotateNudge() {
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(orientation: portrait)");
    const update = () => setPortrait(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  if (!portrait) return null;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-[oklch(0_0_0_/_0.7)] p-6">
      <div className="surface-card cat-creative p-8 max-w-sm text-center">
        <div className="flex justify-center mb-4">
          <Buddy mood="wave" size="lg" />
        </div>
        <RotateCw
          className="mx-auto w-12 h-12 mb-3"
          style={{ color: "var(--cat-creative)" }}
          strokeWidth={1.6}
        />
        <h3 className="font-display text-2xl text-arcade-strong">
          Turn your tablet sideways
        </h3>
        <p className="mt-2 text-arcade-mid">
          Painting works best in landscape — give yourself a big canvas!
        </p>
      </div>
    </div>
  );
}

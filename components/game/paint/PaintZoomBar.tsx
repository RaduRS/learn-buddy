"use client";

import { Maximize2, Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from "@/lib/games/paint/constants";
import { cn } from "@/lib/utils";

interface PaintZoomBarProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onFit: () => void;
}

export function PaintZoomBar({ zoom, onZoomChange, onFit }: PaintZoomBarProps) {
  const dec = () => onZoomChange(clamp(zoom - ZOOM_STEP));
  const inc = () => onZoomChange(clamp(zoom + ZOOM_STEP));

  return (
    <div
      className="surface-card cat-creative px-2 py-1.5 inline-flex items-center gap-1"
      role="group"
      aria-label="Canvas zoom"
    >
      <ZoomBtn label="Zoom out" disabled={zoom <= ZOOM_MIN + 0.001} onClick={dec}>
        <Minus className="w-4 h-4" strokeWidth={2} />
      </ZoomBtn>

      <span
        className="font-display text-sm text-arcade-strong w-14 text-center tabular-nums"
        aria-live="polite"
      >
        {Math.round(zoom * 100)}%
      </span>

      <ZoomBtn label="Zoom in" disabled={zoom >= ZOOM_MAX - 0.001} onClick={inc}>
        <Plus className="w-4 h-4" strokeWidth={2} />
      </ZoomBtn>

      <span aria-hidden className="self-stretch w-px bg-[var(--arcade-edge)] mx-1" />

      <ZoomBtn label="Fit to screen" onClick={onFit}>
        <Maximize2 className="w-4 h-4" strokeWidth={2} />
      </ZoomBtn>
    </div>
  );
}

function ZoomBtn({
  children,
  label,
  disabled,
  onClick,
}: {
  children: ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "w-9 h-9 rounded-xl grid place-items-center transition-transform active:scale-90",
        "bg-[var(--arcade-card-soft)] border border-[var(--arcade-edge)] text-arcade-strong",
        disabled && "opacity-30 cursor-not-allowed",
      )}
    >
      {children}
    </button>
  );
}

function clamp(z: number): number {
  if (z < ZOOM_MIN) return ZOOM_MIN;
  if (z > ZOOM_MAX) return ZOOM_MAX;
  return z;
}

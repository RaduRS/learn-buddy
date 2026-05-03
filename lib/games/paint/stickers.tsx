"use client";

import {
  Apple,
  Cat,
  Cloud,
  Crown,
  Dog,
  Flower,
  Gift,
  Heart,
  Music,
  Smile,
  Sparkles,
  Star,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

export interface Sticker {
  id: string;
  label: string;
  Icon: LucideIcon;
}

/**
 * Sticker library — twelve Lucide icons that look great as a stamp at
 * 96px and read well from across a tablet screen.
 */
export const STICKERS: readonly Sticker[] = [
  { id: "star",     label: "Star",     Icon: Star },
  { id: "heart",    label: "Heart",    Icon: Heart },
  { id: "sun",      label: "Sun",      Icon: Sun },
  { id: "cloud",    label: "Cloud",    Icon: Cloud },
  { id: "flower",   label: "Flower",   Icon: Flower },
  { id: "smile",    label: "Smile",    Icon: Smile },
  { id: "cat",      label: "Cat",      Icon: Cat },
  { id: "dog",      label: "Dog",      Icon: Dog },
  { id: "apple",    label: "Apple",    Icon: Apple },
  { id: "sparkles", label: "Sparkles", Icon: Sparkles },
  { id: "crown",    label: "Crown",    Icon: Crown },
  { id: "music",    label: "Music",    Icon: Music },
  { id: "gift",     label: "Gift",     Icon: Gift },
];

/**
 * Pre-render each Lucide icon to an HTMLImageElement once. Tinting at
 * stamp time happens via canvas composite (see renderer.ts), so we render
 * the SVG once with a black stroke and recolor on draw.
 *
 * Returns a promise that resolves with a Map keyed by sticker id.
 */
export async function loadStickerImages(): Promise<Map<string, HTMLImageElement>> {
  const map = new Map<string, HTMLImageElement>();
  await Promise.all(
    STICKERS.map(async ({ id, Icon }) => {
      const svg = renderToStaticMarkup(
        createElement(Icon, {
          // Solid black so source-in composite tinting is predictable.
          color: "#000",
          strokeWidth: 1.6,
          size: 96,
          fill: "none",
        }),
      );
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const img = await loadImage(url);
      // Keep the URL alive; revoking it sometimes invalidates the Image
      // before the first draw on slower devices. We accept the tiny leak.
      map.set(id, img);
    }),
  );
  return map;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

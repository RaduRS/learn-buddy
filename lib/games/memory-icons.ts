/**
 * Curated icon set used as Memory Match card faces.
 *
 * Each entry is { name, color } where `name` is a lucide-react icon
 * component name. We deliberately use a small, kid-friendly subset and
 * pre-pair each card with a vibrant color so two icons never look alike
 * in the grid. The route picks N pairs from this list.
 */

export interface MemoryIcon {
  /** Lucide icon component name (e.g. "Apple", "Star"). */
  name: string;
  /** CSS color for the icon stroke/fill. */
  color: string;
}

export const MEMORY_ICONS: MemoryIcon[] = [
  { name: "Apple",       color: "#ef4444" },
  { name: "Banana",      color: "#facc15" },
  { name: "Cherry",      color: "#dc2626" },
  { name: "Grape",       color: "#a855f7" },
  { name: "Carrot",      color: "#f97316" },

  { name: "Cat",         color: "#94a3b8" },
  { name: "Dog",         color: "#ca8a04" },
  { name: "Bird",        color: "#3b82f6" },
  { name: "Fish",        color: "#06b6d4" },
  { name: "Rabbit",      color: "#fbbf24" },
  { name: "Squirrel",    color: "#b45309" },
  { name: "Worm",        color: "#84cc16" },
  { name: "Bug",         color: "#10b981" },
  { name: "Snail",       color: "#a78bfa" },

  { name: "Sun",         color: "#f59e0b" },
  { name: "Moon",        color: "#94a3b8" },
  { name: "Star",        color: "#fde047" },
  { name: "Cloud",       color: "#cbd5e1" },
  { name: "CloudRain",   color: "#60a5fa" },
  { name: "CloudSnow",   color: "#bae6fd" },
  { name: "Rainbow",     color: "#ec4899" },

  { name: "Flower",      color: "#f472b6" },
  { name: "Flower2",     color: "#fb7185" },
  { name: "TreePine",    color: "#16a34a" },
  { name: "Trees",       color: "#22c55e" },
  { name: "Leaf",        color: "#84cc16" },
  { name: "Sprout",      color: "#65a30d" },

  { name: "Heart",       color: "#f43f5e" },
  { name: "Smile",       color: "#fbbf24" },
  { name: "Sparkles",    color: "#facc15" },
  { name: "Crown",       color: "#f59e0b" },
  { name: "Gem",         color: "#06b6d4" },
  { name: "Diamond",     color: "#22d3ee" },
  { name: "Trophy",      color: "#eab308" },
  { name: "Medal",       color: "#fbbf24" },
  { name: "Gift",        color: "#ec4899" },

  { name: "Plane",       color: "#3b82f6" },
  { name: "Rocket",      color: "#ef4444" },
  { name: "Car",         color: "#6366f1" },
  { name: "Bus",         color: "#f97316" },
  { name: "Train",       color: "#0ea5e9" },
  { name: "Bike",        color: "#14b8a6" },
  { name: "Sailboat",    color: "#0284c7" },
  { name: "Anchor",      color: "#0369a1" },

  { name: "Music",       color: "#8b5cf6" },
  { name: "Bell",        color: "#fbbf24" },
  { name: "Drum",        color: "#dc2626" },

  { name: "Pizza",       color: "#fb923c" },
  { name: "IceCream",    color: "#f9a8d4" },
  { name: "IceCreamCone",color: "#a855f7" },
  { name: "Cookie",      color: "#92400e" },
  { name: "Cake",        color: "#ec4899" },
  { name: "Candy",       color: "#f43f5e" },
  { name: "Coffee",      color: "#78350f" },
  { name: "Donut",       color: "#fb7185" },

  { name: "Tent",        color: "#78716c" },
  { name: "Mountain",    color: "#64748b" },
  { name: "Snowflake",   color: "#7dd3fc" },
  { name: "Umbrella",    color: "#a855f7" },
  { name: "Lightbulb",   color: "#fde047" },
  { name: "Battery",     color: "#22c55e" },
  { name: "Key",         color: "#ca8a04" },
  { name: "Lock",        color: "#475569" },
  { name: "Camera",      color: "#0ea5e9" },
  { name: "Glasses",     color: "#1e293b" },
  { name: "HardHat",     color: "#7c3aed" },
];

/** Pick N unique icons. Caller is responsible for shuffling pair order. */
export function pickMemoryIcons(count: number): MemoryIcon[] {
  const pool = [...MEMORY_ICONS];
  // Deduplicate by name in case the curated list ever ships a duplicate.
  const seen = new Set<string>();
  const unique = pool.filter((m) => {
    if (seen.has(m.name)) return false;
    seen.add(m.name);
    return true;
  });
  // Fisher-Yates shuffle.
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }
  return unique.slice(0, Math.min(count, unique.length));
}

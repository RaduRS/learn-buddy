import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Whether a child should get the simplest math (answers capped at 10,
 * add & subtract only). Currently tuned for Eddie.
 */
export function isEasyMathChild(name?: string | null): boolean {
  return (name ?? "").trim().toLowerCase() === "eddie";
}

/** Largest answer/result allowed for an easy-math child. */
export const EASY_MATH_MAX = 10;

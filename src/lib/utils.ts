import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * METRIC FORMATTING UTILITIES
 * ============================
 * These utilities standardize how we display metrics across the app.
 * 
 * KEY PRINCIPLES:
 * 1. Zero (0) is a valid metric value and should display as "0"
 * 2. Only null/undefined/NaN should display as "—" (dash)
 * 3. Never use truthy/falsy checks (|| operator) for metric values
 * 4. Always use explicit null checks (?? operator or === null)
 * 
 * EXAMPLES:
 * ✅ CORRECT:   value ?? null  (preserves 0, defaults null/undefined to null)
 * ✅ CORRECT:   value === null (explicit null check)
 * ❌ INCORRECT: value || 0      (coerces both null AND 0 to 0)
 * ❌ INCORRECT: value || '—'    (coerces 0 to '—')
 * ❌ INCORRECT: !value          (treats 0 as falsy)
 */

/**
 * Format a metric value, distinguishing between 0 and truly missing data
 * @param value - The metric value to format
 * @returns "0" for zero, "—" for null/undefined, or the value as string
 */
export function formatMetric(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }
  if (value === 0) {
    return "0";
  }
  return value.toString();
}

/**
 * Format a number with K/M suffixes for large values
 * @param value - The number to format
 * @returns Formatted string with K/M suffix or "—" for missing data
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }
  if (value === 0) {
    return "0";
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Format difficulty score (0-100) or show dash for missing data
 * @param difficulty - The difficulty score
 * @returns Formatted string or "—" for missing data
 */
export function formatDifficulty(difficulty: number | null | undefined): string {
  if (difficulty === null || difficulty === undefined || isNaN(difficulty)) {
    return "—";
  }
  return difficulty.toString();
}

/**
 * Format currency value (CPC)
 * @param value - The currency value
 * @returns Formatted string with $ prefix or "—" for missing data
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }
  return `$${value.toFixed(2)}`;
}

/**
 * Get color class for difficulty score
 * @param difficulty - The difficulty score
 * @returns Tailwind color class
 */
export function getDifficultyColor(difficulty: number | null | undefined): string {
  if (difficulty === null || difficulty === undefined || isNaN(difficulty)) {
    return "text-muted-foreground";
  }
  if (difficulty < 30) {
    return "text-success";
  }
  if (difficulty < 40) {
    return "text-warning";
  }
  return "text-destructive";
}

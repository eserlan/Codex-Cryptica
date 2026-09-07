import type { AnswerConfig } from "./schema";
import { browserStorage, type StorageLike } from "$lib/utils/runtime-deps";

export type AnswerSortOption = "category" | "az" | "za" | "newest" | "oldest";

export const DEFAULT_ANSWER_SORT: AnswerSortOption = "category";

export const ANSWER_SORT_STORAGE_KEY = "codex_answers_sort";

export interface AnswerSortItem {
  id: AnswerSortOption;
  label: string;
  icon: string;
}

export const ANSWER_SORT_OPTIONS: AnswerSortItem[] = [
  { id: "category", label: "Category", icon: "icon-[lucide--layout-grid]" },
  { id: "az", label: "A to Z", icon: "icon-[lucide--arrow-down-a-z]" },
  { id: "za", label: "Z to A", icon: "icon-[lucide--arrow-up-z-a]" },
  {
    id: "newest",
    label: "Newest first",
    icon: "icon-[lucide--calendar-arrow-down]",
  },
  {
    id: "oldest",
    label: "Oldest first",
    icon: "icon-[lucide--calendar-arrow-up]",
  },
];

/**
 * Type guard verifying if a value matches a valid AnswerSortOption.
 */
export function isAnswerSortOption(value: unknown): value is AnswerSortOption {
  return (
    typeof value === "string" &&
    ANSWER_SORT_OPTIONS.some((opt) => opt.id === value)
  );
}

/**
 * Reads the persisted answer sort preference from storage.
 * Falls back to DEFAULT_ANSWER_SORT if storage is missing, inaccessible,
 * or contains an invalid value.
 */
export function readStoredAnswerSort(
  storage: StorageLike = browserStorage,
): AnswerSortOption {
  try {
    const raw = storage?.getItem(ANSWER_SORT_STORAGE_KEY);
    if (raw && isAnswerSortOption(raw)) {
      return raw;
    }
  } catch {
    // Fall back safely if storage access fails
  }
  return DEFAULT_ANSWER_SORT;
}

/**
 * Persists the user's answer sort preference to storage.
 */
export function persistAnswerSort(
  sortBy: AnswerSortOption,
  storage: StorageLike = browserStorage,
): void {
  try {
    storage?.setItem(ANSWER_SORT_STORAGE_KEY, sortBy);
  } catch {
    // Ignore storage failures
  }
}

/**
 * Clears any stored answer sort preference from storage.
 */
export function clearStoredAnswerSort(
  storage: StorageLike = browserStorage,
): void {
  try {
    storage?.removeItem(ANSWER_SORT_STORAGE_KEY);
  } catch {
    // Ignore storage failures
  }
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into British English format (e.g. "4 Sept 2026").
 */
export function formatAnswerDate(isoDate?: string): string {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return "";
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Sorts an array of answers according to the chosen sort option.
 * Returns a new shallow array without mutating the original.
 */
export function sortAnswers(
  answers: AnswerConfig[],
  sortBy: AnswerSortOption,
): AnswerConfig[] {
  const cloned = [...answers];

  switch (sortBy) {
    case "az":
      return cloned.sort((a, b) =>
        a.question.localeCompare(b.question, "en", { sensitivity: "base" }),
      );
    case "za":
      return cloned.sort((a, b) =>
        b.question.localeCompare(a.question, "en", { sensitivity: "base" }),
      );
    case "newest":
      return cloned.sort((a, b) => {
        const dateA = a.publishedAt ?? "";
        const dateB = b.publishedAt ?? "";
        if (dateA && dateB && dateA !== dateB) {
          return dateB.localeCompare(dateA); // descending
        }
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        return a.question.localeCompare(b.question, "en", {
          sensitivity: "base",
        });
      });
    case "oldest":
      return cloned.sort((a, b) => {
        const dateA = a.publishedAt ?? "";
        const dateB = b.publishedAt ?? "";
        if (dateA && dateB && dateA !== dateB) {
          return dateA.localeCompare(dateB); // ascending
        }
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        return a.question.localeCompare(b.question, "en", {
          sensitivity: "base",
        });
      });
    case "category":
    default:
      return cloned;
  }
}

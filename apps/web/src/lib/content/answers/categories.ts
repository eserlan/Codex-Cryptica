import type { AnswerCategoryId, AnswerConfig } from "./schema";
import { answers } from "./pages";

export interface AnswerCategoryDefinition {
  id: AnswerCategoryId;
  title: string;
  description: string;
  icon: string;
}

export interface AnswerCategory extends AnswerCategoryDefinition {
  slugs: string[];
}

export const CATEGORY_DEFINITIONS: AnswerCategoryDefinition[] = [
  {
    id: "getting-started",
    title: "Getting Started & Table Setup",
    description:
      "Beginner onboarding, finding a group, choosing a ruleset, and running Session 0.",
    icon: "icon-[lucide--compass]",
  },
  {
    id: "session-prep",
    title: "Session Prep & Running Games",
    description:
      "Prep volume, combat encounter balance, random tables, puzzle design, player engagement, and mystery structure.",
    icon: "icon-[lucide--swords]",
  },
  {
    id: "worldbuilding",
    title: "Worldbuilding & Setting Design",
    description:
      "Factions, pantheons, fictional religions, settlement layouts, and point crawls.",
    icon: "icon-[lucide--globe]",
  },
  {
    id: "campaign-notes",
    title: "Notes & Campaign Management",
    description:
      "Note structures, NPC relationship mapping, and evaluating campaign managers.",
    icon: "icon-[lucide--book-open]",
  },
];

/**
 * Builds categories dynamically by deriving slugs from the registered answers
 * according to each answer's `category` property.
 */
export function buildAnswerCategories(
  answersRegistry: Record<string, AnswerConfig> = answers,
): AnswerCategory[] {
  const answerList = Object.values(answersRegistry);
  return CATEGORY_DEFINITIONS.map((category) => ({
    ...category,
    slugs: answerList
      .filter((answer) => answer.category === category.id)
      .map((answer) => answer.slug),
  }));
}

export const ANSWER_CATEGORIES: AnswerCategory[] = buildAnswerCategories();

/** Find the category for a specific answer slug */
export function getAnswerCategory(slug: string): AnswerCategory | undefined {
  return ANSWER_CATEGORIES.find((category) => category.slugs.includes(slug));
}

export interface CategorisedAnswers {
  category: AnswerCategory;
  answers: AnswerConfig[];
}

/** Group a list of answers into their respective categories, maintaining category order */
export function groupAnswersByCategory(
  answers: AnswerConfig[],
): CategorisedAnswers[] {
  return ANSWER_CATEGORIES.map((category) => {
    const categoryAnswers = answers.filter(
      (answer) => answer.category === category.id,
    );

    return {
      category,
      answers: categoryAnswers,
    };
  }).filter((group) => group.answers.length > 0);
}

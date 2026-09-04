import type { AnswerConfig } from "./schema";

export interface AnswerCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  slugs: string[];
}

export const ANSWER_CATEGORIES: AnswerCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started & Table Setup",
    description:
      "Beginner onboarding, finding a group, choosing a ruleset, and running Session 0.",
    icon: "icon-[lucide--compass]",
    slugs: [
      "where-do-i-start-if-i-have-never-played-a-tabletop-rpg",
      "how-do-i-find-a-tabletop-rpg-group-to-play-with",
      "what-rpg-system-should-we-try-instead-of-dnd",
      "how-do-i-run-a-successful-session-0",
    ],
  },
  {
    id: "session-prep",
    title: "Session Prep & Running Games",
    description:
      "Prep volume, combat encounter balance, random tables, puzzle design, player engagement, and mystery structure.",
    icon: "icon-[lucide--swords]",
    slugs: [
      "how-much-prep-do-you-need-for-an-rpg-session",
      "how-do-i-balance-rpg-combat-encounters-without-a-tpk",
      "what-makes-a-good-random-encounter",
      "how-do-you-design-rpg-puzzles-that-do-not-stall-the-game",
      "how-do-i-get-players-to-engage-with-my-campaign-world",
      "how-do-you-run-a-conspiracy-campaign",
      "how-do-you-make-travel-interesting-in-a-tabletop-rpg",
    ],
  },
  {
    id: "worldbuilding",
    title: "Worldbuilding & Setting Design",
    description:
      "Factions, pantheons, fictional religions, settlement layouts, and point crawls.",
    icon: "icon-[lucide--globe]",
    slugs: [
      "how-do-you-create-a-fantasy-faction",
      "how-do-you-create-a-pantheon",
      "how-do-you-create-a-believable-fictional-religion",
      "what-should-an-rpg-settlement-contain",
      "what-is-a-point-crawl",
    ],
  },
  {
    id: "campaign-notes",
    title: "Notes & Campaign Management",
    description:
      "Note structures, NPC relationship mapping, and evaluating campaign managers.",
    icon: "icon-[lucide--book-open]",
    slugs: [
      "how-do-you-organise-rpg-campaign-notes",
      "how-do-you-organise-npc-relationships",
      "what-should-i-look-for-in-an-rpg-campaign-manager",
    ],
  },
];

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
  const answerMap = new Map(answers.map((a) => [a.slug, a]));

  return ANSWER_CATEGORIES.map((category) => {
    const categoryAnswers = category.slugs
      .map((slug) => answerMap.get(slug))
      .filter((answer): answer is AnswerConfig => answer !== undefined);

    return {
      category,
      answers: categoryAnswers,
    };
  }).filter((group) => group.answers.length > 0);
}

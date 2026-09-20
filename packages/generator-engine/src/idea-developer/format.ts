import type { Development } from "./types";

/** The section headings shown in the result and in copied text. */
export const DEVELOPMENT_SECTION_TITLES = {
  alreadyInteresting: "What's already interesting",
  centralQuestion: "Central question",
  makeItMove: "Make it move",
  peopleWhoCare: "People who care",
  playerDirections: "Things the players could do",
  consequences: "If nobody steps in",
  creatorQuestions: "Questions for you",
  developFurther: "Develop further",
} as const;

/** Plain text of a development, with the original idea quoted first. */
export function developmentToText(
  development: Development,
  ideaText: string,
): string {
  const t = DEVELOPMENT_SECTION_TITLES;
  const parts: string[] = [`Your idea:\n${ideaText.trim()}`];
  if (development.whatChanged) {
    parts.push(`What changed: ${development.whatChanged}`);
  }
  parts.push(
    `${t.alreadyInteresting}\n${development.alreadyInteresting}`,
    `${t.centralQuestion}\n${development.centralQuestion}`,
    `${t.makeItMove}\n${development.makeItMove}`,
    `${t.peopleWhoCare}\n${development.peopleWhoCare
      .map(
        (p) =>
          `- ${p.name} (${p.role}) wants ${p.wants}. Clashes with: ${p.conflictsWith}`,
      )
      .join("\n")}`,
    `${t.playerDirections}\n${development.playerDirections
      .map((d) => `- ${d.title}: ${d.description}`)
      .join("\n")}`,
    `${t.consequences}\n${development.consequences}`,
    `${t.creatorQuestions}\n${development.creatorQuestions
      .map((q) => `- ${q}`)
      .join("\n")}`,
  );
  return parts.join("\n\n");
}

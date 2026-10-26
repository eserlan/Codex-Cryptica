import { safeJsonLd } from "$lib/utils/json-ld";
import { buildAbsoluteUrl } from "$lib/seo/site";
import type { AnswerConfig } from "./schema";
import { answerPath } from "./registry";

/**
 * FAQPage carrying the one question the page owns and its direct answer.
 *
 * A single-item FAQPage is deliberate: the page really is one question with one
 * authored answer, and `shortAnswer` is written to stand on its own precisely
 * so it reads correctly when extracted here. QAPage is the wrong type — that
 * describes user-submitted forum questions with competing answers.
 */
export function buildAnswerFaqJsonLd(answer: AnswerConfig): string {
  return safeJsonLd({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: answer.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: answer.shortAnswer,
        },
      },
    ],
  });
}

/** Home → Answers → this question. */
export function buildAnswerBreadcrumbJsonLd(answer: AnswerConfig): string {
  return safeJsonLd({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: buildAbsoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Answers",
        item: buildAbsoluteUrl("/answers"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: answer.question,
        item: buildAbsoluteUrl(answerPath(answer)),
      },
    ],
  });
}

/** The answer index as an ItemList, so the hub is crawlable as a collection. */
export function buildAnswerIndexJsonLd(answers: AnswerConfig[]): string {
  return safeJsonLd({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "RPG and worldbuilding answers",
    itemListElement: answers.map((answer, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: answer.question,
      url: buildAbsoluteUrl(answerPath(answer)),
    })),
  });
}

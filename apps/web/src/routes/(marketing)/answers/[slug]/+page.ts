import { error } from "@sveltejs/kit";
import {
  getAnswer,
  getAllAnswerSlugs,
  getRelatedAnswers,
} from "$lib/content/answers/registry";
import type { PageLoad, EntryGenerator } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = () =>
  getAllAnswerSlugs().map((slug) => ({ slug }));

export const load: PageLoad = ({ params }) => {
  const answer = getAnswer(params.slug);

  if (!answer) {
    throw error(404, { message: "Answer not found" });
  }

  return { answer, related: getRelatedAnswers(answer) };
};

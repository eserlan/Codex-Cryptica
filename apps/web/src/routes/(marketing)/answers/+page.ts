import { getAllAnswers } from "$lib/content/answers/registry";
import type { PageLoad } from "./$types";

export const prerender = true;

export const load: PageLoad = () => {
  return { answers: getAllAnswers() };
};

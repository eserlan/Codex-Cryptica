import { base } from "$app/paths";
import type { PageLoad } from "./$types";

export const prerender = true;
export const ssr = true;

export const load: PageLoad = async ({ fetch }) => {
  const res = await fetch(`${base}/PRIVACY.md`);
  if (res.ok) {
    const content = await res.text();
    return { content };
  }
  return { content: "" };
};

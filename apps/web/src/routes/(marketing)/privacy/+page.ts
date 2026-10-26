import { base } from "$app/paths";
import type { PageLoad } from "./$types";

export const prerender = true;
export const ssr = true;

export const load: PageLoad = async ({ fetch }) => {
  const res = await fetch(`${base}/PRIVACY.md`);
  if (!res.ok) {
    throw new Error(`Failed to load PRIVACY.md: ${res.statusText}`);
  }
  const content = await res.text();
  return { content };
};

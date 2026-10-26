import { asset } from "$app/paths";
import type { PageLoad } from "./$types";

export const prerender = true;
export const ssr = true;

export const load: PageLoad = async ({ fetch }) => {
  const res = await fetch(asset("TERMS.md"));
  if (!res.ok) {
    throw new Error(`Failed to load TERMS.md: ${res.statusText}`);
  }
  const content = await res.text();
  return { content };
};

import { redirect } from "@sveltejs/kit";
import { comparisons } from "$lib/config/seo-comparisons";
import type { EntryGenerator, PageLoad } from "./$types";

export const prerender = true;

export const load: PageLoad = ({ params }) => {
  const competitor = params.slug;

  // Normalize common aliases
  let targetSlug = competitor;
  if (competitor === "kanka") {
    targetSlug = "kanka-alternative";
  }

  if (comparisons[targetSlug]) {
    redirect(301, `/vs/${targetSlug}`);
  }

  // Fallback to home page if competitor comparison doesn't exist
  redirect(307, "/");
};

export const entries: EntryGenerator = () => {
  const slugs = Object.keys(comparisons);
  // Support both "kanka-alternative" and generic "kanka" paths
  if (slugs.includes("kanka-alternative") && !slugs.includes("kanka")) {
    slugs.push("kanka");
  }
  return slugs.map((slug) => ({ slug }));
};

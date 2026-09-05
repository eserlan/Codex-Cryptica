import type { PageLoad } from "./$types";
import { getPublicContentByLabel } from "$lib/content/labels/aggregate";

export const prerender = false;
export const ssr = true;

const DIRECTORY_BASE_URL =
  ((typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_ORACLE_PROXY_URL) ||
    (typeof import.meta !== "undefined" &&
    import.meta.env?.DEV &&
    !import.meta.env?.VITEST
      ? "http://localhost:8787"
      : "https://oracle-proxy.espen-erlandsen.workers.dev")) +
  "/api/directory/listings";

interface WorldDirectoryResult {
  guestUrl: string;
  title: string;
  description: string;
}

export const load: PageLoad = async ({ fetch, url }) => {
  const label = url.searchParams.get("label")?.trim() || "";

  if (!label) {
    return { label: "", results: [] };
  }

  const results = getPublicContentByLabel(label);

  // Also pull matching public worlds from the directory API, same one
  // /worlds already uses — worlds are dynamic/API-backed, not a static
  // content registry, so they can't go through getPublicContentByLabel.
  try {
    const response = await fetch(
      `${DIRECTORY_BASE_URL}?labels=${encodeURIComponent(label)}`,
    );
    if (response.ok) {
      const page = (await response.json()) as {
        results: WorldDirectoryResult[];
      };
      for (const world of page.results) {
        results.push({
          kind: "world",
          title: world.title,
          summary: world.description,
          href: world.guestUrl,
        });
      }
    }
  } catch {
    // The public world directory is best-effort here; the rest of the
    // label's results still render without it.
  }

  return { label, results };
};

import type { PageLoad } from "./$types";

export const prerender = false;
export const ssr = true;

const DIRECTORY_BASE_URL =
  "https://oracle-proxy.espen-erlandsen.workers.dev/api/directory/listings";

export const load: PageLoad = async ({ fetch, url }) => {
  const params = new URLSearchParams();
  const q = url.searchParams.get("q")?.trim() ?? "";
  const labels =
    url.searchParams
      .get("labels")
      ?.split(",")
      .map((label) => label.trim())
      .filter(Boolean) ?? [];

  if (q) params.set("q", q);
  if (labels.length) params.set("labels", labels.join(","));
  if (url.searchParams.get("cursor")) {
    params.set("cursor", url.searchParams.get("cursor")!);
  }
  if (url.searchParams.get("limit")) {
    params.set("limit", url.searchParams.get("limit")!);
  }

  const requestUrl = params.toString()
    ? `${DIRECTORY_BASE_URL}?${params.toString()}`
    : DIRECTORY_BASE_URL;

  try {
    const response = await fetch(requestUrl);
    if (!response.ok) {
      return {
        page: { results: [], nextCursor: undefined },
        query: { q, labels },
        error: "The public world directory is unavailable right now.",
      };
    }

    return {
      page: (await response.json()) as {
        results: Array<{
          publishId: string;
          guestUrl: string;
          title: string;
          description: string;
          labels: string[];
          coverImageUrl?: string;
          coverImageAlt?: string;
          ownerDisplayName?: string;
          visibleEntityCount: number;
          listingUpdatedAt: string;
        }>;
        nextCursor?: string;
      },
      query: { q, labels },
      error: "",
    };
  } catch {
    return {
      page: { results: [], nextCursor: undefined },
      query: { q, labels },
      error: "The public world directory is unavailable right now.",
    };
  }
};

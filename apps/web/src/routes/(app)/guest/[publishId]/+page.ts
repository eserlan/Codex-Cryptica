import type { PageLoad } from "./$types";

export const ssr = false;
export const prerender = false;

export const load: PageLoad = async ({ params, fetch }) => {
  const { publishId } = params;
  const baseUrl = "https://oracle-proxy.espen-erlandsen.workers.dev";
  const url = `${baseUrl}/api/published/${publishId}/bundle`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return {
        status: res.status,
        error: `Failed to load published vault: ${res.statusText || res.status}`,
        publishId,
        bundle: null
      };
    }
    const bundle = await res.json();
    return {
      status: 200,
      bundle,
      publishId,
      error: null
    };
  } catch (err: any) {
    return {
      status: 500,
      error: err.message || "Failed to load bundle",
      publishId,
      bundle: null
    };
  }
};

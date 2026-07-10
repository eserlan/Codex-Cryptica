import type { PageLoad } from "./$types";
import { GuestBundleSchema } from "schema";

const RESERVED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export const ssr = false;
export const prerender = false;

export const load: PageLoad = async ({ params, fetch }) => {
  const rawParamId = params.publishId;
  const publishId =
    rawParamId.length >= 36 ? rawParamId.slice(-36) : rawParamId;
  const baseUrl =
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_ORACLE_PROXY_URL) ||
    (typeof import.meta !== "undefined" &&
    import.meta.env?.DEV &&
    !import.meta.env?.VITEST
      ? "http://localhost:8787"
      : "https://oracle-proxy.espen-erlandsen.workers.dev");
  const url = `${baseUrl}/api/published/${publishId}/bundle`;
  const noticeUrl = `${baseUrl}/api/published/${publishId}/notice`;

  try {
    const [res, noticeRes] = await Promise.all([
      fetch(url),
      fetch(noticeUrl).catch(() => null),
    ]);

    let notice: any = null;
    if (noticeRes && noticeRes.ok) {
      notice = await noticeRes.json().catch(() => null);
    }

    if (res.status === 451 || (notice && notice.suspended === true)) {
      return {
        status: 451,
        error: "This world is temporarily unavailable.",
        publishId,
        bundle: null,
        notice: null,
      };
    }

    if (!res.ok) {
      return {
        status: res.status,
        error: `Failed to load published vault: ${res.statusText || res.status}`,
        publishId,
        bundle: null,
        notice: null,
      };
    }
    const rawBundle = await res.json();
    const parsedBundle = GuestBundleSchema.safeParse(rawBundle);
    if (
      !parsedBundle.success ||
      parsedBundle.data.publishId !== publishId ||
      parsedBundle.data.entities.some((entity) => RESERVED_KEYS.has(entity.id))
    ) {
      return {
        status: 400,
        error: "The published vault has an invalid format.",
        publishId,
        bundle: null,
        notice: null,
      };
    }
    return {
      status: 200,
      bundle: parsedBundle.data,
      notice: notice && typeof notice.fanContent === "boolean" ? notice : null,
      publishId,
      error: null,
    };
  } catch (err: any) {
    return {
      status: 500,
      error: err.message || "Failed to load bundle",
      publishId,
      bundle: null,
      notice: null,
    };
  }
};

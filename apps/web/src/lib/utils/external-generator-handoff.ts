/**
 * Reusable outbound handoff for sending Codex Cryptica entity/generated
 * content to external partner generators via a URL query parameter (e.g.
 * MonsterLabs' `?prompt=...`). Callers decide how an entity or draft is
 * serialised into prompt text (see `buildGeneratorMarkdown` /
 * `ClipboardService.copyEntity`); this module only owns safe URL
 * construction and new-tab navigation.
 */

/**
 * Conservative cross-browser safe URL length. Most modern browsers and
 * servers tolerate much longer URLs, but some proxies/CDNs and older
 * clients start truncating or rejecting requests well before that, so a
 * handoff payload is checked against this instead of hitting an opaque
 * failure on the partner's end.
 */
export const MAX_EXTERNAL_GENERATOR_URL_LENGTH = 8000;

export interface ExternalGeneratorHandoffOptions {
  /** The partner generator's page URL, e.g. "https://monsterlabs.app/dnd-monster-generator". */
  baseUrl: string;
  /** The query parameter the partner reads the content from, e.g. "prompt". */
  paramName: string;
  /** The serialised entity/draft content to send. */
  content: string;
  /** Optional extra query parameters, e.g. attribution (`utm_source`) once agreed with the destination. */
  extraParams?: Record<string, string>;
  /** Override the safe-length guard, mainly for tests. */
  maxLength?: number;
}

export type ExternalGeneratorHandoffResult =
  | { ok: true; url: string; popupBlocked?: boolean }
  | { ok: false; reason: "empty-content" }
  | { ok: false; reason: "invalid-base-url" }
  | { ok: false; reason: "unsupported-protocol" }
  | { ok: false; reason: "url-too-long"; length: number; limit: number };

/**
 * Builds a fully encoded external generator URL from Codex content.
 * Never throws: an invalid `baseUrl`, non-http(s) protocol, or an oversized
 * or empty payload is reported as an explicit failure result for the caller
 * to surface, rather than a runtime exception. Content bytes are preserved
 * exactly (only whitespace-only content is rejected as empty) — this is a
 * handoff, not a formatter.
 */
export function buildExternalGeneratorUrl(
  options: ExternalGeneratorHandoffOptions,
): ExternalGeneratorHandoffResult {
  const {
    baseUrl,
    paramName,
    content,
    extraParams,
    maxLength = MAX_EXTERNAL_GENERATOR_URL_LENGTH,
  } = options;

  if (!content.trim()) {
    return { ok: false, reason: "empty-content" };
  }

  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return { ok: false, reason: "invalid-base-url" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "unsupported-protocol" };
  }

  url.searchParams.set(paramName, content);
  for (const [key, value] of Object.entries(extraParams ?? {})) {
    url.searchParams.set(key, value);
  }

  const built = url.toString();
  if (built.length > maxLength) {
    return {
      ok: false,
      reason: "url-too-long",
      length: built.length,
      limit: maxLength,
    };
  }

  return { ok: true, url: built };
}

/**
 * Opens a partner generator URL in a new tab without navigating the user
 * away from Codex. `noopener,noreferrer` is used since this is a true
 * cross-origin handoff with no need for a return handshake (contrast with
 * `zen-popout.ts`, which intentionally keeps `opener` for guest tabs).
 *
 * SSR-safe: `window` is resolved lazily at call time rather than captured as
 * a default parameter, so this no-ops (returning `null`) outside a browser
 * instead of throwing.
 */
export function openExternalGeneratorUrl(
  url: string,
  windowRef?: Pick<Window, "open">,
): Window | null {
  const target =
    windowRef ?? (typeof window === "undefined" ? undefined : window);
  if (!target) return null;
  return target.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Opens a blank tab synchronously — call this directly inside a click
 * handler, before any `await`. Browsers only allow `window.open` without a
 * popup-blocker prompt while it runs inside the call stack of a user
 * gesture; that window closes the moment execution crosses an `await`. A
 * caller that needs to build the URL asynchronously (e.g. an AI compression
 * pass) should open this placeholder tab first, then hand it to
 * {@link sendToExternalGenerator} as `pendingTab` once the URL is ready.
 */
export function openPendingExternalGeneratorTab(
  windowRef?: Pick<Window, "open">,
): Window | null {
  const target =
    windowRef ?? (typeof window === "undefined" ? undefined : window);
  if (!target) return null;
  return target.open("", "_blank", "noopener,noreferrer");
}

/**
 * Builds the handoff URL and, if it succeeds, opens it in a new tab.
 * Returns the same result `buildExternalGeneratorUrl` would, so a caller
 * can render an explicit error state (e.g. "too large to send") instead of
 * content silently going missing.
 *
 * Pass `pendingTab` (from {@link openPendingExternalGeneratorTab}, called
 * synchronously before any `await`) when a caller wants the tab open
 * throughout an async content-building step — the tab is redirected to the
 * built URL, or closed on failure. This trades a synchronous-open guarantee
 * for a blank tab that steals focus for the whole async gap; most callers
 * that show their own "preparing…" UI in the meantime should omit
 * `pendingTab` instead and open fresh once `content` is ready.
 *
 * Without `pendingTab`, the tab opens fresh after the URL is built. A
 * user-gesture `window.open` called after crossing an `await` is not
 * guaranteed to succeed in every browser (Safari in particular can block
 * it), so the `ok: true` result carries `popupBlocked: true` when the open
 * call returned `null` — callers should surface a manual "open" link/button
 * in that case (a real click is itself a fresh gesture, so a retry from
 * there will not be blocked) rather than assuming the tab is there.
 */
export function sendToExternalGenerator(
  options: ExternalGeneratorHandoffOptions & {
    windowRef?: Pick<Window, "open">;
    pendingTab?: Window | null;
  },
): ExternalGeneratorHandoffResult {
  const result = buildExternalGeneratorUrl(options);
  if (options.pendingTab !== undefined) {
    if (result.ok) {
      if (options.pendingTab === null) {
        return { ...result, popupBlocked: true };
      }
      try {
        options.pendingTab.location.assign(result.url);
      } catch {
        // The tab may have been closed by the user already; nothing more to do.
      }
    } else {
      options.pendingTab?.close();
    }
    return result;
  }
  if (result.ok) {
    const opened = openExternalGeneratorUrl(result.url, options.windowRef);
    return { ...result, popupBlocked: opened === null };
  }
  return result;
}

import { browser } from "$app/environment";

const VITE_TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>,
      ) => string;
      execute: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SCRIPT_ID = "codex-turnstile-script";

function loadTurnstile(): Promise<NonNullable<Window["turnstile"]>> {
  if (!browser)
    return Promise.reject(
      new Error("Publishing is only available in the browser."),
    );
  if (window.turnstile) return Promise.resolve(window.turnstile);

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(
      SCRIPT_ID,
    ) as HTMLScriptElement | null;
    const script = existing || document.createElement("script");
    const onLoad = () =>
      window.turnstile
        ? resolve(window.turnstile)
        : reject(new Error("Verification failed to load."));
    const onError = () =>
      reject(new Error("Verification service is unavailable."));

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.id = SCRIPT_ID;
      script.src = TURNSTILE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });
}

/**
 * Renders a throwaway invisible widget, executes it, and resolves with the
 * challenge token.
 *
 * Shared by every challenge site so a third caller doesn't mean a third copy
 * of the render/cleanup/timeout dance. `retryPhrase` completes the sentence
 * "Please try ___ again." in the user-facing errors.
 */
async function solveInvisibleChallenge(
  action: string,
  retryPhrase: string,
  notConfiguredMessage: string,
): Promise<string> {
  if (!VITE_TURNSTILE_SITE_KEY) {
    if (import.meta.env.DEV) {
      return "dev-turnstile-token";
    }
    throw new Error(notConfiguredMessage);
  }

  const turnstile = await loadTurnstile();
  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  document.body.appendChild(container);

  return new Promise((resolve, reject) => {
    let widgetId = "";
    const cleanup = () => {
      if (widgetId) turnstile.remove(widgetId);
      container.remove();
    };
    const fail = (reason: string) => () => {
      window.clearTimeout(timeout);
      cleanup();
      reject(
        new Error(`Verification ${reason}. Please try ${retryPhrase} again.`),
      );
    };
    const timeout = window.setTimeout(fail("timed out"), 30_000);

    widgetId = turnstile.render(container, {
      sitekey: VITE_TURNSTILE_SITE_KEY,
      execution: "execute",
      action,
      callback: (token: string) => {
        window.clearTimeout(timeout);
        cleanup();
        resolve(token);
      },
      "error-callback": fail("failed"),
      "expired-callback": fail("expired"),
    });
    turnstile.execute(widgetId);
  });
}

/** Runs the invisible publication challenge only after the user confirms publishing. */
export async function getPublishTurnstileToken(): Promise<string> {
  return solveInvisibleChallenge(
    "publish_snapshot",
    "publishing",
    "Publishing verification is not configured.",
  );
}

/** Runs the invisible publication challenge only when submitting a copyright report. */
export async function getCopyrightReportTurnstileToken(): Promise<string> {
  return solveInvisibleChallenge(
    "copyright_report",
    "reporting",
    "Verification is not configured.",
  );
}

/**
 * Runs the invisible challenge that backs the LLM session capability token.
 *
 * Unlike the other two this fires on app start rather than on a user action,
 * so the token is already in hand by the time someone generates anything.
 */
export async function getSessionTurnstileToken(): Promise<string> {
  return solveInvisibleChallenge(
    "llm_session",
    "generating",
    "Session verification is not configured.",
  );
}

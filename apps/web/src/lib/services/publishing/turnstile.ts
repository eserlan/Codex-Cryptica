import { browser } from "$app/env";

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
const SCRIPT_LOAD_TIMEOUT_MS = 15_000;

let loadPromise: Promise<NonNullable<Window["turnstile"]>> | null = null;

function loadTurnstile(): Promise<NonNullable<Window["turnstile"]>> {
  if (!browser) {
    return Promise.reject(
      new Error("Verification is only available in the browser."),
    );
  }
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<NonNullable<Window["turnstile"]>>(
    (resolve, reject) => {
      document.getElementById(SCRIPT_ID)?.remove();

      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = TURNSTILE_SCRIPT_URL;
      script.async = true;
      script.defer = true;

      let settled = false;
      const cleanup = () => {
        window.clearTimeout(timer);
        script.removeEventListener("load", onLoad);
        script.removeEventListener("error", onError);
      };

      const onLoad = () => {
        if (settled) return;
        settled = true;
        cleanup();
        if (window.turnstile) {
          resolve(window.turnstile);
        } else {
          script.remove();
          reject(new Error("Verification failed to load."));
        }
      };

      const onError = () => {
        if (settled) return;
        settled = true;
        cleanup();
        script.remove();
        reject(new Error("Verification failed to load."));
      };

      const timer = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        script.remove();
        reject(new Error("Verification timed out while loading."));
      }, SCRIPT_LOAD_TIMEOUT_MS);

      script.addEventListener("load", onLoad);
      script.addEventListener("error", onError);
      document.head.appendChild(script);
    },
  ).finally(() => {
    loadPromise = null;
  });

  return loadPromise;
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
  // Production site keys are bound to their allowed hostnames. Running that
  // challenge on localhost produces an error callback and then Turnstile's
  // own attempted reset races the widget removal. Local workers accept the
  // development capability token instead.
  if (import.meta.env.DEV) {
    return "dev-turnstile-token";
  }

  if (!VITE_TURNSTILE_SITE_KEY) {
    throw new Error(notConfiguredMessage);
  }

  const turnstile = await loadTurnstile();
  const container = document.createElement("div");
  // Managed widgets must remain accessible if verification needs interaction.
  document.body.appendChild(container);

  return new Promise((resolve, reject) => {
    let widgetId = "";
    const cleanup = () => {
      // Leave the widget intact until Turnstile finishes handling its callback.
      setTimeout(() => {
        if (widgetId) turnstile.remove(widgetId);
        container.remove();
      }, 0);
    };
    const fail = (reason: string) => (errorCode?: unknown) => {
      window.clearTimeout(timeout);
      cleanup();
      const codeSuffix =
        errorCode !== undefined && errorCode !== null && errorCode !== ""
          ? ` (code: ${errorCode})`
          : "";
      reject(
        new Error(
          `Verification ${reason}${codeSuffix}. Please try ${retryPhrase} again.`,
        ),
      );
    };
    const timeout = window.setTimeout(fail("timed out"), 30_000);

    try {
      widgetId = turnstile.render(container, {
        sitekey: VITE_TURNSTILE_SITE_KEY,
        execution: "execute",
        action,
        callback: (token: string) => {
          window.clearTimeout(timeout);
          cleanup();
          resolve(token);
        },
        "error-callback": (err: unknown) => {
          // Challenge failures can recover through Turnstile's automatic retry.
          // Rejecting/removing on the first failure prevents that recovery and
          // leaves subsequent AI calls without a capability token.
          if (/^(300|600)/.test(String(err))) return false;
          fail("failed")(err);
          return true;
        },
        "expired-callback": () => fail("expired")(),
      });
      turnstile.execute(widgetId);
    } catch (err) {
      fail("failed")(err);
    }
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
 * Loads Turnstile lazily on first AI/proxy session demand rather than on app
 * start, so visitors who never trigger an AI or proxy action incur zero
 * Turnstile script download or challenge solve.
 */
export async function getSessionTurnstileToken(): Promise<string> {
  return solveInvisibleChallenge(
    "llm_session",
    "generating",
    "Session verification is not configured.",
  );
}

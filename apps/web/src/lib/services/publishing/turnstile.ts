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

/** Runs the invisible publication challenge only after the user confirms publishing. */
export async function getPublishTurnstileToken(): Promise<string> {
  if (!VITE_TURNSTILE_SITE_KEY) {
    throw new Error("Publishing verification is not configured.");
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
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Verification timed out. Please try publishing again."));
    }, 30_000);

    widgetId = turnstile.render(container, {
      sitekey: VITE_TURNSTILE_SITE_KEY,
      execution: "execute",
      action: "publish_snapshot",
      callback: (token: string) => {
        window.clearTimeout(timeout);
        cleanup();
        resolve(token);
      },
      "error-callback": () => {
        window.clearTimeout(timeout);
        cleanup();
        reject(new Error("Verification failed. Please try publishing again."));
      },
      "expired-callback": () => {
        window.clearTimeout(timeout);
        cleanup();
        reject(new Error("Verification expired. Please try publishing again."));
      },
    });
    turnstile.execute(widgetId);
  });
}

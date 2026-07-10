export function isCodexHostname(hostname: string | undefined): boolean {
  return (
    hostname === "codexcryptica.com" ||
    hostname === "codex-cryptica.com" ||
    hostname === "staging.codexcryptica.com" ||
    hostname === "staging.codex-cryptica.com" ||
    hostname?.endsWith(".codex-cryptica.pages.dev") === true ||
    hostname === "localhost"
  );
}

export async function verifyTurnstile(
  request: Request,
  secretKey?: string,
  expectedAction?: string,
  tokenOverride?: string,
): Promise<boolean> {
  const token = tokenOverride || request.headers.get("X-Turnstile-Token");

  if (!secretKey) {
    return token === "dev-turnstile-token";
  }

  if (!token || token.length > 2_048) return false;

  const form = new FormData();
  form.set("secret", secretKey);
  form.set("response", token);
  form.set("remoteip", request.headers.get("CF-Connecting-IP") || "");

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: form,
      },
    );
    if (!response.ok) return false;
    const result = (await response.json()) as {
      success?: boolean;
      hostname?: string;
      action?: string;
    };
    if (expectedAction && result.action !== expectedAction) {
      return false;
    }
    return result.success === true && isCodexHostname(result.hostname);
  } catch {
    return false;
  }
}

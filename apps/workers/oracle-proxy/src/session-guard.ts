/**
 * HTTP wiring for capability tokens: the `/api/session` handshake endpoint and
 * the guard applied to LLM generation requests.
 *
 * Kept separate from `session.ts` (pure crypto) so the signing logic stays
 * testable without constructing Requests.
 */

import { verifyTurnstile } from "./turnstile";
import {
  extractBearerToken,
  mintSessionToken,
  verifySessionToken,
  verifyAutomationKey,
  type SessionTokenPayload,
} from "./session";

/** Turnstile action the client widget declares for this handshake. */
export const SESSION_TURNSTILE_ACTION = "llm_session";

/** Header name for trusted automation credential. */
export const AUTOMATION_KEY_HEADER = "X-Codex-Automation-Key";

export interface SessionEnv {
  SESSION_TOKEN_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
  CODEX_AUTOMATION_KEY?: string;
  LLM_BURST_RATE_LIMITER?: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
  LLM_GENERATION_RATE_LIMITER?: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
  LLM_AUTOMATION_RATE_LIMITER?: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
}

function json(
  data: unknown,
  status: number,
  cors: Record<string, string>,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

/**
 * `POST /api/session` — exchange either a solved Turnstile challenge or a
 * trusted automation key for a signed capability token.
 */
export async function handleSessionRequest(
  request: Request,
  env: SessionEnv,
  cors: Record<string, string>,
): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: { message: "Method not allowed" } }, 405, cors);
  }

  if (!env.SESSION_TOKEN_SECRET) {
    // Without a signing secret there is nothing to mint. Surfaced as a 503
    // rather than a silent success so a misconfigured deploy is visible
    // instead of handing out tokens the generation path would reject.
    console.error("[Oracle Proxy] SESSION_TOKEN_SECRET is not configured");
    return json(
      {
        error: {
          message: "Session issuance is not configured",
          code: "SESSION_NOT_CONFIGURED",
        },
      },
      503,
      cors,
    );
  }

  const automationKeyHeader =
    request.headers.get("X-Codex-Automation-Key") ??
    request.headers.get("x-codex-automation-key");
  const ip = request.headers.get("CF-Connecting-IP") || "anonymous";

  if (automationKeyHeader !== null) {
    if (!env.CODEX_AUTOMATION_KEY?.trim()) {
      console.error("[Oracle Proxy] CODEX_AUTOMATION_KEY is not configured");
      return json(
        {
          error: {
            message: "Automation access is not configured",
            code: "AUTOMATION_NOT_CONFIGURED",
          },
        },
        503,
        cors,
      );
    }

    const isValid = await verifyAutomationKey(
      automationKeyHeader,
      env.CODEX_AUTOMATION_KEY,
    );
    if (!isValid) {
      return json(
        {
          error: {
            message: "Invalid automation key",
            code: "AUTOMATION_KEY_INVALID",
          },
        },
        401,
        cors,
      );
    }

    const { token, expiresAt, scope } = await mintSessionToken(
      env.SESSION_TOKEN_SECRET,
      ip,
      undefined,
      undefined,
      "automation",
    );

    console.log(`[Oracle Proxy] Issued automation session token (ip: ${ip})`);

    return json({ token, expiresAt, scope }, 200, cors);
  }

  const body = (await request.json().catch(() => ({}))) as {
    turnstileToken?: string;
  };
  const turnstileToken = body?.turnstileToken;

  const verified = await verifyTurnstile(
    request,
    env.TURNSTILE_SECRET_KEY,
    SESSION_TURNSTILE_ACTION,
    turnstileToken,
  );
  if (!verified) {
    return json(
      {
        error: {
          message: "Turnstile verification failed",
          code: "TURNSTILE_INVALID",
        },
      },
      403,
      cors,
    );
  }

  const { token, expiresAt, scope } = await mintSessionToken(
    env.SESSION_TOKEN_SECRET,
    ip,
    undefined,
    undefined,
    "human",
  );

  return json({ token, expiresAt, scope }, 200, cors);
}

/**
 * Guard for LLM generation requests.
 *
 * Returns a `Response` to short-circuit with, or `null` to let the request
 * proceed.
 *
 * **Fail-open when unconfigured.** With no `SESSION_TOKEN_SECRET` set, the
 * guard waves everything through. That's deliberate for rollout: the worker
 * ships and the secret lands before clients start sending tokens, so a
 * deploy-order slip degrades to today's behaviour rather than taking
 * generation down for every user. Once the secret is set, enforcement is on.
 */
export async function enforceLlmSession(
  request: Request,
  env: SessionEnv,
  cors: Record<string, string>,
  isAllowedOrigin: boolean = true,
): Promise<Response | null> {
  if (!env.SESSION_TOKEN_SECRET) {
    if (!isAllowedOrigin) {
      return json(
        { error: { message: "Forbidden", code: "FORBIDDEN" } },
        403,
        cors,
      );
    }
    return null;
  }

  const token = extractBearerToken(request);
  const result = await verifySessionToken(env.SESSION_TOKEN_SECRET, token);

  if (!result.valid) {
    return json(
      {
        error: {
          message:
            result.code === "SESSION_TOKEN_EXPIRED"
              ? "Session token expired"
              : "A valid session token is required",
          code: result.code,
        },
      },
      401,
      cors,
    );
  }

  // Non-automation tokens still require an allowed browser origin.
  // Automation tokens do not require browser origins.
  if (result.payload.scope !== "automation" && !isAllowedOrigin) {
    return json(
      {
        error: {
          message: "Forbidden",
          code: "FORBIDDEN",
        },
      },
      403,
      cors,
    );
  }

  logIpAnomaly(request, result.payload);

  return enforceLlmRateLimit(env, result.payload, cors);
}

/**
 * Log — never block — a token used from a different IP than it was issued to.
 *
 * Mobile clients switch networks mid-session constantly; hard-failing would
 * break legitimate users to inconvenience an attacker who can just re-solve a
 * challenge.
 */
function logIpAnomaly(request: Request, payload: SessionTokenPayload): void {
  const currentIp = request.headers.get("CF-Connecting-IP") || "anonymous";
  if (payload.ip && payload.ip !== "anonymous" && payload.ip !== currentIp) {
    console.log(
      `[Oracle Proxy] Session IP changed for token ${payload.jti} (issued to a different address)`,
    );
  }
}

/**
 * Apply rate limit bindings, keyed by token id.
 *
 * Two native windows rather than one long one: Cloudflare's rate limiting
 * binding only supports 10s and 60s periods, and is permissive and eventually
 * consistent by design. The burst limiter kills tight loops immediately; the
 * per-minute limiter bounds sustained volume. Neither is an exact counter —
 * they suppress abuse, they don't do quota accounting.
 */
async function enforceLlmRateLimit(
  env: SessionEnv,
  payload: SessionTokenPayload,
  cors: Record<string, string>,
): Promise<Response | null> {
  const isAutomation = payload.scope === "automation";

  if (isAutomation) {
    if (env.LLM_AUTOMATION_RATE_LIMITER) {
      const { success } = await env.LLM_AUTOMATION_RATE_LIMITER.limit({
        key: `automation:${payload.jti}`,
      });
      if (!success) {
        return json(
          {
            error: {
              message:
                "Too many generation requests for automation session. Please wait a moment and try again.",
              code: "RATE_LIMITED",
            },
          },
          429,
          cors,
        );
      }
      return null;
    }

    const key = `automation:${payload.jti}`;
    const limiters = [
      env.LLM_BURST_RATE_LIMITER,
      env.LLM_GENERATION_RATE_LIMITER,
    ].filter(Boolean);

    for (const limiter of limiters) {
      const { success } = await limiter!.limit({ key });
      if (!success) {
        return json(
          {
            error: {
              message:
                "Too many generation requests for automation session. Please wait a moment and try again.",
              code: "RATE_LIMITED",
            },
          },
          429,
          cors,
        );
      }
    }
    return null;
  }

  const key = `session:${payload.jti}`;
  const limiters = [
    env.LLM_BURST_RATE_LIMITER,
    env.LLM_GENERATION_RATE_LIMITER,
  ].filter(Boolean);

  for (const limiter of limiters) {
    const { success } = await limiter!.limit({ key });
    if (!success) {
      return json(
        {
          error: {
            message:
              "Too many generation requests. Please wait a moment and try again.",
            code: "RATE_LIMITED",
          },
        },
        429,
        cors,
      );
    }
  }

  return null;
}

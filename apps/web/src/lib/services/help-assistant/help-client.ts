import {
  HelpAnswerSchema,
  sanitizeHelpContext,
  trimHistory,
  type HelpAnswer,
  type HelpTurn,
} from "help-engine";
import { resolveOracleProxyUrl } from "$lib/config/oracle-proxy";
import { getAiSessionToken } from "$lib/services/ai/session-bootstrap";

export type HelpErrorKind =
  | "offline"
  | "unauthorised"
  | "rate-limited"
  | "server"
  | "timeout"
  | "aborted"
  | "invalid-response"
  | "bad-request";

export interface HelpClientError {
  kind: HelpErrorKind;
  code?: string;
}

export type HelpAskResult =
  { ok: true; answer: HelpAnswer } | { ok: false; error: HelpClientError };

export interface HelpClientDeps {
  fetcher?: typeof fetch;
  /** Bearer token for the proxy; `true` forces a fresh handshake. */
  getToken?: (forceRefresh?: boolean) => Promise<string | null>;
  proxyUrl?: string;
  /** A little over the Worker's own 8 second budget. */
  timeoutMs?: number;
  isOnline?: () => boolean;
}

export interface AskInput {
  question: string;
  history: readonly HelpTurn[];
  /** Whatever the providers reported; it is sanitised before it leaves. */
  context: unknown;
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 10_000;

function kindForStatus(status: number): HelpErrorKind {
  if (status === 401 || status === 403) return "unauthorised";
  if (status === 429) return "rate-limited";
  if (status === 504) return "timeout";
  return status >= 500 ? "server" : "bad-request";
}

/**
 * Talks to the Worker's `/api/help/ask`. It sends exactly three things: the
 * question, the last few help turns, and a screen description that has been
 * through the same sanitiser the Worker re-checks. Nothing from the vault is
 * read here.
 */
export class HelpClient {
  private readonly fetcher: typeof fetch;
  private readonly getToken: (forceRefresh?: boolean) => Promise<string | null>;
  private readonly proxyUrl?: string;
  private readonly timeoutMs: number;
  private readonly isOnline: () => boolean;

  constructor(deps: HelpClientDeps = {}) {
    this.fetcher = deps.fetcher ?? ((input, init) => fetch(input, init));
    this.getToken = deps.getToken ?? getAiSessionToken;
    this.proxyUrl = deps.proxyUrl;
    this.timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.isOnline =
      deps.isOnline ??
      (() => typeof navigator === "undefined" || navigator.onLine !== false);
  }

  async ask(input: AskInput): Promise<HelpAskResult> {
    if (!this.isOnline()) return { ok: false, error: { kind: "offline" } };

    const body = JSON.stringify({
      question: input.question,
      history: trimHistory(input.history),
      context: sanitizeHelpContext(input.context),
    });

    const controller = new AbortController();
    const onUserAbort = () => controller.abort("user");
    if (input.signal?.aborted) return { ok: false, error: { kind: "aborted" } };
    input.signal?.addEventListener("abort", onUserAbort, { once: true });
    const timer = setTimeout(() => controller.abort("timeout"), this.timeoutMs);

    try {
      let response = await this.send(body, controller.signal, false);
      if (response.status === 401) {
        // One refresh, the same as every other proxy caller; never a loop.
        response = await this.send(body, controller.signal, true);
      }
      return await this.read(response);
    } catch (error) {
      return { ok: false, error: this.classify(error, controller.signal) };
    } finally {
      clearTimeout(timer);
      input.signal?.removeEventListener("abort", onUserAbort);
    }
  }

  private async send(body: string, signal: AbortSignal, forceRefresh: boolean) {
    const token = await this.getToken(forceRefresh);
    // Cancelled while the session was being sorted out: do not send at all.
    if (signal.aborted) throw new DOMException("aborted", "AbortError");
    const headers = new Headers({ "Content-Type": "application/json" });
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return this.fetcher(
      `${resolveOracleProxyUrl(this.proxyUrl)}/api/help/ask`,
      {
        method: "POST",
        headers,
        body,
        signal,
      },
    );
  }

  private async read(response: Response): Promise<HelpAskResult> {
    return response.ok ? this.readAnswer(response) : this.readFailure(response);
  }

  private async readAnswer(response: Response): Promise<HelpAskResult> {
    const parsed = HelpAnswerSchema.safeParse(
      await response.json().catch(() => null),
    );
    return parsed.success
      ? { ok: true, answer: parsed.data as HelpAnswer }
      : { ok: false, error: { kind: "invalid-response" } };
  }

  private async readFailure(response: Response): Promise<HelpAskResult> {
    const payload = (await response.json().catch(() => null)) as {
      error?: { code?: unknown };
    } | null;
    const code =
      typeof payload?.error?.code === "string" ? payload.error.code : undefined;
    const kind = kindForStatus(response.status);
    return { ok: false, error: code ? { kind, code } : { kind } };
  }

  private classify(error: unknown, signal: AbortSignal): HelpClientError {
    if (signal.aborted) {
      return { kind: signal.reason === "timeout" ? "timeout" : "aborted" };
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      return { kind: "aborted" };
    }
    return { kind: this.isOnline() ? "server" : "offline" };
  }
}

export const helpClient = new HelpClient();

import type { FeedbackReportInput, FeedbackErrorCode } from "feedback-engine";

export type FeedbackFailureCode = FeedbackErrorCode | "offline";

/** A submission failure. The message is fixed and never carries upstream text. */
export class FeedbackSubmitError extends Error {
  constructor(
    readonly code: FeedbackFailureCode,
    readonly retryAfterSeconds?: number,
  ) {
    super(code);
    this.name = "FeedbackSubmitError";
  }
}

export interface FeedbackReceipt {
  reference: string;
}

export interface FeedbackReportServiceDeps {
  fetch?: typeof fetch;
  baseUrl?: string;
}

const KNOWN_CODES = new Set<FeedbackErrorCode>([
  "invalid",
  "forbidden_origin",
  "rate_limited",
  "in_progress",
  "unavailable",
  "misconfigured",
]);

function defaultBaseUrl(): string {
  const env =
    (import.meta as { env?: Record<string, string | boolean | undefined> })
      .env ?? {};
  if (env.VITE_ORACLE_PROXY_URL) return String(env.VITE_ORACLE_PROXY_URL);
  if (env.DEV && !env.VITEST) return "http://localhost:8787";
  return "https://oracle-proxy.espen-erlandsen.workers.dev";
}

/** Sends a feedback report to the intake and maps every failure to a typed code. */
export class FeedbackReportService {
  constructor(private deps: FeedbackReportServiceDeps = {}) {}

  get baseUrl(): string {
    return this.deps.baseUrl ?? defaultBaseUrl();
  }

  async submitReport(input: FeedbackReportInput): Promise<FeedbackReceipt> {
    const response = await this.post(input);
    if (response.ok) return this.receiptFrom(response);
    throw await this.failureFrom(response);
  }

  private async post(input: FeedbackReportInput): Promise<Response> {
    try {
      return await (this.deps.fetch ?? fetch)(
        `${this.baseUrl}/api/feedback/reports`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
    } catch {
      throw new FeedbackSubmitError("offline");
    }
  }

  private async receiptFrom(response: Response): Promise<FeedbackReceipt> {
    const body = await readJson(response);
    if (typeof body?.reference === "string")
      return { reference: body.reference };
    throw new FeedbackSubmitError("unavailable");
  }

  private async failureFrom(response: Response): Promise<FeedbackSubmitError> {
    const body = await readJson(response);
    const code = typeof body?.error?.code === "string" ? body.error.code : "";
    return new FeedbackSubmitError(
      knownCode(code),
      retryAfterSeconds(response),
    );
  }
}

/** Reads a JSON body, or null for anything that is not JSON. */
async function readJson(
  response: Response,
): Promise<{ reference?: unknown; error?: { code?: unknown } } | null> {
  return (await response.json().catch(() => null)) as {
    reference?: unknown;
    error?: { code?: unknown };
  } | null;
}

function knownCode(code: string): FeedbackFailureCode {
  return KNOWN_CODES.has(code as FeedbackErrorCode)
    ? (code as FeedbackErrorCode)
    : "unavailable";
}

function retryAfterSeconds(response: Response): number | undefined {
  const seconds = Number(response.headers.get("Retry-After"));
  return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
}

export const feedbackReportService = new FeedbackReportService();

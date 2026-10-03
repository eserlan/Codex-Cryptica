/**
 * POST /api/help/ask — the contextual help assistant (#3427).
 *
 * The Worker is the trust boundary. The browser's screen description is
 * re-validated, product knowledge is retrieved from the build-time bundle, the
 * model answers only from what it is given, and everything the model returns
 * (citations, the chosen action) is checked here before the user sees it. The
 * route never touches vault data and never performs an action.
 *
 * Auth, origin checks and rate limits are the existing LLM session guard, so
 * help adds no new key, quota or credential.
 */
import {
  HELP_RESPONSE_JSON_SCHEMA,
  MAX_QUESTION_CHARS,
  buildActionCandidates,
  buildHelpPrompt,
  generatorActionRefs,
  contextualizeQuery,
  finalizeAnswer,
  noMatchAnswer,
  parseHelpContext,
  retrieve,
  type ActionRef,
  type HelpContext,
  type HelpTurn,
  type KnowledgeBundle,
} from "../../../../packages/help-engine/src";
import {
  HELP_EMBEDDING_MODEL,
  isValidEmbeddingVector as isValidHelpEmbeddingVector,
} from "../../../../packages/help-engine/src/bundle/embeddings";
import { createProviderResolver } from "./llm/provider-resolver";
import type { LlmRequest } from "./llm/types";
import {
  emitHelpMetric,
  type HelpMetricArea,
  type HelpOutcome,
} from "./help-metrics";
import { enforceLlmSession, type SessionEnv } from "./session-guard";

/** Generous for a question plus four short turns and a screen description. */
export const MAX_BODY_BYTES = 8 * 1024;
export const UPSTREAM_BUDGET_MS = 7000;
const EMBEDDING_BUDGET_MS = 1000;

export type HelpGenerate = (
  request: LlmRequest,
) => Promise<{ ok: true; content: unknown } | { ok: false; reason: string }>;

export interface HelpDeps {
  loadBundle: () => Promise<KnowledgeBundle | null>;
  generate: HelpGenerate;
  /** Returns a response to send instead (401/403/429), or null to continue. */
  guard: (request: Request) => Promise<Response | null>;
  /** Optional dense vector embedder for semantic search over chunk embeddings. */
  embedQuery?: (text: string) => Promise<number[] | null>;
  embeddingTimeoutMs?: number;
  now?: () => number;
  log?: (line: string) => void;
  timeoutMs?: number;
}

type Cors = Record<string, string>;

function json(data: unknown, status: number, cors: Cors): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function fail(status: number, code: string, message: string, cors: Cors) {
  return json({ error: { code, message } }, status, cors);
}

function parseHistory(input: unknown): HelpTurn[] {
  if (!Array.isArray(input)) return [];
  const turns: HelpTurn[] = [];
  for (const item of input) {
    if (
      item &&
      typeof item === "object" &&
      ((item as HelpTurn).role === "user" ||
        (item as HelpTurn).role === "assistant") &&
      typeof (item as HelpTurn).text === "string"
    ) {
      turns.push({
        role: (item as HelpTurn).role,
        text: (item as HelpTurn).text,
      });
    }
  }
  return turns;
}

function parseModelContent(content: unknown): unknown {
  if (typeof content !== "string") return content;
  const text = content.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

class UpstreamTimeout extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new UpstreamTimeout()), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

type AskRequest =
  | { ok: true; question: string; history: HelpTurn[]; context: HelpContext }
  | { ok: false; response: Response };

async function readBody(request: Request): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return "";

  try {
    const decoder = new TextDecoder();
    let bytes = 0;
    let raw = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      raw += decoder.decode(value, { stream: true });
    }
    return raw + decoder.decode();
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Reads and validates the request. Nothing here touches a model or the vault. */
async function readAsk(request: Request, cors: Cors): Promise<AskRequest> {
  const reject = (status: number, code: string, message: string) => ({
    ok: false as const,
    response: fail(status, code, message, cors),
  });

  const raw = await readBody(request);
  if (raw === null) {
    return reject(
      400,
      "BAD_REQUEST",
      "The request is too large or unreadable.",
    );
  }
  const body = parseJsonObject(raw);
  if (!body) {
    return reject(400, "BAD_REQUEST", "The request is not valid JSON.");
  }

  const question =
    typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return reject(400, "EMPTY_QUESTION", "Ask a question to get help.");
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return reject(
      400,
      "QUESTION_TOO_LONG",
      `Questions can be up to ${MAX_QUESTION_CHARS} characters.`,
    );
  }

  const context = parseHelpContext(body.context);
  if (!context.ok) {
    return reject(
      400,
      "INVALID_CONTEXT",
      "The screen description is not valid.",
    );
  }
  return {
    ok: true,
    question,
    history: parseHistory(body.history),
    context: context.value,
  };
}

/** The registry actions that apply to the retrieved features and are valid right now. */
function offerableActions(
  bundle: KnowledgeBundle,
  context: HelpContext,
  retrieval: ReturnType<typeof retrieve>,
): ActionRef[] {
  const featureIds = new Set([
    ...retrieval.screenFeatures.map((f) => f.id),
    ...retrieval.chunks.flatMap((c) =>
      c.chunk.featureId ? [c.chunk.featureId] : [],
    ),
  ]);
  const refs = [
    ...bundle.features
      .filter((f) => featureIds.has(f.id))
      .flatMap((f) => f.actions),
    // "Open this generator" only for the generators actually retrieved.
    ...generatorActionRefs(retrieval.chunks.map((c) => c.chunk)),
  ];
  return buildActionCandidates(refs, context, {
    helpIds: new Set(bundle.helpIds),
  });
}

type ModelOutcome =
  | { kind: "ok"; content: unknown }
  | { kind: "timeout" }
  | { kind: "unconfigured" }
  | { kind: "failed" };

async function callModel(
  generate: HelpGenerate,
  request: LlmRequest,
  timeoutMs: number,
): Promise<ModelOutcome> {
  try {
    const result = await withTimeout(generate(request), timeoutMs);
    if (result.ok) return { kind: "ok", content: result.content };
    return result.reason === "no-model-available"
      ? { kind: "unconfigured" }
      : { kind: "failed" };
  } catch (error) {
    return error instanceof UpstreamTimeout
      ? { kind: "timeout" }
      : { kind: "failed" };
  }
}

function modelFailure(
  outcome: Exclude<ModelOutcome, { kind: "ok" }>,
  cors: Cors,
) {
  switch (outcome.kind) {
    case "timeout":
      return fail(504, "UPSTREAM_ERROR", "Help took too long to answer.", cors);
    case "unconfigured":
      return fail(
        503,
        "HELP_NOT_CONFIGURED",
        "Help is not available right now.",
        cors,
      );
    default:
      return fail(
        502,
        "UPSTREAM_ERROR",
        "Help could not answer right now.",
        cors,
      );
  }
}

export function createHelpHandler(deps: HelpDeps) {
  const now = deps.now ?? Date.now;
  const timeoutMs = deps.timeoutMs ?? UPSTREAM_BUDGET_MS;

  // fallow-ignore-next-line complexity
  return async function handle(
    request: Request,
    cors: Cors,
  ): Promise<Response> {
    const start = now();
    const metric = (outcome: HelpOutcome, area: HelpMetricArea = "other") =>
      emitHelpMetric({ outcome, latencyMs: now() - start, area }, deps.log);

    const guarded = await deps.guard(request);
    if (guarded) {
      if (guarded.status === 429) metric("rate-limited");
      return guarded;
    }

    const asked = await readAsk(request, cors);
    if (!asked.ok) return asked.response;
    const { question, history, context } = asked;
    const area = context.area;

    const bundle = await deps.loadBundle();
    if (!bundle) {
      metric("error", area);
      return fail(
        503,
        "HELP_NOT_CONFIGURED",
        "Help is not available right now.",
        cors,
      );
    }

    const searchQuestion = contextualizeQuery(question, history);
    const embeddingBudgetMs = deps.embeddingTimeoutMs ?? EMBEDDING_BUDGET_MS;
    const queryVector = deps.embedQuery
      ? ((await withTimeout(deps.embedQuery(searchQuestion), embeddingBudgetMs)
          .then((vector) =>
            isValidHelpEmbeddingVector(vector) ? vector : null,
          )
          .catch(() => null)) ?? undefined)
      : undefined;
    const retrieval = retrieve(searchQuestion, bundle, context, {
      queryVector: queryVector ?? undefined,
      history,
    });
    if (retrieval.noMatch) {
      // Below the relevance floor: answer honestly without calling the model.
      metric("no-match", area);
      return json(noMatchAnswer(retrieval.suggestions), 200, cors);
    }

    const candidates = offerableActions(bundle, context, retrieval);
    const chunks = retrieval.chunks.map((c) => c.chunk);
    const model = await callModel(
      deps.generate,
      {
        operation: "help-answer",
        messages: buildHelpPrompt({
          question,
          history,
          context,
          chunks,
          candidates,
        }),
        schema: HELP_RESPONSE_JSON_SCHEMA as unknown as Record<string, unknown>,
        temperature: 0.2,
        maxOutputTokens: 600,
      },
      timeoutMs,
    );
    if (model.kind !== "ok") {
      metric("error", area);
      return modelFailure(model, cors);
    }

    const answer = finalizeAnswer({
      raw: parseModelContent(model.content),
      chunks,
      candidates,
      suggestions: retrieval.suggestions,
    });
    if (!answer) {
      metric("error", area);
      return fail(
        502,
        "UPSTREAM_ERROR",
        "Help could not answer right now.",
        cors,
      );
    }

    metric(answer.outcome, area);
    return json(answer, 200, cors);
  };
}

export interface HelpEnv extends SessionEnv {
  GEMINI_API_KEY: string;
  OPENAI_API_KEY?: string;
  AI?: any;
}

/** Production wiring: existing session guard, resolver, Workers AI embedder and lazily loaded bundle. */
export function handleHelpAsk(
  request: Request,
  env: HelpEnv,
  cors: Cors,
  isAllowedOrigin: boolean,
): Promise<Response> {
  const resolver = createProviderResolver(env);

  return createHelpHandler({
    guard: (req) => enforceLlmSession(req, env, cors, isAllowedOrigin),
    loadBundle: async () => {
      try {
        return (await import("./help-bundle")).helpBundle;
      } catch (error) {
        // Operators need to know why help is answering 503. The error's name
        // and message describe a missing file, never user content.
        console.error(
          "[help] knowledge bundle unavailable:",
          error instanceof Error ? error.message : "unknown",
        );
        return null;
      }
    },
    embedQuery: env.AI
      ? async (text: string) => {
          try {
            const res = (await env.AI.run(HELP_EMBEDDING_MODEL, {
              text: [text],
            })) as { data?: unknown };
            if (
              !Array.isArray(res?.data) ||
              res.data.length !== 1 ||
              !isValidHelpEmbeddingVector(res.data[0])
            ) {
              return null;
            }
            return res.data[0];
          } catch (error) {
            console.warn(
              "[help] query embedding failed, falling back to lexical search:",
              error instanceof Error ? error.message : "unknown",
            );
            return null;
          }
        }
      : undefined,
    generate: async (req) => {
      const outcome = await resolver.resolve(req, "public");
      return outcome.result.ok
        ? { ok: true, content: outcome.result.response.content }
        : { ok: false, reason: outcome.result.reason };
    },
  })(request, cors);
}

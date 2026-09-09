import { spawn } from "node:child_process";

const PORT = Number(process.env.PR_WEBHOOK_PORT ?? 8788);
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const EXPECTED_REPOSITORY =
  process.env.GITHUB_REPOSITORY ?? "eserlan/Codex-Cryptica";
const REPOSITORY_ROOT = process.env.PR_FIX_ROOT ?? process.cwd();

const activeJobs = new Map<number, ReturnType<typeof spawn>>();

const EVENT_ACTIONS: Record<string, readonly string[]> = {
  pull_request: ["opened", "reopened", "synchronize", "ready_for_review"],
  pull_request_review: ["submitted", "edited"],
  pull_request_review_comment: ["created", "edited"],
  check_run: ["completed"],
};

export interface WebhookEventSummary {
  event: string;
  action: string;
  repository: string;
  pullRequestNumber: number;
  headSha?: string;
  baseRef?: string;
}

export function shouldHandleEvent(
  event: string,
  action: string,
): boolean {
  return EVENT_ACTIONS[event]?.includes(action) ?? false;
}

export function summariseEvent(
  event: string,
  payload: Record<string, any>,
): WebhookEventSummary | null {
  const pullRequest = payload.pull_request;
  const checkPullRequest = payload.check_run?.pull_requests?.[0];
  const number = pullRequest?.number ?? payload.number;
  const repository = payload.repository?.full_name;
  if (
    typeof number !== "number" ||
    typeof repository !== "string" ||
    !shouldHandleEvent(event, String(payload.action ?? ""))
  ) {
    return null;
  }

  return {
    event,
    action: String(payload.action),
    repository,
    pullRequestNumber: number,
    headSha: pullRequest?.head?.sha ?? checkPullRequest?.sha,
    baseRef: pullRequest?.base?.ref,
  };
}

async function signatureFor(
  body: string,
  secret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );
  return `sha256=${Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
}

export async function verifySignature(
  body: string,
  header: string | null,
  secret: string,
): Promise<boolean> {
  if (!header) return false;
  const expected = await signatureFor(body, secret);
  const actualBytes = new TextEncoder().encode(header);
  const expectedBytes = new TextEncoder().encode(expected);
  if (actualBytes.length !== expectedBytes.length) return false;
  return actualBytes.every((byte, index) => byte === expectedBytes[index]);
}

function launchFix(summary: WebhookEventSummary): boolean {
  if (summary.baseRef && summary.baseRef !== "staging") {
    console.log(
      `[webhook] ignoring PR #${summary.pullRequestNumber}: base is ${summary.baseRef}`,
    );
    return false;
  }
  if (activeJobs.has(summary.pullRequestNumber)) {
    console.log(
      `[webhook] PR #${summary.pullRequestNumber} already has an active fixer; ignoring duplicate`,
    );
    return false;
  }

  const child = spawn(
    "bun",
    ["scripts/pr-check-fix.ts", String(summary.pullRequestNumber)],
    {
      cwd: REPOSITORY_ROOT,
      env: { ...process.env, HUSKY: "0" },
      stdio: "inherit",
    },
  );
  activeJobs.set(summary.pullRequestNumber, child);
  child.on("exit", (code, signal) => {
    activeJobs.delete(summary.pullRequestNumber);
    console.log(
      `[webhook] fixer for PR #${summary.pullRequestNumber} exited with ${signal ?? code ?? "unknown"}`,
    );
  });
  console.log(
    `[webhook] started fixer for PR #${summary.pullRequestNumber} (${summary.event}:${summary.action})`,
  );
  return true;
}

function response(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "application/json" },
  });
}

if (import.meta.main && !WEBHOOK_SECRET) {
  throw new Error("GITHUB_WEBHOOK_SECRET must be set");
}

if (import.meta.main) {
  Bun.serve({
    port: PORT,
    async fetch(request) {
      if (request.method === "GET" && new URL(request.url).pathname === "/health") {
        return response(JSON.stringify({ ok: true, activeJobs: activeJobs.size }));
      }
      if (request.method !== "POST" || new URL(request.url).pathname !== "/github") {
        return response(JSON.stringify({ error: "not found" }), 404);
      }

      const body = await request.text();
      if (!(await verifySignature(body, request.headers.get("x-hub-signature-256"), WEBHOOK_SECRET))) {
        return response(JSON.stringify({ error: "invalid signature" }), 401);
      }

      const event = request.headers.get("x-github-event") ?? "";
      let payload: Record<string, any>;
      try {
        payload = JSON.parse(body);
      } catch {
        return response(JSON.stringify({ error: "invalid JSON" }), 400);
      }

      if (payload.repository?.full_name !== EXPECTED_REPOSITORY) {
        return response(JSON.stringify({ error: "repository not allowed" }), 403);
      }
      const summary = summariseEvent(event, payload);
      if (!summary) return response(JSON.stringify({ ignored: true }));

      const started = launchFix(summary);
      return response(JSON.stringify({ accepted: started, pr: summary.pullRequestNumber }), 202);
    },
  });
  console.log(`[webhook] listening on http://127.0.0.1:${PORT}/github`);
}

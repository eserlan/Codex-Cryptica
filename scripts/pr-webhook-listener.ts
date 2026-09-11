import { execFileSync, spawn } from "node:child_process";
import { fetchPrFeedback } from "./pr-check-fix.ts";
import {
  getUnseenFeedback,
  hasFixEvidence,
  isAutoMergeEligible,
  isInternalReviewDue,
  loadPrAutomationState,
  markAutoMergeRequested,
  markFeedbackHandled,
  markInternalReviewCompleted,
  savePrAutomationState,
} from "./pr-review-automation-state.ts";

const PORT = Number(process.env.PR_WEBHOOK_PORT ?? 8788);
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const RELEASE_COMMS_SECRET = process.env.RELEASE_COMMS_SECRET;
const EXPECTED_REPOSITORY =
  process.env.GITHUB_REPOSITORY ?? "eserlan/Codex-Cryptica";
const REPOSITORY_ROOT = process.env.PR_FIX_ROOT ?? process.cwd();
export const MAX_BODY_BYTES = 1_000_000;
const AUTO_MERGE_ENABLED = process.env.PR_AUTO_MERGE === "true";
const AUTO_MERGE_QUIET_MS = 60_000;
const RECONCILE_INTERVAL_MS = Number(
  process.env.PR_RECONCILE_INTERVAL_MS ?? 5 * 60_000,
);

const activeJobs = new Map<number, ReturnType<typeof spawn>>();
const claimedJobs = new Set<number>();
const scheduledMerges = new Map<number, ReturnType<typeof setTimeout>>();
const activeCommsJobs = new Map<string, ReturnType<typeof spawn>>();

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

export function shouldHandleEvent(event: string, action: string): boolean {
  return EVENT_ACTIONS[event]?.includes(action) ?? false;
}

export function isStagingPush(
  event: string,
  payload: Record<string, any>,
): boolean {
  return event === "push" && payload.ref === "refs/heads/staging";
}

export function summariseEvent(
  event: string,
  payload: Record<string, any>,
): WebhookEventSummary | null {
  const pullRequest = payload.pull_request;
  const checkPullRequest = payload.check_run?.pull_requests?.[0];
  const number =
    pullRequest?.number ??
    payload.check_run?.pull_requests?.[0]?.number ??
    payload.number;
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
    headSha: pullRequest?.head?.sha ?? checkPullRequest?.head_sha,
    baseRef: pullRequest?.base?.ref,
  };
}

async function signatureFor(body: string, secret: string): Promise<string> {
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
  const [actualDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(header)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(expected)),
  ]);
  const actualBytes = new Uint8Array(actualDigest);
  const expectedBytes = new Uint8Array(expectedDigest);
  let difference = 0;
  for (let index = 0; index < expectedBytes.length; index++) {
    difference |= actualBytes[index] ^ expectedBytes[index];
  }
  return difference === 0;
}

/** Constant-time-ish comparison of a shared-secret header against the expected value. */
export async function verifySharedSecret(
  header: string | null,
  secret: string,
): Promise<boolean> {
  if (!header) return false;
  const [actualDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(header)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)),
  ]);
  const actualBytes = new Uint8Array(actualDigest);
  const expectedBytes = new Uint8Array(expectedDigest);
  let difference = 0;
  for (let index = 0; index < expectedBytes.length; index++) {
    difference |= actualBytes[index] ^ expectedBytes[index];
  }
  return difference === 0;
}

function resolveBaseRef(pullRequestNumber: number): string | null {
  try {
    return (
      execFileSync(
        "gh",
        [
          "pr",
          "view",
          String(pullRequestNumber),
          "--json",
          "baseRefName",
          "--jq",
          ".baseRefName",
        ],
        {
          cwd: REPOSITORY_ROOT,
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "ignore"],
        },
      ).trim() || null
    );
  } catch {
    return null;
  }
}

export async function scheduleAutoMerge(
  pullRequestNumber: number,
): Promise<void> {
  if (!AUTO_MERGE_ENABLED) return;

  const existingTimer = scheduledMerges.get(pullRequestNumber);
  if (existingTimer) {
    clearTimeout(existingTimer);
    scheduledMerges.delete(pullRequestNumber);
  }

  const timer = setTimeout(async () => {
    scheduledMerges.delete(pullRequestNumber);
    try {
      const feedback = fetchPrFeedback(pullRequestNumber, REPOSITORY_ROOT);
      const state = await loadPrAutomationState();
      const unseen = getUnseenFeedback(feedback, state);
      if (!isAutoMergeEligible(feedback, unseen, state)) {
        console.log(
          `[webhook] PR #${pullRequestNumber} is not eligible for auto-merge yet`,
        );
        return;
      }

      const record = state.pullRequests[String(pullRequestNumber)];
      if (record?.lastAutoMergeHeadSha === feedback.prMeta.headRefOid) {
        console.log(
          `[webhook] auto-merge already requested for PR #${pullRequestNumber}`,
        );
        return;
      }

      execFileSync(
        "gh",
        ["pr", "merge", String(pullRequestNumber), "--auto", "--squash"],
        { cwd: REPOSITORY_ROOT, stdio: "inherit" },
      );
      await savePrAutomationState(
        markAutoMergeRequested(
          state,
          pullRequestNumber,
          feedback.prMeta.headRefOid,
        ),
      );
      console.log(
        `[webhook] enabled squash auto-merge for PR #${pullRequestNumber}`,
      );
    } catch (error) {
      console.error(
        `[webhook] could not enable auto-merge for PR #${pullRequestNumber}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }, AUTO_MERGE_QUIET_MS);
  scheduledMerges.set(pullRequestNumber, timer);
  console.log(
    `[webhook] PR #${pullRequestNumber} is settled; waiting ${AUTO_MERGE_QUIET_MS / 1000}s before auto-merge`,
  );
}

async function launchFix(summary: WebhookEventSummary): Promise<boolean> {
  const baseRef = summary.baseRef ?? resolveBaseRef(summary.pullRequestNumber);
  if (baseRef !== "staging") {
    console.log(
      `[webhook] ignoring PR #${summary.pullRequestNumber}: base is ${baseRef ?? "unknown"}`,
    );
    return false;
  }
  if (
    activeJobs.has(summary.pullRequestNumber) ||
    claimedJobs.has(summary.pullRequestNumber)
  ) {
    console.log(
      `[webhook] PR #${summary.pullRequestNumber} already has an active fixer; ignoring duplicate`,
    );
    return false;
  }

  claimedJobs.add(summary.pullRequestNumber);
  try {
    const feedback = fetchPrFeedback(
      summary.pullRequestNumber,
      REPOSITORY_ROOT,
    );
    const state = await loadPrAutomationState();
    const unseen = getUnseenFeedback(feedback, state);
    const reviewIfClear = isInternalReviewDue(feedback, unseen, state);
    if (!unseen.hasActionableFeedback && !reviewIfClear) {
      console.log(
        `[webhook] PR #${summary.pullRequestNumber} has no new actionable feedback; ignoring duplicate`,
      );
      await scheduleAutoMerge(summary.pullRequestNumber);
      return false;
    }

    const child = spawn(
      "bun",
      [
        "scripts/pr-check-fix.ts",
        String(summary.pullRequestNumber),
        ...(reviewIfClear ? ["--review-if-clear"] : []),
      ],
      {
        cwd: REPOSITORY_ROOT,
        env: { ...process.env, HUSKY: "0" },
        stdio: "inherit",
      },
    );
    activeJobs.set(summary.pullRequestNumber, child);
    child.on("exit", async (code, signal) => {
      activeJobs.delete(summary.pullRequestNumber);
      console.log(
        `[webhook] fixer for PR #${summary.pullRequestNumber} exited with ${signal ?? code ?? "unknown"}`,
      );
      if (code !== 0) return;

      const refreshedFeedback = fetchPrFeedback(
        summary.pullRequestNumber,
        REPOSITORY_ROOT,
      );
      if (reviewIfClear) {
        const completedState = await loadPrAutomationState();
        await savePrAutomationState(
          markInternalReviewCompleted(
            completedState,
            summary.pullRequestNumber,
            refreshedFeedback.prMeta.headRefOid,
          ),
        );
        console.log(
          `[webhook] internal two-pass review completed for PR #${summary.pullRequestNumber} at ${refreshedFeedback.prMeta.headRefOid}`,
        );
        await scheduleAutoMerge(summary.pullRequestNumber);
        return;
      }

      if (!hasFixEvidence(feedback, refreshedFeedback)) {
        console.warn(
          `[webhook] fixer for PR #${summary.pullRequestNumber} produced no observable fix; leaving feedback actionable`,
        );
        return;
      }

      const completedState = await loadPrAutomationState();
      await savePrAutomationState(
        markFeedbackHandled(feedback, completedState),
      );
      await scheduleAutoMerge(summary.pullRequestNumber);
    });
    console.log(
      `[webhook] started ${reviewIfClear ? "internal reviewer" : "fixer"} for PR #${summary.pullRequestNumber} (${summary.event}:${summary.action})`,
    );
    return true;
  } catch (error) {
    console.error(
      `[webhook] could not inspect PR #${summary.pullRequestNumber}: ${error instanceof Error ? error.message : error}`,
    );
    return false;
  } finally {
    claimedJobs.delete(summary.pullRequestNumber);
  }
}

function listOpenStagingPrIds(): number[] {
  try {
    const raw = execFileSync(
      "gh",
      [
        "pr",
        "list",
        "--base",
        "staging",
        "--state",
        "open",
        "--json",
        "number",
      ],
      {
        cwd: REPOSITORY_ROOT,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    return (JSON.parse(raw) as Array<{ number: number }>).map(
      (pr) => pr.number,
    );
  } catch {
    return [];
  }
}

/**
 * Webhook delivery is not a reliable trigger on its own: GitHub may never
 * send a fresh event after the last check on a PR finishes, and a transient
 * `gh` failure inside scheduleAutoMerge's timer is only logged, never
 * retried. Periodically re-running the same eligibility check against every
 * open PR targeting `staging` gives every PR a chance to make progress
 * independent of whether webhook delivery actually happened.
 */
export async function reconcileOpenPrs(
  pullRequestNumbers: number[] = listOpenStagingPrIds(),
  processPr: (pullRequestNumber: number) => Promise<unknown> = (
    pullRequestNumber,
  ) =>
    launchFix({
      event: "reconcile",
      action: "sweep",
      repository: EXPECTED_REPOSITORY,
      pullRequestNumber,
      baseRef: "staging",
    }),
): Promise<void> {
  for (const pullRequestNumber of pullRequestNumbers) {
    try {
      await processPr(pullRequestNumber);
    } catch (error) {
      console.error(
        `[webhook] reconcile sweep failed for PR #${pullRequestNumber}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}

export function launchReleaseComms(promoteRunId: string): boolean {
  if (activeCommsJobs.has(promoteRunId)) {
    console.log(
      `[webhook] release-comms already running for promote run ${promoteRunId}; ignoring duplicate`,
    );
    return false;
  }

  const child = spawn("bun", ["scripts/release-comms-agent.ts", promoteRunId], {
    cwd: REPOSITORY_ROOT,
    env: { ...process.env, HUSKY: "0" },
    stdio: "inherit",
  });
  activeCommsJobs.set(promoteRunId, child);
  child.on("exit", (code, signal) => {
    activeCommsJobs.delete(promoteRunId);
    console.log(
      `[webhook] release-comms for promote run ${promoteRunId} exited with ${signal ?? code ?? "unknown"}`,
    );
  });
  console.log(
    `[webhook] started release-comms agent for promote run ${promoteRunId}`,
  );
  return true;
}

async function launchStagingConflictFixes(): Promise<number> {
  let prNumbers: number[];
  try {
    const output = execFileSync(
      "gh",
      [
        "pr",
        "list",
        "--base",
        "staging",
        "--state",
        "open",
        "--json",
        "number",
        "--jq",
        ".[].number",
      ],
      {
        cwd: REPOSITORY_ROOT,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    prNumbers = output
      .split("\n")
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isInteger(value));
  } catch (error) {
    console.error(
      `[webhook] could not list staging PRs after a staging push: ${error instanceof Error ? error.message : error}`,
    );
    return 0;
  }

  let started = 0;
  for (const pullRequestNumber of prNumbers) {
    try {
      const feedback = fetchPrFeedback(pullRequestNumber, REPOSITORY_ROOT);
      const hasConflict =
        feedback.prMeta.mergeable === "CONFLICTING" ||
        feedback.prMeta.mergeStateStatus === "DIRTY";
      if (!hasConflict) continue;
      if (
        await launchFix({
          event: "push",
          action: "staging-updated",
          repository: EXPECTED_REPOSITORY,
          pullRequestNumber,
          baseRef: "staging",
        })
      ) {
        started += 1;
      }
    } catch (error) {
      console.error(
        `[webhook] could not inspect conflicted PR #${pullRequestNumber}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
  return started;
}

function response(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function readRequestBody(
  request: Request,
): Promise<string | null> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) return null;

  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) return null;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

if (import.meta.main && !WEBHOOK_SECRET) {
  throw new Error("GITHUB_WEBHOOK_SECRET must be set");
}

if (import.meta.main) {
  Bun.serve({
    port: PORT,
    async fetch(request) {
      const pathname = new URL(request.url).pathname;

      if (request.method === "GET" && pathname === "/health") {
        return response(
          JSON.stringify({
            ok: true,
            activeJobs: activeJobs.size,
            activeCommsJobs: activeCommsJobs.size,
          }),
        );
      }

      if (request.method === "POST" && pathname === "/release-comms") {
        if (!RELEASE_COMMS_SECRET) {
          return response(
            JSON.stringify({ error: "release comms not configured" }),
            403,
          );
        }
        if (
          !(await verifySharedSecret(
            request.headers.get("x-release-comms-secret"),
            RELEASE_COMMS_SECRET,
          ))
        ) {
          return response(JSON.stringify({ error: "invalid secret" }), 401);
        }
        const commsBody = await readRequestBody(request);
        if (commsBody === null) {
          return response(JSON.stringify({ error: "payload too large" }), 413);
        }
        let commsPayload: Record<string, unknown>;
        try {
          commsPayload = JSON.parse(commsBody);
        } catch {
          return response(JSON.stringify({ error: "invalid JSON" }), 400);
        }
        const promoteRunId = String(commsPayload.promoteRunId ?? "");
        if (!promoteRunId) {
          return response(
            JSON.stringify({ error: "promoteRunId required" }),
            400,
          );
        }
        const started = launchReleaseComms(promoteRunId);
        return response(JSON.stringify({ accepted: started }), 202);
      }

      if (request.method !== "POST" || pathname !== "/github") {
        return response(JSON.stringify({ error: "not found" }), 404);
      }

      const body = await readRequestBody(request);
      if (body === null) {
        return response(JSON.stringify({ error: "payload too large" }), 413);
      }
      if (
        !(await verifySignature(
          body,
          request.headers.get("x-hub-signature-256"),
          WEBHOOK_SECRET,
        ))
      ) {
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
        return response(
          JSON.stringify({ error: "repository not allowed" }),
          403,
        );
      }
      if (isStagingPush(event, payload)) {
        void launchStagingConflictFixes();
        return response(
          JSON.stringify({ accepted: true, scope: "staging-conflicts" }),
          202,
        );
      }
      const summary = summariseEvent(event, payload);
      if (!summary) return response(JSON.stringify({ ignored: true }));

      const started = await launchFix(summary);
      return response(
        JSON.stringify({ accepted: started, pr: summary.pullRequestNumber }),
        202,
      );
    },
  });
  console.log(`[webhook] listening on http://127.0.0.1:${PORT}/github`);

  setInterval(() => {
    void reconcileOpenPrs().catch((error) => {
      console.error(
        `[webhook] reconcile sweep failed: ${error instanceof Error ? error.message : error}`,
      );
    });
  }, RECONCILE_INTERVAL_MS);
  console.log(
    `[webhook] reconciliation sweep scheduled every ${RECONCILE_INTERVAL_MS / 1000}s`,
  );
}

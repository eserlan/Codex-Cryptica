import { describe, expect, it, vi } from "vitest";
import {
  handleFeedbackReport,
  type FeedbackDeps,
  type FeedbackEnv,
} from "./feedback-reports";
import { fakeBucket } from "./__tests__/fake-r2";

const ORIGIN = "https://codexcryptica.com";
const IP = "203.0.113.5";
const SUBMISSION = "3f0c2b1e-8d4a-4c6b-9e2f-1a2b3c4d5e6f";
const REPO = "eserlan/codex-cryptica-feedback";
const HOUR = 60 * 60 * 1000;
const START = Date.UTC(2026, 9, 19, 15, 4, 5);

type Github = ReturnType<typeof githubFake>;

function githubFake(mode: "ok" | "500" | "network" | "hang" = "ok") {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    if (mode === "network") throw new TypeError("fetch failed");
    if (mode === "500") return new Response("boom", { status: 500 });
    if (mode === "hang") {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      });
    }
    return new Response(
      JSON.stringify({
        number: 17,
        html_url: "https://github.com/x/y/issues/17",
      }),
      {
        status: 201,
      },
    );
  });
  return { fn, calls };
}

function makeEnv(over: Partial<FeedbackEnv> = {}): FeedbackEnv {
  return {
    ALLOWED_ORIGINS: undefined,
    BUCKET: fakeBucket(),
    FEEDBACK_GITHUB_TOKEN: "test-token",
    FEEDBACK_GITHUB_REPO: REPO,
    FEEDBACK_HASH_KEY: "hash-key",
    ...over,
  } as FeedbackEnv;
}

function body(over: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    submissionId: SUBMISSION,
    kind: "problem",
    description: "The tracker stayed empty.",
    contactEmail: "gm@example.com",
    meta: {
      appVersion: "0.36.0",
      area: "tabletop",
      browser: "firefox",
      screen: "narrow",
    },
    ...over,
  };
}

function req(payload: unknown, headers: Record<string, string> = {}) {
  const init: Record<string, string> = {
    "Content-Type": "application/json",
    Origin: ORIGIN,
    "CF-Connecting-IP": IP,
    ...headers,
  };
  return new Request("https://oracle-proxy.test/api/feedback/reports", {
    method: "POST",
    headers: init,
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}

function deps(github: Github, over: Partial<FeedbackDeps> = {}) {
  const lines: string[] = [];
  const d: FeedbackDeps = {
    fetch: github.fn as unknown as typeof fetch,
    now: () => START,
    random: () => Uint8Array.from([31, 14, 9, 22, 5, 18, 30, 12]),
    log: (line) => lines.push(line),
    timeoutMs: 8000,
    ...over,
  };
  return { d, lines };
}

const run = (r: Request, env: FeedbackEnv, d: FeedbackDeps) =>
  handleFeedbackReport(r, env, d);

describe("accepting a report", () => {
  it("creates one private issue and returns a reference", async () => {
    const gh = githubFake();
    const { d } = deps(gh);
    const res = await run(req(body()), makeEnv(), d);

    expect(res.status).toBe(201);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.reference).toMatch(
      /^CC-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/,
    );
    expect(gh.calls).toHaveLength(1);
    expect(gh.calls[0]!.url).toBe(
      `https://api.github.com/repos/${REPO}/issues`,
    );
    const sent = JSON.parse(String(gh.calls[0]!.init.body));
    expect(sent.title).toBe(`[Problem] ${json.reference}`);
    expect(sent.labels).toEqual(["report:problem"]);
    expect(sent.body).toContain("The tracker stayed empty.");
    expect(sent.body).toContain("gm@example.com");
  });

  it("sends the token only to GitHub and returns no internal detail", async () => {
    const gh = githubFake();
    const { d } = deps(gh);
    const res = await run(req(body()), makeEnv(), d);
    const text = await res.text();
    expect(text).not.toMatch(
      /test-token|issues\/17|codex-cryptica-feedback|github\.com/,
    );
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
    const headers = gh.calls[0]!.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-token");
  });

  it.each([
    ["idea", "[Idea]", "report:idea"],
    ["other", "[Other]", "report:other"],
  ])("labels a %s report", async (kind, prefix, label) => {
    const gh = githubFake();
    const { d } = deps(gh);
    await run(req(body({ kind })), makeEnv(), d);
    const sent = JSON.parse(String(gh.calls[0]!.init.body));
    expect(sent.title.startsWith(prefix)).toBe(true);
    expect(sent.labels).toEqual([label]);
  });

  it("removes secrets and keeps the text inert in the issue body", async () => {
    const gh = githubFake();
    const { d } = deps(gh);
    await run(
      req(
        body({
          description:
            "my key is sk-abc123def456ghi789jkl012mno345 ![x](https://e.co/p.png)",
        }),
      ),
      makeEnv(),
      d,
    );
    const sent = JSON.parse(String(gh.calls[0]!.init.body));
    expect(sent.body).toContain("[removed: possible secret]");
    expect(sent.body).not.toContain("sk-abc123");
    expect(sent.body).toContain("![x](https://e.co/p.png)");
  });

  it("never sends the source address or the raw submission id to GitHub or the logs", async () => {
    const gh = githubFake();
    const { d, lines } = deps(gh);
    await run(req(body()), makeEnv(), d);
    const sent = String(gh.calls[0]!.init.body);
    expect(sent).not.toContain(IP);
    expect(sent).not.toContain(SUBMISSION);
    expect(lines.join("\n")).not.toMatch(new RegExp(`${IP}|${SUBMISSION}`));
  });
});

describe("rejecting input", () => {
  it.each([
    ["a missing origin", { Origin: "" }],
    ["a foreign origin", { Origin: "https://evil.example" }],
  ])("refuses %s with 403 and sends nothing", async (_label, headers) => {
    const gh = githubFake();
    const { d } = deps(gh);
    const res = await run(req(body(), headers), makeEnv(), d);
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      "forbidden_origin",
    );
    expect(gh.calls).toHaveLength(0);
  });

  it("refuses a body over 16 KB before parsing", async () => {
    const gh = githubFake();
    const { d } = deps(gh);
    const res = await run(
      req(body({ description: "x".repeat(20000) })),
      makeEnv(),
      d,
    );
    expect(res.status).toBe(400);
    expect(gh.calls).toHaveLength(0);
  });

  it("refuses non-JSON content types", async () => {
    const gh = githubFake();
    const { d } = deps(gh);
    const res = await run(
      req(JSON.stringify(body()), { "Content-Type": "text/plain" }),
      makeEnv(),
      d,
    );
    expect(res.status).toBe(400);
    expect(gh.calls).toHaveLength(0);
  });

  it("refuses malformed JSON", async () => {
    const gh = githubFake();
    const { d } = deps(gh);
    const res = await run(req("{not json"), makeEnv(), d);
    expect(res.status).toBe(400);
    expect(gh.calls).toHaveLength(0);
  });

  it.each([
    ["an unknown top-level key", { vaultId: "v1" }],
    ["an unknown meta key", { meta: { ...body().meta, userAgent: "x" } }],
    [
      "a URL with a query and fragment",
      { url: "https://x.test/map?q=ghost#frag" },
    ],
    ["a filled honeypot", { website: "http://spam" }],
    ["an unknown kind", { kind: "rant" }],
    ["a description of only whitespace", { description: "   " }],
  ])("refuses %s with 400 and sends nothing", async (_label, over) => {
    const gh = githubFake();
    const { d } = deps(gh);
    const res = await run(req(body(over)), makeEnv(), d);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      "invalid",
    );
    expect(gh.calls).toHaveLength(0);
  });

  it("refuses a method other than POST", async () => {
    const gh = githubFake();
    const { d } = deps(gh);
    const r = new Request("https://oracle-proxy.test/api/feedback/reports", {
      method: "GET",
      headers: { Origin: ORIGIN },
    });
    expect((await run(r, makeEnv(), d)).status).toBe(405);
    expect(gh.calls).toHaveLength(0);
  });
});

describe("configuration", () => {
  it.each([
    ["no token", { FEEDBACK_GITHUB_TOKEN: undefined }],
    ["no repository", { FEEDBACK_GITHUB_REPO: undefined }],
    [
      "a repository that is not owner/name",
      { FEEDBACK_GITHUB_REPO: "evil.com/../x" },
    ],
    ["no hash key", { FEEDBACK_HASH_KEY: undefined }],
    ["no bucket", { BUCKET: undefined }],
  ])(
    "returns 503 misconfigured with %s, sending nothing and using no quota",
    async (_label, over) => {
      const gh = githubFake();
      const { d } = deps(gh);
      const env = makeEnv(over as Partial<FeedbackEnv>);
      const res = await run(req(body()), env, d);
      expect(res.status).toBe(503);
      expect(
        ((await res.json()) as { error: { code: string } }).error.code,
      ).toBe("misconfigured");
      expect(gh.calls).toHaveLength(0);
    },
  );
});

describe("limits and abuse", () => {
  it("refuses a burst from the rate limiter with Retry-After", async () => {
    const gh = githubFake();
    const { d } = deps(gh);
    const env = makeEnv({
      FEEDBACK_RATE_LIMITER: { limit: async () => ({ success: false }) },
    });
    const res = await run(req(body()), env, d);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    expect(gh.calls).toHaveLength(0);
  });

  it("allows 5 reports in an hour and refuses the sixth", async () => {
    const gh = githubFake();
    const env = makeEnv();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const { d } = deps(gh, { now: () => START });
      const res = await run(
        req(body({ submissionId: crypto.randomUUID() })),
        env,
        d,
      );
      statuses.push(res.status);
    }
    expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
  });

  it("allows 20 reports in a day and refuses the twenty-first", async () => {
    const gh = githubFake();
    const env = makeEnv();
    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) {
      // Start at UTC midnight so all 21 reports fall on one day.
      const { d } = deps(gh, { now: () => Date.UTC(2026, 9, 19) + i * HOUR });
      const res = await run(
        req(body({ submissionId: crypto.randomUUID() })),
        env,
        d,
      );
      statuses.push(res.status);
    }
    expect(statuses.filter((s) => s === 201)).toHaveLength(20);
    expect(statuses.at(-1)).toBe(429);
  });

  it("does not count a refused report against the next hour", async () => {
    const gh = githubFake();
    const env = makeEnv();
    for (let i = 0; i < 5; i++) {
      const { d } = deps(gh, { now: () => START });
      await run(req(body({ submissionId: crypto.randomUUID() })), env, d);
    }
    const refused = req(body({ submissionId: crypto.randomUUID() }));
    expect(
      (await run(refused, env, deps(gh, { now: () => START }).d)).status,
    ).toBe(429);
    const later = deps(gh, { now: () => START + HOUR });
    expect(
      (
        await run(
          req(body({ submissionId: crypto.randomUUID() })),
          env,
          later.d,
        )
      ).status,
    ).toBe(201);
  });

  it("stores quota counters and markers only under hashed keys, never the raw address", async () => {
    const gh = githubFake();
    const env = makeEnv();
    const { d } = deps(gh);
    await run(req(body()), env, d);
    const keys = [
      ...(env.BUCKET as { store: Map<string, unknown> }).store.keys(),
    ];
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(key.startsWith("feedback/")).toBe(true);
      expect(key).not.toContain(IP);
      expect(key).not.toContain(SUBMISSION);
    }
  });
});

describe("delivery failure", () => {
  it.each([
    ["GitHub returns 500", "500" as const],
    ["the network fails", "network" as const],
  ])(
    "returns 503 unavailable when %s, and never claims success",
    async (_label, mode) => {
      const gh = githubFake(mode);
      const { d } = deps(gh);
      const res = await run(req(body()), makeEnv(), d);
      expect(res.status).toBe(503);
      expect(
        ((await res.json()) as { error: { code: string } }).error.code,
      ).toBe("unavailable");
    },
  );

  it("gives up on a hung GitHub after the timeout", async () => {
    const gh = githubFake("hang");
    const { d } = deps(gh, { timeoutMs: 10 });
    const res = await run(req(body()), makeEnv(), d);
    expect(res.status).toBe(503);
  });

  it("releases the quota and the marker, so the same submission can be retried", async () => {
    const env = makeEnv();
    const failing = githubFake("500");
    const { d: failD } = deps(failing);
    expect((await run(req(body()), env, failD)).status).toBe(503);

    const working = githubFake();
    const { d: okD } = deps(working);
    const retry = await run(req(body()), env, okD);
    expect(retry.status).toBe(201);
    expect(working.calls).toHaveLength(1);
  });

  it("releases the marker when the quota refuses, so the retry is processed", async () => {
    const env = makeEnv();
    const gh = githubFake();
    for (let i = 0; i < 5; i++) {
      const { d } = deps(gh, { now: () => START });
      await run(req(body({ submissionId: crypto.randomUUID() })), env, d);
    }
    const { d: refusedD } = deps(gh, { now: () => START });
    expect(
      (await run(req(body({ submissionId: SUBMISSION })), env, refusedD))
        .status,
    ).toBe(429);

    const { d: laterD } = deps(gh, { now: () => START + HOUR });
    expect(
      (await run(req(body({ submissionId: SUBMISSION })), env, laterD)).status,
    ).toBe(201);
  });
});

describe("ambiguous delivery", () => {
  it("keeps the pending marker when GitHub never answers, so a quick retry is not a second issue", async () => {
    const env = makeEnv();
    const first = githubFake("hang");
    const { d: firstD } = deps(first, { timeoutMs: 10 });
    expect((await run(req(body()), env, firstD)).status).toBe(503);

    const second = githubFake();
    const { d: retryD } = deps(second);
    const retry = await run(req(body()), env, retryD);
    expect(retry.status).toBe(409);
    expect(
      ((await retry.json()) as { error: { code: string } }).error.code,
    ).toBe("in_progress");
    expect(second.calls).toHaveLength(0);
  });

  it("keeps the quota slot when the outcome is unknown", async () => {
    const env = makeEnv();
    const hung = githubFake("hang");
    await run(
      req(body({ submissionId: crypto.randomUUID() })),
      env,
      deps(hung, { timeoutMs: 10 }).d,
    );
    const keys = [
      ...(
        env.BUCKET as { store: Map<string, { text: string }> }
      ).store.entries(),
    ]
      .filter(([key]) => key.includes("/quota/hour/"))
      .map(([, value]) => JSON.parse(value.text).count);
    expect(keys).toEqual([1]);
  });
});

describe("oversized declared body", () => {
  it("refuses a declared size over the cap before reading the body", async () => {
    const text = vi.fn(async () => "{}");
    const request = {
      method: "POST",
      headers: new Headers({
        Origin: ORIGIN,
        "Content-Type": "application/json",
        "Content-Length": "20000",
      }),
      text,
    } as unknown as Request;
    const gh = githubFake();
    const { d } = deps(gh);
    expect((await run(request, makeEnv(), d)).status).toBe(400);
    expect(text).not.toHaveBeenCalled();
    expect(gh.calls).toHaveLength(0);
  });
});

describe("marker write after delivery", () => {
  it("still returns the reference when the delivered marker cannot be written", async () => {
    const env = makeEnv();
    const bucket = env.BUCKET as {
      put: (...args: unknown[]) => Promise<unknown>;
    };
    const put = bucket.put;
    bucket.put = async (...args: unknown[]) => {
      if (String(args[1]).includes('"delivered"'))
        throw new Error("r2 unavailable");
      return put.apply(bucket, args);
    };
    const gh = githubFake();
    const { d } = deps(gh);
    const res = await run(req(body()), env, d);
    expect(res.status).toBe(201);
    expect(((await res.json()) as { reference: string }).reference).toMatch(
      /^CC-/,
    );
    expect(gh.calls).toHaveLength(1);
  });
});

describe("duplicates", () => {
  it("returns the same reference for a delivered submission without a second issue", async () => {
    const gh = githubFake();
    const env = makeEnv();
    const first = await (await run(req(body()), env, deps(gh).d)).json();
    const second = await run(req(body()), env, deps(gh).d);
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual(first);
    expect(gh.calls).toHaveLength(1);
  });

  it("returns 409 in_progress while the same submission is still being sent", async () => {
    const env = makeEnv();
    const bucket = env.BUCKET as {
      store: Map<string, { text: string; etag: string }>;
    };
    const gh = githubFake();
    const { d } = deps(gh);
    const pending = `feedback/submission/${await hmac("hash-key", SUBMISSION)}`;
    bucket.store.set(pending, {
      text: JSON.stringify({ state: "pending", at: START }),
      etag: "p1",
    });
    const res = await run(req(body()), env, d);
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      "in_progress",
    );
    expect(gh.calls).toHaveLength(0);
  });

  it("re-claims a pending submission that is more than two minutes old", async () => {
    const env = makeEnv();
    const bucket = env.BUCKET as {
      store: Map<string, { text: string; etag: string }>;
    };
    const gh = githubFake();
    const pending = `feedback/submission/${await hmac("hash-key", SUBMISSION)}`;
    bucket.store.set(pending, {
      text: JSON.stringify({ state: "pending", at: START - 3 * 60 * 1000 }),
      etag: "p1",
    });
    const { d } = deps(gh);
    expect((await run(req(body()), env, d)).status).toBe(201);
    expect(gh.calls).toHaveLength(1);
  });

  it("sends a report exactly once when the same submission arrives twice at once", async () => {
    const env = makeEnv();
    const gh = githubFake();
    const { d } = deps(gh);
    const [a, b] = await Promise.all([
      run(req(body()), env, d),
      run(req(body()), env, d),
    ]);
    // Either the second request meets the pending marker (409), or it arrives
    // after delivery and gets the stored reference (200).
    expect(["201,409", "200,201"]).toContain(
      [a.status, b.status].sort().join(","),
    );
    expect(gh.calls).toHaveLength(1);
  });
});

describe("usage metrics", () => {
  it("logs one outcome line per request, with no content", async () => {
    const gh = githubFake();
    const { d, lines } = deps(gh);
    await run(req(body()), makeEnv(), d);
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!)).toEqual({
      event: "feedback.report",
      outcome: "accepted",
      kind: "problem",
    });
  });

  it("logs unavailable when delivery fails", async () => {
    const gh = githubFake("500");
    const { d, lines } = deps(gh);
    await run(req(body()), makeEnv(), d);
    expect(JSON.parse(lines[0]!).outcome).toBe("unavailable");
  });
});

async function hmac(key: string, value: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(sig)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

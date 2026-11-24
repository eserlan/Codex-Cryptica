import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "bun:test";
import {
  instrumentStatelessProxyFetch,
  makeLiveReport,
  markdownReport,
  type ProxyCallRecord,
} from "./adventure-director-eval";

const repoRoot = resolve(import.meta.dir, "..");
const scriptPath = resolve(import.meta.dir, "adventure-director-eval.ts");

describe("synthetic GM Director live evaluation CLI", () => {
  it("selects the default matrix without making provider calls unless opted in", () => {
    const output = execFileSync("bun", [scriptPath], {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 10_000,
      env: {
        ...process.env,
        ORACLE_PROXY_URL: "http://127.0.0.1:1",
      },
    });

    expect(output).toContain("No provider calls made.");
    expect(output).toContain("Selected 8 conditions × 1 sample(s) × 8 turns.");
    expect(output).toContain("Add --live to opt in.");
  });

  it("rejects sample counts above the bounded limit before any provider call", () => {
    let error = "";
    try {
      execFileSync("bun", [scriptPath, "--live", "--samples", "4"], {
        cwd: repoRoot,
        encoding: "utf8",
        timeout: 10_000,
        env: {
          ...process.env,
          ORACLE_PROXY_URL: "http://127.0.0.1:1",
        },
      });
    } catch (caught) {
      error = String((caught as { stderr?: Buffer }).stderr ?? caught);
    }

    expect(error).toContain("Samples must be an integer from 1 to 3.");
  });

  it("rejects remote or credential-bearing proxy URLs before any provider call", () => {
    const unsafeProxyUrls = [
      "https://example.com/proxy",
      "http://user:not-a-real-token@127.0.0.1:8787",
      "http://127.0.0.1:8787?token=not-a-real-token",
    ];
    for (const proxy of unsafeProxyUrls) {
      let error = "";
      try {
        execFileSync("bun", [scriptPath, "--proxy", proxy], {
          cwd: repoRoot,
          encoding: "utf8",
          timeout: 10_000,
          env: { ...process.env, ORACLE_PROXY_URL: "http://127.0.0.1:1" },
        });
      } catch (caught) {
        error = String((caught as { stderr?: Buffer }).stderr ?? caught);
      }
      expect(error).toContain("Proxy URL must target a local loopback host.");
    }
  });

  it("omits proxy path credentials from JSON and Markdown reports", () => {
    const report = makeLiveReport(
      {
        samples: 1,
        proxy: "http://127.0.0.1:8787/private-token",
        origin: "http://localhost:5173",
      },
      [],
      [],
    );
    const json = JSON.stringify(report);
    const markdown = markdownReport({
      generatedAt: report.generatedAt,
      proxy: report.proxy,
      origin: report.origin,
      fixtureActions: report.fixtureActions,
      samples: report.samples,
      results: report.results,
    });

    expect(report.proxy).toBe("http://127.0.0.1:8787");
    expect(json).not.toContain("private-token");
    expect(markdown).not.toContain("private-token");
  });

  it("rejects credential-bearing or non-origin values before persisting a report", () => {
    for (const origin of [
      "https://user:private-value@example.com",
      "https://example.com/path?token=private-value",
    ]) {
      let error = "";
      try {
        execFileSync("bun", [scriptPath, "--origin", origin], {
          cwd: repoRoot,
          encoding: "utf8",
          timeout: 10_000,
        });
      } catch (caught) {
        error = String((caught as { stderr?: Buffer }).stderr ?? caught);
      }
      expect(error).toContain("Origin must not contain credentials");
      expect(error).not.toContain("private-value");
    }
  });

  it("captures stateless response usage while leaving the response readable", async () => {
    const calls: ProxyCallRecord[] = [];
    const responseBody = {
      modelKey: "luna-fast",
      usage: {
        promptTokens: 18,
        completionTokens: 7,
      },
      content: "synthetic response",
    };
    const fetcher = instrumentStatelessProxyFetch(
      async () =>
        new Response(JSON.stringify(responseBody), {
          headers: { "content-type": "application/json" },
        }),
      (call) => calls.push(call),
    );

    const response = await fetcher("http://127.0.0.1:8787", {
      method: "POST",
    });

    expect(await response.json()).toEqual(responseBody);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      actualModelKey: "luna-fast",
      usage: { inputTokens: 18, outputTokens: 7 },
      completed: true,
    });
    expect(calls[0]?.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(calls[0]).not.toHaveProperty("content");
  });

  it("records bounded stateless failures without retaining response bodies", async () => {
    const calls: ProxyCallRecord[] = [];
    const fetcher = instrumentStatelessProxyFetch(
      async () =>
        new Response(JSON.stringify({ error: { message: "private-value" } }), {
          status: 502,
          headers: { "content-type": "application/json" },
        }),
      (call) => calls.push(call),
    );

    const response = await fetcher("http://127.0.0.1:8787", {
      method: "POST",
    });

    expect(calls[0]).toMatchObject({
      completed: false,
      failureClass: "provider-unavailable",
    });
    expect(calls[0]).not.toHaveProperty("usage");
    expect(calls[0]).not.toHaveProperty("private-value");
    expect(await response.json()).toEqual({
      error: { message: "private-value" },
    });
  });

  it("records network failures before rethrowing them", async () => {
    const calls: ProxyCallRecord[] = [];
    const fetcher = instrumentStatelessProxyFetch(
      async () => {
        throw new Error("failed to reach proxy");
      },
      (call) => calls.push(call),
    );

    await expect(fetcher("http://127.0.0.1:8787")).rejects.toThrow(
      "failed to reach proxy",
    );
    expect(calls).toEqual([
      {
        elapsedMs: expect.any(Number),
        completed: false,
        failureClass: "provider-unavailable",
      },
    ]);
  });
});

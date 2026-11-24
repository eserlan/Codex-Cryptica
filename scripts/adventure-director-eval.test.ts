import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "bun:test";

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
});

import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { conditionsForCorpus, parseCorpusArgs } from "./adventure-corpus-eval";

const repoRoot = resolve(import.meta.dir, "..");
const scriptPath = resolve(import.meta.dir, "adventure-corpus-eval.ts");

describe("synthetic adventure corpus CLI", () => {
  it("prints the default plan without contacting the configured proxy", () => {
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
    expect(output).toContain("Selected 8 fixture-path/condition run(s).");
  });

  it("defaults to a no-network plan with paired Director treatments", () => {
    const options = parseCorpusArgs([]);
    expect(options.live).toBe(false);
    expect(options.samples).toBe(1);
    expect(conditionsForCorpus(options)).toHaveLength(2);
  });

  it("rejects excessive sample counts before any provider run", () => {
    expect(() => parseCorpusArgs(["--samples", "4"])).toThrow(
      "Samples must be an integer from 1 to 3.",
    );
  });

  it("rejects empty or unknown selections and deduplicates repeats", () => {
    expect(() => parseCorpusArgs(["--efforts", ""])).toThrow(
      "Efforts must be one or more of: low, medium.",
    );
    expect(() => parseCorpusArgs(["--directors", "sideways"])).toThrow(
      "Directors must be one or more of: on, off.",
    );
    expect(() => parseCorpusArgs(["--contexts", "snapshot"])).toThrow(
      "Contexts must be one or more of: retained, reconstructed.",
    );
    const repeated = parseCorpusArgs([
      "--efforts",
      "low,low",
      "--directors",
      "on,on",
      "--contexts",
      "retained,retained",
    ]);
    expect(conditionsForCorpus(repeated)).toHaveLength(1);
  });

  it("rejects non-loopback proxy URLs and credential-bearing origins", () => {
    expect(() =>
      parseCorpusArgs(["--proxy", "https://proxy.example.test"]),
    ).toThrow("Proxy URL must target a local loopback host.");
    expect(() =>
      parseCorpusArgs(["--origin", "https://user:pass@example.test"]),
    ).toThrow("Origin must not contain credentials");
  });

  it("allows an explicit three-sample paired run across both context modes", () => {
    const options = parseCorpusArgs([
      "--live",
      "--samples",
      "3",
      "--efforts",
      "low,medium",
      "--contexts",
      "retained,reconstructed",
    ]);
    expect(options.live).toBe(true);
    expect(conditionsForCorpus(options)).toHaveLength(8);
  });
});

import { describe, expect, it } from "vitest";
import {
  AB_CASES,
  grounding,
  keepsSeedNames,
  namesUnder,
  mintAutomationToken,
  proxyComplete,
  runCase,
  runOnePass,
  runStaged,
  summarise,
  type RouteResult,
} from "./adventure-ab";
import { buildAdventurePrompt } from "../packages/generator-engine/src/public-adventure";

const doc = (outcome: string) => ({
  content: [
    "## Key Locations",
    "- **Weir Mill**: Wet stone.",
    "## Important NPCs & Factions",
    "- **Oren Pell**: Guildmaster",
    "## Threats & Antagonists",
    "- **Bravos**: Oren Pell's thugs.",
  ].join("\n"),
  lore: ["### Possible Outcomes", `- **End**: ${outcome}`].join("\n"),
});

const result = (overrides: Partial<RouteResult> = {}): RouteResult => ({
  route: "staged",
  title: "T",
  ...doc("The Weir Mill burns."),
  calls: 3,
  elapsedMs: 100,
  fellBack: false,
  remainingIssues: [],
  ...overrides,
});

describe("adventure A/B metrics", () => {
  it("covers ten distinct cases", () => {
    expect(AB_CASES).toHaveLength(10);
    expect(new Set(AB_CASES.map((c) => c.id)).size).toBe(10);
    expect(new Set(AB_CASES.map((c) => c.pressure)).size).toBe(10);
  });

  it("reads the bullet names under a heading only", () => {
    const { content } = doc("x");
    expect(namesUnder(content, "## Key Locations")).toEqual(["Weir Mill"]);
    expect(namesUnder(content, "## Missing")).toEqual([]);
  });

  it("scores grounded and ungrounded threats and outcomes", () => {
    expect(grounding(doc("The Weir Mill burns."))).toBe(1);
    expect(grounding(doc("A dragon from nowhere wins."))).toBe(0.5);
    expect(grounding({ content: "", lore: "" })).toBe(0);
  });

  it("checks a given situation's names, and skips cases without one", () => {
    const seeded = { seed: "Oren Pell holds the Weir Mill." };
    expect(keepsSeedNames(seeded, result())).toBe(true);
    expect(keepsSeedNames(seeded, result({ content: "", lore: "" }))).toBe(
      false,
    );
    expect(keepsSeedNames({}, result())).toBeNull();
  });

  it("summarises a route", () => {
    const abCase = { id: "a", pressure: "p", options: {} };
    const summary = summarise([
      { case: abCase, result: result({ calls: 3, elapsedMs: 100 }) },
      {
        case: abCase,
        result: result({
          calls: 5,
          elapsedMs: 300,
          fellBack: true,
          remainingIssues: ["x"],
          title: "U",
        }),
      },
    ]);
    expect(summary).toMatchObject({
      runs: 2,
      medianCalls: 5,
      fellBack: 1,
      withRemainingIssues: 1,
      // The run that fell back produced nothing to measure.
      distinctTitles: 1,
      meanGrounding: 1,
      seedNamesKept: "0/0",
    });
  });
});

describe("adventure A/B routes", () => {
  const options = { themeId: "fantasy" };
  const fetcherFor = (reply: (body: string) => string, status = 200) =>
    (async (_url: string, init?: RequestInit) =>
      new Response(JSON.stringify({ content: reply(String(init?.body)) }), {
        status,
      })) as unknown as typeof fetch;

  it("counts proxy calls and surfaces proxy errors", async () => {
    const ok = proxyComplete(
      "http://proxy",
      fetcherFor(() => "{}"),
    );
    await ok("s", "m");
    expect(ok.calls).toBe(1);
    const failing = proxyComplete(
      "http://proxy",
      fetcherFor(() => "", 500),
    );
    await expect(failing("s", "m")).rejects.toThrow();
    expect(failing.models).toEqual([]);
  });

  it("asks for a specific model only when one is given", async () => {
    const bodies: string[] = [];
    const fetcher = (async (_url: string, init?: RequestInit) => {
      bodies.push(String(init?.body));
      return new Response(JSON.stringify({ content: "x" }));
    }) as unknown as typeof fetch;
    await proxyComplete("http://proxy", fetcher, {
      modelKey: "gemini-flash-lite",
    })("s", "m");
    await proxyComplete("http://proxy", fetcher)("s", "m");
    expect(JSON.parse(bodies[0]).modelKeyOverride).toBe("gemini-flash-lite");
    expect(JSON.parse(bodies[1])).not.toHaveProperty("modelKeyOverride");
  });

  it("sends a session token as a bearer header only when given", async () => {
    const headers: Record<string, string>[] = [];
    const fetcher = (async (_url: string, init?: RequestInit) => {
      headers.push(init?.headers as Record<string, string>);
      return new Response(JSON.stringify({ content: "x" }));
    }) as unknown as typeof fetch;
    await proxyComplete("http://proxy", fetcher, { sessionToken: "tok" })(
      "s",
      "m",
    );
    await proxyComplete("http://proxy", fetcher)("s", "m");
    expect(headers[0].Authorization).toBe("Bearer tok");
    expect(headers[1]).not.toHaveProperty("Authorization");
  });

  it("mints an automation token from the proxy's session route", async () => {
    const seen: { url: string; key: string | null }[] = [];
    const fetcher = (async (url: URL, init?: RequestInit) => {
      const h = init?.headers as Record<string, string>;
      seen.push({ url: String(url), key: h["X-Codex-Automation-Key"] });
      return new Response(
        JSON.stringify({ token: "minted", scope: "automation" }),
      );
    }) as unknown as typeof fetch;
    await expect(
      mintAutomationToken("https://proxy.example/", "secret", fetcher),
    ).resolves.toBe("minted");
    expect(seen).toEqual([
      { url: "https://proxy.example/api/session", key: "secret" },
    ]);
  });

  it("reports a refused mint by its code, never echoing the key", async () => {
    const fetcher = (async () =>
      new Response(
        JSON.stringify({ error: { code: "AUTOMATION_KEY_INVALID" } }),
        { status: 401 },
      )) as unknown as typeof fetch;
    const failure = mintAutomationToken("https://p.example", "secret", fetcher);
    await expect(failure).rejects.toThrow("AUTOMATION_KEY_INVALID");
    await expect(failure).rejects.not.toThrow("secret");
  });

  it("records the model that answered each successful call", async () => {
    const replies = [{ content: "a", modelKey: "luna-fast" }, { content: "b" }];
    const fetcher = (async () =>
      new Response(JSON.stringify(replies.shift()))) as unknown as typeof fetch;
    const complete = proxyComplete("http://proxy", fetcher);
    await complete("s", "m");
    await complete("s", "m");
    expect(complete.models).toEqual(["luna-fast", "unknown"]);
  });

  it("runs the one-pass route with one repair when the first reply is unusable", async () => {
    const prompt = buildAdventurePrompt(options);
    const complete = proxyComplete(
      "http://proxy",
      fetcherFor(() => "nope"),
    );
    let t = 0;
    const out = await runOnePass(prompt, options, complete, () => (t += 40));
    expect(out).toMatchObject({ route: "one-pass", calls: 2, elapsedMs: 40 });
    expect(out.remainingIssues.length).toBeGreaterThan(0);
  });

  it("reports proxy failures as errors, not as a staged fallback", async () => {
    const dead = (async () => {
      throw new TypeError("Unable to connect");
    }) as unknown as typeof fetch;
    const rows = { staged: [], onePass: [] };
    const errors: string[] = [];
    await runCase(
      AB_CASES[0],
      () => proxyComplete("http://proxy", dead),
      rows,
      errors,
    );
    expect(rows.staged).toEqual([]);
    expect(errors).toEqual([
      "fantasy-deadline-canon staged: Error: the proxy failed 2 time(s)",
      "fantasy-deadline-canon one-pass: TypeError: Unable to connect",
    ]);
  });

  it("keeps a genuine staged fallback as a result", async () => {
    const rows = { staged: [] as never[], onePass: [] as never[] };
    const errors: string[] = [];
    await runCase(
      AB_CASES[5],
      () =>
        proxyComplete(
          "http://proxy",
          fetcherFor(() => "nope"),
        ),
      rows,
      errors,
    );
    expect(errors).toEqual([]);
    expect(rows.staged).toHaveLength(1);
    expect(rows.onePass).toHaveLength(1);
  });

  it("reports a staged run that fell back", async () => {
    const prompt = buildAdventurePrompt(options);
    const complete = proxyComplete(
      "http://proxy",
      fetcherFor(() => "nope"),
    );
    const out = await runStaged(prompt, options, complete);
    expect(out).toMatchObject({ route: "staged", fellBack: true, calls: 2 });
    expect(out.content).toBe("");
  });
});

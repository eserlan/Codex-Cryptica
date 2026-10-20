import { describe, expect, test } from "bun:test";
import {
  findReportIssues,
  parseArgs,
  runDelete,
  type GhRunner,
} from "./feedback-delete";

const REPO = "eserlan/codex-cryptica-feedback";

function fakeGh(issues: Array<{ id: string; number: number; title: string }>) {
  const calls: string[][] = [];
  const runner: GhRunner = async (args) => {
    calls.push(args);
    if (args[0] === "issue") return JSON.stringify(issues);
    return JSON.stringify({
      data: { deleteIssue: { clientMutationId: null } },
    });
  };
  return { runner, calls };
}

describe("parseArgs", () => {
  test("accepts one valid reference", () => {
    expect(parseArgs(["CC-7F3K-9Q2M"])).toEqual({ reference: "CC-7F3K-9Q2M" });
  });

  test.each([
    [[]],
    [["cc-7f3k-9q2m"]],
    [["CC-7F3K-9Q2M", "CC-7F3K-9Q2M"]],
    [["--token", "x"]],
  ])("rejects %j", (argv) => {
    expect(() => parseArgs(argv)).toThrow();
  });
});

describe("findReportIssues", () => {
  test("searches the private repository by the reference in the title", async () => {
    const { runner, calls } = fakeGh([
      { id: "I_1", number: 4, title: "[Problem] CC-7F3K-9Q2M" },
    ]);
    const issues = await findReportIssues(REPO, "CC-7F3K-9Q2M", runner);
    expect(issues).toHaveLength(1);
    expect(calls[0]).toEqual(
      expect.arrayContaining([
        "issue",
        "list",
        "--repo",
        REPO,
        "--state",
        "all",
        "--search",
        "CC-7F3K-9Q2M in:title",
      ]),
    );
  });
});

describe("runDelete", () => {
  test("deletes the one matching issue, not just closes it", async () => {
    const { runner, calls } = fakeGh([
      { id: "I_1", number: 4, title: "[Problem] CC-7F3K-9Q2M" },
    ]);
    const result = await runDelete({
      reference: "CC-7F3K-9Q2M",
      repo: REPO,
      run: runner,
    });
    expect(result).toEqual({ status: "deleted", number: 4 });
    const mutation = calls.find((c) => c[0] === "api" && c.includes("graphql"));
    expect(mutation?.join(" ")).toContain("deleteIssue");
    expect(mutation?.join(" ")).not.toContain("closeIssue");
    expect(mutation?.join(" ")).toContain("I_1");
  });

  test("deletes nothing when no issue matches", async () => {
    const { runner, calls } = fakeGh([]);
    const result = await runDelete({
      reference: "CC-7F3K-9Q2M",
      repo: REPO,
      run: runner,
    });
    expect(result.status).toBe("not-found");
    expect(calls.some((c) => c.includes("graphql"))).toBe(false);
  });

  test("deletes nothing when more than one issue matches", async () => {
    const { runner, calls } = fakeGh([
      { id: "I_1", number: 4, title: "[Problem] CC-7F3K-9Q2M" },
      { id: "I_2", number: 9, title: "[Idea] CC-7F3K-9Q2M" },
    ]);
    const result = await runDelete({
      reference: "CC-7F3K-9Q2M",
      repo: REPO,
      run: runner,
    });
    expect(result.status).toBe("ambiguous");
    expect(calls.some((c) => c.includes("graphql"))).toBe(false);
  });

  test("refuses a missing repository", async () => {
    const { runner } = fakeGh([]);
    await expect(
      runDelete({ reference: "CC-7F3K-9Q2M", repo: "", run: runner }),
    ).rejects.toThrow();
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  buildCouncilVoteOutput,
  generateCouncilVoteWithAI,
} from "./campaign-council-vote-generation";
import { getGenerator } from "./campaign-generator-registry";
import type { GeneratorRunRequest } from "./campaign-generator-types";

const request: GeneratorRunRequest = {
  generatorId: "council-vote",
  options: { councilSize: "7" },
  themeId: "workspace",
  useAI: true,
};

describe("buildCouncilVoteOutput", () => {
  it("joins the foundation lore with both path sections in order", () => {
    const output = buildCouncilVoteOutput(
      {
        title: "The Salt Road Levy",
        summary: "A council must approve emergency funding.",
        lore: "## Voting Procedure\nSimple majority.",
        labels: ["council-vote"],
      },
      {
        possiblePaths: "## Possible Paths\nsmallest coalition first",
        followUpHooks: "## Follow-Up Hooks\nthey remember",
      },
    );

    expect(output.title).toBe("The Salt Road Levy");
    expect(output.lore).toBe(
      "## Voting Procedure\nSimple majority.\n\n## Possible Paths\nsmallest coalition first\n\n## Follow-Up Hooks\nthey remember",
    );
    expect(output.labels).toEqual(["council-vote"]);
  });

  it("omits missing path sections rather than inserting empty lines", () => {
    const output = buildCouncilVoteOutput(
      {
        title: "The Salt Road Levy",
        summary: "A council must approve emergency funding.",
        lore: "## Voting Procedure\nSimple majority.",
      },
      {},
    );

    expect(output.lore).toBe("## Voting Procedure\nSimple majority.");
    expect(output.labels).toEqual([]);
  });
});

describe("generateCouncilVoteWithAI", () => {
  const generator = getGenerator("council-vote");

  it("runs the four-pass chat session and merges the repaired foundation and paths", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce(
        JSON.stringify({
          title: "The Salt Road Levy",
          summary: "A council must approve emergency funding.",
          lore: "unrepaired",
          labels: ["council-vote"],
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          title: "The Salt Road Levy",
          summary: "A council must approve emergency funding.",
          lore: "repaired",
          labels: ["council-vote"],
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          possiblePaths: "paths-unrepaired",
          followUpHooks: "hooks-unrepaired",
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          possiblePaths: "paths-repaired",
          followUpHooks: "hooks-repaired",
        }),
      );
    const startChat = vi.fn(async () => ({ send }));
    const aiGateway = { complete: vi.fn(), startChat };

    const draft = await generateCouncilVoteWithAI(
      aiGateway,
      generator,
      request,
    );

    expect(send).toHaveBeenCalledTimes(4);
    expect(draft?.title).toBe("The Salt Road Levy");
    expect(draft?.lore).toBe("repaired\n\npaths-repaired\n\nhooks-repaired");
  });

  it("returns null when the gateway has no startChat", async () => {
    const aiGateway = { complete: vi.fn() };

    const draft = await generateCouncilVoteWithAI(
      aiGateway,
      generator,
      request,
    );

    expect(draft).toBeNull();
    expect(aiGateway.complete).not.toHaveBeenCalled();
  });

  it("returns null when the foundation pass returns an unusable shape", async () => {
    const send = vi.fn().mockResolvedValueOnce(JSON.stringify({ foo: "bar" }));
    const startChat = vi.fn(async () => ({ send }));
    const aiGateway = { complete: vi.fn(), startChat };

    const draft = await generateCouncilVoteWithAI(
      aiGateway,
      generator,
      request,
    );

    expect(send).toHaveBeenCalledTimes(1);
    expect(draft).toBeNull();
  });
});

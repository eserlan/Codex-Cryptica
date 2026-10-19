import { describe, expect, it, vi } from "vitest";
import {
  buildCouncilVoteOutput,
  generateCouncilVoteWithAI,
  generateCouncilVoteWithAIStream,
} from "./campaign-council-vote-generation";
import { getGenerator } from "./campaign-generator-registry";
import type {
  GeneratedDraft,
  GeneratorRunRequest,
} from "./campaign-generator-types";

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

  it("parses fenced JSON replies and returns null when the initial paths turn is unusable", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce(
        '```json\n{"title":"The Salt Road Levy","summary":"Emergency funding.","lore":"### Voting Procedure\\nSimple majority."}\n```',
      )
      .mockResolvedValueOnce("{}")
      .mockResolvedValueOnce("{}");
    const startChat = vi.fn(async () => ({ send }));
    const aiGateway = { complete: vi.fn(), startChat };

    const draft = await generateCouncilVoteWithAI(
      aiGateway,
      generator,
      request,
    );

    expect(send).toHaveBeenCalledTimes(3);
    expect(draft).toBeNull();
  });

  it("propagates cancellation when the signal is aborted mid-run", async () => {
    const controller = new AbortController();
    const send = vi.fn(async () => {
      controller.abort();
      return JSON.stringify({
        title: "The Salt Road Levy",
        summary: "Emergency funding.",
        lore: "### Voting Procedure\nSimple majority.",
      });
    });
    const startChat = vi.fn(async () => ({ send }));
    const aiGateway = { complete: vi.fn(), startChat };

    await expect(
      generateCouncilVoteWithAI(aiGateway, generator, request, {
        signal: controller.signal,
      }),
    ).rejects.toThrow();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(expect.any(String), controller.signal);
  });
});

describe("generateCouncilVoteWithAIStream", () => {
  const localDraft: GeneratedDraft = {
    title: "Local council",
    entityType: "event",
    summary: "A local draft.",
    lore: "Local lore.",
    labels: ["council-vote"],
    sourceGeneratorId: "council-vote",
    templateApplied: false,
  };
  const foundation = JSON.stringify({
    title: "The Salt Road Levy",
    summary: "Emergency funding.",
    content: "The council debates a levy.",
    lore: "### Voting Procedure\nSimple majority.",
    labels: ["council-vote"],
  });
  function streamReply(text: string) {
    return async function* () {
      yield { type: "complete" as const, text };
    };
  }

  it("does not emit a draft or start another turn after cancellation between turns", async () => {
    const controller = new AbortController();
    const cancellation = new Error("cancelled");
    const sendStream = vi.fn(async function* () {
      yield { type: "complete" as const, text: foundation };
      controller.abort(cancellation);
    });
    const generateDraft = vi.fn(async () => localDraft);
    const events = [];

    for await (const event of generateCouncilVoteWithAIStream(
      request,
      {
        aiPolicy: { isEnabled: true, isAvailable: true },
        aiGateway: {
          complete: vi.fn(),
          startChat: vi.fn(async () => ({ send: vi.fn(), sendStream })),
        },
        generateDraft,
      },
      controller.signal,
    )) {
      events.push(event);
    }

    expect(sendStream).toHaveBeenCalledTimes(1);
    expect(events.filter((event) => event.type === "draft")).toEqual([]);
    expect(events.filter((event) => event.type === "phase")).toHaveLength(1);
    expect(generateDraft).not.toHaveBeenCalled();
  });

  it("uses the local draft when the initial foundation reply is unusable", async () => {
    const sendStream = vi.fn(streamReply("{}"));
    const generateDraft = vi.fn(async () => localDraft);
    const events = [];

    for await (const event of generateCouncilVoteWithAIStream(request, {
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: {
        complete: vi.fn(),
        startChat: vi.fn(async () => ({ send: vi.fn(), sendStream })),
      },
      generateDraft,
    })) {
      events.push(event);
    }

    expect(sendStream).toHaveBeenCalledTimes(1);
    expect(generateDraft).toHaveBeenCalledOnce();
    expect(events.at(-1)).toEqual({ type: "draft", draft: localDraft });
  });

  it("uses the local draft when the initial paths reply is unusable", async () => {
    const sendStream = vi
      .fn()
      .mockImplementationOnce(streamReply(foundation))
      .mockImplementationOnce(streamReply(foundation))
      .mockImplementationOnce(streamReply("{}"));
    const generateDraft = vi.fn(async () => localDraft);
    const events = [];

    for await (const event of generateCouncilVoteWithAIStream(request, {
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: {
        complete: vi.fn(),
        startChat: vi.fn(async () => ({ send: vi.fn(), sendStream })),
      },
      generateDraft,
    })) {
      events.push(event);
    }

    expect(sendStream).toHaveBeenCalledTimes(3);
    expect(generateDraft).toHaveBeenCalledOnce();
    expect(events.at(-1)).toEqual({ type: "draft", draft: localDraft });
  });
});

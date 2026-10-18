import { describe, expect, it, vi } from "vitest";
import {
  CampaignGeneratorService,
  composeDraftVaultFields,
} from "./campaign-generator-service";
import { generateHeistLocal } from "./public-heist";
import type { GeneratorRunRequest } from "./campaign-generator-types";

const request: GeneratorRunRequest = {
  generatorId: "heist",
  options: { heistType: "Rescue" },
  themeId: "fantasy",
  useAI: true,
  instructions: "Rescue Nessa from the payroll office.",
};
function response(title = "Nessa's Rescue") {
  const output = generateHeistLocal(
    { heistType: "Rescue", prize: "Nessa" },
    () => 0.5,
  );
  return {
    title,
    content: output.content,
    lore: output.lore,
    labels: output.labels,
  };
}
function audit(verdict: "clean" | "repair" = "repair") {
  return {
    verdict,
    fullScore: "Escape from the payroll office with Nessa.",
    transitions: [
      {
        event: "Nessa leaves the cell",
        stateBefore: "Nessa is confined",
        stateAfter: "Nessa is with the crew",
        factsChanged: ["Nessa.location: cell -> with crew"],
      },
    ],
    issues:
      verdict === "repair"
        ? [
            {
              id: "state-1",
              sections: ["The Getaway"],
              problem: "Nessa is still described in the cell.",
              requiredFact: "Nessa is with the crew.",
            },
          ]
        : [],
  };
}

describe("campaign heist workflow", () => {
  it("accepts the legacy schema without summary and reviews with campaign context", async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify(response()))
      .mockResolvedValueOnce(JSON.stringify(audit()))
      .mockResolvedValueOnce(JSON.stringify(response("Nessa Comes Home")));
    const service = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: { complete },
    });
    const draft = await service.generateDraft(request);
    expect(complete).toHaveBeenCalledTimes(3);
    expect(complete.mock.calls[1][0]).toContain(
      "Rescue Nessa from the payroll office.",
    );
    expect(complete.mock.calls[1][0]).toContain(
      "At every transition, update the current facts",
    );
    expect(complete.mock.calls[2][0]).toContain("state-1");
    const reviewHistory = JSON.parse(
      complete.mock.calls[2][0].split("\n").slice(1).join("\n"),
    );
    expect(reviewHistory[1]).toEqual({
      role: "assistant",
      content: JSON.stringify(audit()),
    });
    expect(draft.title).toBe("Nessa Comes Home");
    expect(draft.summary).toContain("Nessa");
    const saved = composeDraftVaultFields(draft);
    expect(saved.lore).toContain("### The Score");
    expect(saved.lore).toContain("### Casing the Target");
    expect(saved.lore).toContain("### The Getaway");
  });

  it("separates generation from a reviewer chat that retains audit history", async () => {
    const generationSend = vi
      .fn()
      .mockResolvedValue(JSON.stringify(response()));
    const reviewSend = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify(audit()))
      .mockResolvedValueOnce(JSON.stringify(response()));
    const startChat = vi
      .fn()
      .mockResolvedValueOnce({ send: generationSend })
      .mockResolvedValueOnce({ send: reviewSend });
    const complete = vi.fn();
    const service = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: { complete, startChat },
    });
    expect((await service.generateDraft(request)).title).toBe("Nessa's Rescue");
    expect(startChat).toHaveBeenCalledTimes(2);
    expect(generationSend).toHaveBeenCalledTimes(1);
    expect(reviewSend).toHaveBeenCalledTimes(2);
    expect(complete).not.toHaveBeenCalled();
  });

  it("retains the usable AI draft if review fails", async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify(response()))
      .mockRejectedValueOnce(new Error("offline"));
    const service = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: { complete },
    });
    expect((await service.generateDraft(request)).title).toBe("Nessa's Rescue");
  });

  it("uses local output without an AI call when disabled", async () => {
    const complete = vi.fn();
    const service = new CampaignGeneratorService({
      aiPolicy: { isEnabled: false, isAvailable: true },
      aiGateway: { complete },
    });
    expect((await service.generateDraft(request)).lore).toContain(
      "### Alarm Track",
    );
    expect(complete).not.toHaveBeenCalled();
  });

  it("falls back locally when the first AI response is malformed", async () => {
    const complete = vi.fn(async () => "not JSON");
    const service = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: { complete },
    });
    const draft = await service.generateDraft(request);
    expect(draft.content).toContain("### The Score");
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("cancels during review without returning the original or a local draft", async () => {
    const controller = new AbortController();
    let calls = 0;
    const completeStream = vi.fn(async function* () {
      calls++;
      if (calls === 2) controller.abort();
      yield {
        type: "complete" as const,
        text: JSON.stringify(calls === 1 ? response() : audit("clean")),
      };
    });
    const service = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: { complete: vi.fn(), completeStream },
    });
    const events = [];
    for await (const event of service.generateDraftStream(
      request,
      controller.signal,
    ))
      events.push(event);
    expect(calls).toBe(2);
    expect(events.some((e) => e.type === "draft")).toBe(false);
  });

  it("streams all three phases but publishes only the repaired draft", async () => {
    let calls = 0;
    const completeStream = vi.fn(async function* () {
      calls++;
      yield { type: "delta" as const, text: "progress" };
      yield {
        type: "complete" as const,
        text: JSON.stringify(
          calls === 1
            ? response("First Rescue")
            : calls === 2
              ? audit()
              : response("Reviewed Rescue"),
        ),
      };
    });
    const service = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: { complete: vi.fn(), completeStream },
    });
    const events = [];
    for await (const event of service.generateDraftStream(request))
      events.push(event);
    expect(events.filter((e) => e.type === "phase")).toHaveLength(3);
    expect(events.filter((e) => e.type === "draft")).toHaveLength(1);
    expect(events.at(-1)).toMatchObject({
      type: "draft",
      draft: { title: "Reviewed Rescue" },
    });
  });
});

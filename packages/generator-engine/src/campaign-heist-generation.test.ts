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

describe("campaign heist workflow", () => {
  it("accepts the legacy schema without summary and reviews with campaign context", async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify(response()))
      .mockResolvedValueOnce(JSON.stringify(response("Nessa Comes Home")));
    const service = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: { complete },
    });
    const draft = await service.generateDraft(request);
    expect(complete).toHaveBeenCalledTimes(2);
    expect(complete.mock.calls[1][0]).toContain(
      "Rescue Nessa from the payroll office.",
    );
    expect(complete.mock.calls[1][0]).toContain(
      "silently reconstruct its sequence of states",
    );
    expect(draft.title).toBe("Nessa Comes Home");
    expect(draft.summary).toContain("Nessa");
    const saved = composeDraftVaultFields(draft);
    expect(saved.lore).toContain("### The Score");
    expect(saved.lore).toContain("### Casing the Target");
    expect(saved.lore).toContain("### The Getaway");
  });

  it("uses one chat session for both passes", async () => {
    const send = vi.fn().mockResolvedValue(JSON.stringify(response()));
    const startChat = vi.fn(async () => ({ send }));
    const complete = vi.fn();
    const service = new CampaignGeneratorService({
      aiPolicy: { isEnabled: true, isAvailable: true },
      aiGateway: { complete, startChat },
    });
    expect((await service.generateDraft(request)).title).toBe("Nessa's Rescue");
    expect(startChat).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(2);
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
      yield { type: "complete" as const, text: JSON.stringify(response()) };
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

  it("streams both phases but publishes only the reviewed draft", async () => {
    let calls = 0;
    const completeStream = vi.fn(async function* () {
      calls++;
      yield { type: "delta" as const, text: "progress" };
      yield {
        type: "complete" as const,
        text: JSON.stringify(
          response(calls === 2 ? "Reviewed Rescue" : "First Rescue"),
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
    expect(events.filter((e) => e.type === "phase")).toHaveLength(2);
    expect(events.filter((e) => e.type === "draft")).toHaveLength(1);
    expect(events.at(-1)).toMatchObject({
      type: "draft",
      draft: { title: "Reviewed Rescue" },
    });
  });
});

import { describe, expect, it, vi } from "vitest";
import { createEmptySessionPrep, type SessionPrep } from "generator-engine";
import {
  SESSION_PREP_SEED_MAX_LENGTH,
  SessionPrepService,
} from "./session-prep-service";

function sequentialIds() {
  let n = 0;
  return () => `id-${++n}`;
}

function makeService(response: unknown) {
  const transport = {
    runModel: vi
      .fn()
      .mockResolvedValue(
        typeof response === "string" ? response : JSON.stringify(response),
      ),
  };
  return {
    service: new SessionPrepService(transport, sequentialIds()),
    transport,
  };
}

function partialPrep(): SessionPrep {
  const prep = createEmptySessionPrep("A courier vanished on the road.");
  prep.start = "A riderless horse walks through the gate.";
  return prep;
}

describe("SessionPrepService.draft", () => {
  it("asks the AI only for empty steps and keeps the GM's opening", async () => {
    const { service, transport } = makeService({
      start: "An AI opening",
      pressure: "The judge arrives in two days.",
    });
    const result = await service.draft(partialPrep());

    const [, prompt, config] = transport.runModel.mock.calls[0];
    expect(prompt).toContain("Fill only these steps: pressure,");
    expect(prompt).not.toContain("Fill only these steps: start");
    expect(config.responseMimeType).toBe("application/json");
    expect(result.start).toBe("A riderless horse walks through the gate.");
    expect(result.pressure).toBe("The judge arrives in two days.");
  });

  it("does not call the AI when every step is already filled", async () => {
    const { service, transport } = makeService({});
    const prep = partialPrep();
    prep.pressure = "p";
    prep.people = [
      { id: "a", name: "n", wants: "", doesNext: "", source: "gm" },
    ];
    prep.places = [{ id: "b", name: "n", detail: "", source: "gm" }];
    prep.information = [
      { id: "c", fact: "f", routes: [], critical: false, source: "gm" },
    ];
    prep.complications = [{ id: "d", text: "t", source: "gm" }];
    prep.consequences.success = "s";
    prep.reserve = [{ id: "e", text: "r", source: "gm" }];

    await expect(service.draft(prep)).resolves.toEqual(prep);
    expect(transport.runModel).not.toHaveBeenCalled();
  });

  it("rejects an empty or overlong hook before calling the AI", async () => {
    const { service, transport } = makeService({});
    await expect(service.draft(createEmptySessionPrep())).rejects.toThrow(
      "Add a hook",
    );
    await expect(
      service.draft(
        createEmptySessionPrep("x".repeat(SESSION_PREP_SEED_MAX_LENGTH + 1)),
      ),
    ).rejects.toThrow(`under ${SESSION_PREP_SEED_MAX_LENGTH} characters`);
    expect(transport.runModel).not.toHaveBeenCalled();
  });

  it("surfaces malformed responses and transport failures", async () => {
    const malformed = makeService("not json");
    await expect(malformed.service.draft(partialPrep())).rejects.toThrow(
      "unreadable response",
    );

    const failing = makeService({});
    failing.transport.runModel.mockRejectedValue(new Error("AI unavailable"));
    await expect(failing.service.draft(partialPrep())).rejects.toThrow(
      "AI unavailable",
    );
  });
});

describe("SessionPrepService.draftStep", () => {
  it("drafts only the one question asked", async () => {
    const { service, transport } = makeService({
      pressure: "The judge arrives in two days.",
      people: [{ name: "Callan", wants: "", doesNext: "" }],
    });
    const result = await service.draftStep(partialPrep(), "pressure");

    expect(transport.runModel.mock.calls[0][1]).toContain(
      "Fill only these steps: pressure.",
    );
    expect(result.pressure).toBe("The judge arrives in two days.");
    expect(result.people).toEqual([]);
  });

  it("sends the GM's note and guidance with the request without storing them", async () => {
    const { service, transport } = makeService({
      people: [{ name: "Vessa", wants: "the reward", doesNext: "races them" }],
    });
    const result = await service.draftStep(partialPrep(), "people", {
      direction: "a rival adventurer",
      guidance: { turnedDown: [{ step: "people", text: "Old Tebb" }] },
    });

    expect(transport.runModel.mock.calls[0][1]).toContain(
      JSON.stringify("a rival adventurer"),
    );
    expect(transport.runModel.mock.calls[0][1]).toContain("Old Tebb");
    expect(JSON.stringify(result)).not.toContain("a rival adventurer");
    expect(JSON.stringify(result)).not.toContain("Old Tebb");
  });

  it("leaves a filled step alone without calling the AI", async () => {
    const { service, transport } = makeService({ start: "AI opening" });
    const prep = partialPrep();
    expect(await service.draftStep(prep, "start")).toBe(prep);
    expect(transport.runModel).not.toHaveBeenCalled();
  });
});

describe("SessionPrepService.redraftStep", () => {
  it("redrafts the only populated step without a hook", async () => {
    const { service, transport } = makeService({ pressure: "A new threat" });
    const prep = createEmptySessionPrep();
    prep.pressure = "A threat arrives at dawn.";

    const result = await service.redraftStep(prep, "pressure");

    expect(transport.runModel).toHaveBeenCalledOnce();
    expect(result.pressure).toBe("A new threat");
    expect(result.seed).toBe("");
    expect(prep.pressure).toBe("A threat arrives at dawn.");
  });

  it("still rejects a redraft when the original prep has no content", async () => {
    const { service, transport } = makeService({ start: "An opening" });

    await expect(
      service.redraftStep(createEmptySessionPrep(), "start"),
    ).rejects.toThrow("Add a hook");
    expect(transport.runModel).not.toHaveBeenCalled();
  });

  it("replaces the chosen step and keeps the others", async () => {
    const { service, transport } = makeService({ start: "A new opening" });
    const prep = partialPrep();
    prep.pressure = "The GM's pressure";
    const result = await service.redraftStep(prep, "start");

    const prompt = transport.runModel.mock.calls[0][1] as string;
    expect(prompt).toContain("Fill only these steps: start.");
    expect(prompt).not.toContain("A riderless horse");
    expect(result.start).toBe("A new opening");
    expect(result.pressure).toBe("The GM's pressure");
    expect(prep.start).toBe("A riderless horse walks through the gate.");
  });

  it("keeps the old step when the AI fails", async () => {
    const transport = {
      runModel: vi.fn().mockRejectedValue(new Error("Network down")),
    };
    const service = new SessionPrepService(transport, sequentialIds());
    const prep = partialPrep();
    await expect(service.redraftStep(prep, "start")).rejects.toThrow(
      "Network down",
    );
    expect(prep.start).toBe("A riderless horse walks through the gate.");
  });
});

describe("SessionPrepService.suggest", () => {
  it("returns options for one step without changing the prep", async () => {
    const { service, transport } = makeService({
      options: [
        { name: "Maren", wants: "her brother", doesNext: "goes alone" },
      ],
    });
    const prep = partialPrep();
    await expect(service.suggest(prep, "people")).resolves.toEqual({
      step: "people",
      options: [
        { name: "Maren", wants: "her brother", doesNext: "goes alone" },
      ],
    });
    expect(transport.runModel.mock.calls[0][1]).toContain(
      "options for the people step",
    );
    expect(prep.people).toEqual([]);
  });
});

describe("SessionPrepService.suggestRoutes", () => {
  it("adds AI routes to the chosen fact", async () => {
    const { service } = makeService({ routes: ["Dosh admits it"] });
    const prep = partialPrep();
    prep.information = [
      {
        id: "c1",
        fact: "Callan ordered it",
        routes: ["The signet"],
        critical: true,
        source: "gm",
      },
    ];
    const result = await service.suggestRoutes(prep, "c1");
    expect(result.information[0].routes).toEqual([
      "The signet",
      "Dosh admits it",
    ]);
  });

  it("rejects an unknown fact before calling the AI", async () => {
    const { service, transport } = makeService({ routes: ["x"] });
    await expect(service.suggestRoutes(partialPrep(), "nope")).rejects.toThrow(
      "could not find that fact",
    );
    expect(transport.runModel).not.toHaveBeenCalled();
  });
});

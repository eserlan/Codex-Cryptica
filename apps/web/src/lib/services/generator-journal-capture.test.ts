import { describe, it, expect, vi } from "vitest";
import {
  publishGeneratedCapture,
  publishGeneratedSaved,
} from "./generator-journal-capture";

const makeBus = () => ({ emit: vi.fn() });
const clock = { now: () => 1000 };

describe("generator journal capture", () => {
  it("emits one JOURNAL:CAPTURE for a generated result, with no sync metadata", () => {
    const bus = makeBus();
    publishGeneratedCapture(
      {
        generatorId: "npc",
        title: "Mara One-Eye",
        summary: "a one-eyed smuggler",
      },
      { bus: bus as any, clock },
    );
    expect(bus.emit).toHaveBeenCalledTimes(1);
    const event = bus.emit.mock.calls[0][0];
    expect(event.type).toBe("JOURNAL:CAPTURE");
    expect(event.domain).toBe("journal");
    expect(event.payload.entryType).toBe("generated-result");
    expect(event.metadata.sync).toBeUndefined();
  });

  it("emits one JOURNAL:CAPTURE for a saved result", () => {
    const bus = makeBus();
    publishGeneratedSaved(
      { title: "Mara One-Eye", category: "character" },
      { bus: bus as any, clock },
    );
    expect(bus.emit).toHaveBeenCalledTimes(1);
    expect(bus.emit.mock.calls[0][0].payload.entryType).toBe("generated-saved");
  });

  it("swallows and logs a bus failure, so generation and saving never fail on the journal", () => {
    const bus = {
      emit: vi.fn(() => {
        throw new Error("bus down");
      }),
    };
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      publishGeneratedCapture(
        { generatorId: "npc", title: "X" },
        { bus: bus as any, clock },
      ),
    ).not.toThrow();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});

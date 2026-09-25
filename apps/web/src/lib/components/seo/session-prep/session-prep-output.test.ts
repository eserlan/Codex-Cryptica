/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import { createEmptySessionPrep, type SessionPrep } from "generator-engine";
import type { SessionPrepService } from "$lib/services/seo/session-prep-service";
import { renderGeneratorMarkdown } from "$lib/components/seo/markdown-renderers";
import { EXAMPLE_SESSION_PREP } from "./example-prep";
import {
  buildSessionPrep,
  SESSION_PREP_KIND,
  toSessionPrepOutput,
} from "./session-prep-output";

function serviceWith(draft: SessionPrepService["draft"]) {
  return { draft: vi.fn(draft) } as unknown as SessionPrepService & {
    draft: ReturnType<typeof vi.fn>;
  };
}

describe("toSessionPrepOutput", () => {
  it("saves as a session-prep note with the run sheet and the GM's hook", () => {
    const output = toSessionPrepOutput(EXAMPLE_SESSION_PREP);
    expect(output.type).toBe("note");
    expect(output.kind).toBe(SESSION_PREP_KIND);
    expect(output.status).toBe("draft");
    expect(output.title).toMatch(/^Session prep: A courier carrying/);
    expect(output.content).toContain("## Open");
    expect(output.content).toContain("## Reserve");
    expect(output.lore).toContain("### Your hook");
  });

  it("refuses to build an empty run sheet", () => {
    expect(() => toSessionPrepOutput(createEmptySessionPrep("hook"))).toThrow(
      "Fill in at least one step",
    );
  });
});

describe("run sheet rendering", () => {
  it("never produces generator label blocks that break its lists", () => {
    const prep = createEmptySessionPrep("hook");
    prep.information = [
      {
        id: "c1",
        fact: "The channel is not natural: a buoy was dragged",
        routes: ["the chart"],
        critical: false,
        source: "ai",
      },
    ];
    prep.complications = [
      { id: "n1", text: "Bell Yard: noisy machinery", source: "ai" },
    ];
    prep.reserve = [{ id: "r1", text: "Names: Wenna, Hob", source: "gm" }];

    const html = renderGeneratorMarkdown(toSessionPrepOutput(prep).content);
    expect(html).not.toContain("seo-label");
    expect(html.match(/<li>/g)).toHaveLength(3);
  });
});

describe("buildSessionPrep", () => {
  it("drafts empty steps with AI and returns the drafted prep", async () => {
    const prep = createEmptySessionPrep("A courier vanished.");
    const drafted: SessionPrep = { ...prep, pressure: "The judge arrives." };
    const service = serviceWith(async () => drafted);

    const result = await buildSessionPrep(prep, { useAI: true, service });
    expect(service.draft).toHaveBeenCalledOnce();
    expect(result.prep).toBe(drafted);
    expect(result.output.content).toContain("The judge arrives.");
    expect(result.output.aiFallback).toBeUndefined();
  });

  it("builds from the GM's steps without calling AI when AI is off", async () => {
    const service = serviceWith(async () => {
      throw new Error("should not be called");
    });
    const result = await buildSessionPrep(EXAMPLE_SESSION_PREP, {
      useAI: false,
      service,
    });
    expect(service.draft).not.toHaveBeenCalled();
    expect(result.output.content).toContain("## Pressure");
  });

  it("falls back to the GM's own steps when AI drafting fails", async () => {
    const prep = createEmptySessionPrep("hook");
    prep.pressure = "Something is moving.";
    const service = serviceWith(async () => {
      throw new Error("AI unavailable");
    });
    const result = await buildSessionPrep(prep, { useAI: true, service });
    expect(result.prep).toBe(prep);
    expect(result.output.aiFallback).toBe(true);
    expect(result.output.content).toBe("## Pressure\nSomething is moving.");
  });

  it("surfaces the AI error when there is nothing to fall back on", async () => {
    const service = serviceWith(async () => {
      throw new Error("AI unavailable");
    });
    await expect(
      buildSessionPrep(createEmptySessionPrep("hook"), {
        useAI: true,
        service,
      }),
    ).rejects.toThrow("AI unavailable");
  });
});

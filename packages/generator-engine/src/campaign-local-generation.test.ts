import { describe, expect, it, vi } from "vitest";
import { generateLocalDraft } from "./campaign-local-generation";

const draftOf = (output: any) => ({ title: output.title });

function makeGenerator(titles: string[]) {
  let i = 0;
  return {
    generate: vi.fn(() => ({
      title: titles[Math.min(i++, titles.length - 1)],
    })),
    mapOutputToDraft: vi.fn(draftOf),
  } as any;
}

const req = (generatorId = "npc") => ({ generatorId }) as any;

describe("generateLocalDraft", () => {
  it("returns the first title when it is free", () => {
    const generator = makeGenerator(["Mara"]);
    expect(generateLocalDraft(generator, req(), new Set())).toEqual({
      title: "Mara",
    });
    expect(generator.generate).toHaveBeenCalledTimes(1);
  });

  it("regenerates while the title is already taken", () => {
    const generator = makeGenerator(["Mara", "Mara", "Orin"]);
    const draft = generateLocalDraft(generator, req(), new Set(["mara"]));
    expect(draft.title).toBe("Orin");
  });

  it("gives up after five more tries and keeps the last title", () => {
    const generator = makeGenerator(["Mara"]);
    const draft = generateLocalDraft(generator, req(), new Set(["mara"]));
    expect(draft.title).toBe("Mara");
    expect(generator.generate).toHaveBeenCalledTimes(6);
  });

  it("explains a language generator failure in plain words", () => {
    const generator = {
      generate: () => {
        throw new Error("boom");
      },
    } as any;
    expect(() =>
      generateLocalDraft(generator, req("language"), new Set()),
    ).toThrow(/could not produce a valid profile/);
  });

  it("rethrows other generator failures unchanged", () => {
    const failure = new Error("boom");
    const generator = {
      generate: () => {
        throw failure;
      },
    } as any;
    expect(() => generateLocalDraft(generator, req(), new Set())).toThrow(
      failure,
    );
  });
});

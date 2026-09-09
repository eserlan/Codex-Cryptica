import { describe, it, expect, vi } from "vitest";

// Isolate these wiring tests from the real Oracle/AI client (network calls,
// API keys) — compression itself is fully covered by
// monsterlabs-description-compression.test.ts. Default behaviour here
// mirrors what a working compressor does: pass through under the limit,
// truncate over it, so tests that never exceed the limit are unaffected.
vi.mock("./monsterlabs-description-compression", () => ({
  MONSTERLABS_PROMPT_CHAR_LIMIT: 1000,
  compressMonsterLabsDescription: vi.fn((description: string, limit = 1000) =>
    Promise.resolve(
      description.length <= limit ? description : description.slice(0, limit),
    ),
  ),
}));

import {
  buildMonsterLabsPrompt,
  isMonsterLabsEligibleType,
  isMonsterLabsItemEligibleType,
  isMonsterLabsHandoffEligibleType,
  getMonsterLabsActionLabel,
  sendToMonsterLabsMonsterGenerator,
  sendToMonsterLabsMagicItemGenerator,
  sendEntityToMonsterLabs,
  MONSTERLABS_MONSTER_GENERATOR_URL,
  MONSTERLABS_MAGIC_ITEM_GENERATOR_URL,
} from "./monsterlabs-handoff";
import { compressMonsterLabsDescription } from "./monsterlabs-description-compression";
import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";

/**
 * A `window.open` stub. The handoff no longer pre-opens a blank tab (that
 * traded a guaranteed-open for a blank tab stealing focus for the whole
 * async compression gap) — it now opens fresh, once, with the final URL,
 * after the (possibly AI-compressed) prompt is ready. Pass `returns: null`
 * to simulate a browser blocking that deferred open.
 */
function stubWindow(options: { returns?: Window | null } = {}) {
  const open = vi
    .fn()
    .mockReturnValue(
      options.returns === undefined ? ({} as Window) : options.returns,
    );
  return { open };
}

function sentUrl(open: ReturnType<typeof vi.fn>) {
  const call = open.mock.calls[0];
  return call ? new URL(call[0] as string) : null;
}

describe("isMonsterLabsEligibleType", () => {
  it("accepts character and creature entity types", () => {
    expect(isMonsterLabsEligibleType("character")).toBe(true);
    expect(isMonsterLabsEligibleType("creature")).toBe(true);
  });

  it("rejects other entity types", () => {
    expect(isMonsterLabsEligibleType("location")).toBe(false);
    expect(isMonsterLabsEligibleType("faction")).toBe(false);
    expect(isMonsterLabsEligibleType("note")).toBe(false);
    expect(isMonsterLabsEligibleType("item")).toBe(false);
    expect(isMonsterLabsEligibleType(undefined)).toBe(false);
  });
});

describe("isMonsterLabsItemEligibleType", () => {
  it("accepts item entity type", () => {
    expect(isMonsterLabsItemEligibleType("item")).toBe(true);
  });

  it("rejects other entity types", () => {
    expect(isMonsterLabsItemEligibleType("character")).toBe(false);
    expect(isMonsterLabsItemEligibleType("creature")).toBe(false);
    expect(isMonsterLabsItemEligibleType("location")).toBe(false);
    expect(isMonsterLabsItemEligibleType(undefined)).toBe(false);
  });
});

describe("buildMonsterLabsPrompt", () => {
  it("puts name and title-cased type up front, then the description", () => {
    const prompt = buildMonsterLabsPrompt({
      name: "Ash-Eater Varkesh",
      type: "creature",
      description: "A soot-caked horror that hunts along collapsed mineshafts.",
    });

    expect(prompt).toBe(
      [
        "Name: Ash-Eater Varkesh",
        "Type: Creature",
        "",
        "A soot-caked horror that hunts along collapsed mineshafts.",
      ].join("\n"),
    );
  });

  it("title-cases character the same way", () => {
    const prompt = buildMonsterLabsPrompt({
      name: "Lord Varkesh",
      type: "character",
      description: "A disgraced noble scheming to reclaim his estate.",
    });

    expect(prompt.startsWith("Name: Lord Varkesh\nType: Character\n")).toBe(
      true,
    );
  });

  it("trims a padded description", () => {
    const prompt = buildMonsterLabsPrompt({
      name: "Grand Vizier",
      type: "character",
      description: "  cunning and ruthless  ",
    });

    expect(prompt.endsWith("cunning and ruthless")).toBe(true);
  });
});

describe("sendToMonsterLabsMonsterGenerator", () => {
  it("opens the monster generator with the prompt and attribution params", async () => {
    const { open } = stubWindow();

    const result = await sendToMonsterLabsMonsterGenerator(
      {
        name: "Ash-Eater Varkesh",
        type: "creature",
        description: "A soot-caked horror.",
      },
      { open },
    );

    expect(result.ok).toBe(true);
    expect(open).toHaveBeenCalledTimes(1);
    const url = sentUrl(open);
    expect(url).not.toBeNull();
    expect(url!.origin + url!.pathname).toBe(MONSTERLABS_MONSTER_GENERATOR_URL);
    expect(url!.searchParams.get("prompt")).toBe(
      "Name: Ash-Eater Varkesh\nType: Creature\n\nA soot-caked horror.",
    );
    expect(url!.searchParams.get("utm_source")).toBe("codexcryptica");
  });

  it("survives markdown, unicode, and special characters in the description", async () => {
    const description =
      "# Notes\n\n*Cunning & ruthless* — wields a +2 blade\nHP: 120 | 世界";
    const { open } = stubWindow();
    const result = await sendToMonsterLabsMonsterGenerator(
      {
        name: "Grand Vizier",
        type: "character",
        description,
      },
      { open },
    );

    expect(result.ok).toBe(true);
    const url = sentUrl(open);
    expect(url!.searchParams.get("prompt")).toBe(
      `Name: Grand Vizier\nType: Character\n\n${description}`,
    );
  });

  it("reports an explicit failure instead of opening a tab for a blank description", async () => {
    const { open } = stubWindow();
    const result = await sendToMonsterLabsMonsterGenerator(
      {
        name: "Empty Shell",
        type: "creature",
        description: "   ",
      },
      { open },
    );

    expect(result.ok).toBe(false);
    expect(open).not.toHaveBeenCalled();
    if (!result.ok) {
      expect(result.reason).toBe("empty-content");
    }
  });

  it("compresses a description over MonsterLabs' own ~1000-char budget before sending it", async () => {
    const { open } = stubWindow();
    const longDescription = "a".repeat(1500);
    const compressMock = vi.mocked(compressMonsterLabsDescription);
    compressMock.mockClear();
    compressMock.mockResolvedValueOnce("A much shorter horror description.");

    const result = await sendToMonsterLabsMonsterGenerator(
      {
        name: "Wall of Text",
        type: "creature",
        description: longDescription,
      },
      { open },
    );

    expect(result.ok).toBe(true);
    expect(compressMock).toHaveBeenCalledTimes(1);
    expect(compressMock.mock.calls[0][0]).toBe(longDescription);
    const url = sentUrl(open);
    expect(url!.searchParams.get("prompt")).toBe(
      "Name: Wall of Text\nType: Creature\n\nA much shorter horror description.",
    );
  });

  it("tells the compressor not to call the Oracle when the user has disabled AI", async () => {
    const { open } = stubWindow();
    const longDescription = "a".repeat(1500);
    const compressMock = vi.mocked(compressMonsterLabsDescription);
    compressMock.mockClear();
    compressMock.mockResolvedValueOnce("Hard-truncated fallback description.");
    discoveryPolicyStore.aiDisabled = true;

    try {
      const result = await sendToMonsterLabsMonsterGenerator(
        {
          name: "Wall of Text",
          type: "creature",
          description: longDescription,
        },
        { open },
      );

      expect(result.ok).toBe(true);
      expect(compressMock).toHaveBeenCalledTimes(1);
      expect(compressMock.mock.calls[0][3]).toBe(false);
      const url = sentUrl(open);
      expect(url!.searchParams.get("prompt")).toBe(
        "Name: Wall of Text\nType: Creature\n\nHard-truncated fallback description.",
      );
    } finally {
      discoveryPolicyStore.aiDisabled = false;
    }
  });

  it("does not compress a description already within the limit", async () => {
    const { open } = stubWindow();
    const compressMock = vi.mocked(compressMonsterLabsDescription);
    compressMock.mockClear();

    await sendToMonsterLabsMonsterGenerator(
      { name: "Short One", type: "creature", description: "Brief." },
      { open },
    );

    expect(compressMock).not.toHaveBeenCalled();
  });

  it("still reports url-too-long as a defence-in-depth guard even if compression somehow returns an oversized result", async () => {
    const { open } = stubWindow();
    const compressMock = vi.mocked(compressMonsterLabsDescription);
    compressMock.mockClear();
    compressMock.mockResolvedValueOnce("b".repeat(9000));

    const result = await sendToMonsterLabsMonsterGenerator(
      {
        name: "Wall of Text",
        type: "creature",
        description: "a".repeat(1500),
      },
      { open },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("url-too-long");
    }
    expect(open).not.toHaveBeenCalled();
  });

  it("reports popupBlocked instead of silently losing the tab when window.open is blocked", async () => {
    const { open } = stubWindow({ returns: null });

    const result = await sendToMonsterLabsMonsterGenerator(
      {
        name: "Ash-Eater Varkesh",
        type: "creature",
        description: "A soot-caked horror.",
      },
      { open },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.popupBlocked).toBe(true);
      expect(result.url).toContain(MONSTERLABS_MONSTER_GENERATOR_URL);
    }
  });
});

describe("sendToMonsterLabsMagicItemGenerator", () => {
  it("opens the magic item generator with the prompt and attribution params", async () => {
    const { open } = stubWindow();

    const result = await sendToMonsterLabsMagicItemGenerator(
      {
        name: "Crown of the Last Ember",
        type: "item",
        description: "A tarnished circlet that hums when a fire is near.",
      },
      { open },
    );

    expect(result.ok).toBe(true);
    expect(open).toHaveBeenCalledTimes(1);
    const url = sentUrl(open);
    expect(url!.origin + url!.pathname).toBe(
      MONSTERLABS_MAGIC_ITEM_GENERATOR_URL,
    );
    expect(url!.searchParams.get("prompt")).toBe(
      "Name: Crown of the Last Ember\nType: Item\n\nA tarnished circlet that hums when a fire is near.",
    );
    expect(url!.searchParams.get("utm_source")).toBe("codexcryptica");
  });

  it("survives markdown, unicode, and special characters in the description", async () => {
    const description =
      "# Notes\n\n*Cursed & coveted* — grants +2 to fire saves\nWeight: 1 lb | 世界";
    const { open } = stubWindow();
    const result = await sendToMonsterLabsMagicItemGenerator(
      {
        name: "Crown of the Last Ember",
        type: "item",
        description,
      },
      { open },
    );

    expect(result.ok).toBe(true);
    const url = sentUrl(open);
    expect(url!.searchParams.get("prompt")).toBe(
      `Name: Crown of the Last Ember\nType: Item\n\n${description}`,
    );
  });

  it("reports an explicit failure instead of opening a tab for a blank description", async () => {
    const { open } = stubWindow();
    const result = await sendToMonsterLabsMagicItemGenerator(
      {
        name: "Empty Shell",
        type: "item",
        description: "   ",
      },
      { open },
    );

    expect(result.ok).toBe(false);
    expect(open).not.toHaveBeenCalled();
    if (!result.ok) {
      expect(result.reason).toBe("empty-content");
    }
  });
});

describe("isMonsterLabsHandoffEligibleType", () => {
  it("accepts character, creature, and item", () => {
    expect(isMonsterLabsHandoffEligibleType("character")).toBe(true);
    expect(isMonsterLabsHandoffEligibleType("creature")).toBe(true);
    expect(isMonsterLabsHandoffEligibleType("item")).toBe(true);
  });

  it("rejects other entity types", () => {
    expect(isMonsterLabsHandoffEligibleType("location")).toBe(false);
    expect(isMonsterLabsHandoffEligibleType("faction")).toBe(false);
    expect(isMonsterLabsHandoffEligibleType(undefined)).toBe(false);
  });
});

describe("getMonsterLabsActionLabel", () => {
  it("labels items as a magic item action", () => {
    expect(getMonsterLabsActionLabel("item")).toBe(
      "Create D&D magic item in MonsterLabs",
    );
  });

  it("labels characters and creatures as a monster action", () => {
    expect(getMonsterLabsActionLabel("character")).toBe(
      "Create D&D monster in MonsterLabs",
    );
    expect(getMonsterLabsActionLabel("creature")).toBe(
      "Create D&D monster in MonsterLabs",
    );
  });
});

describe("sendEntityToMonsterLabs", () => {
  it("routes an item to the magic item generator", async () => {
    const { open } = stubWindow();
    const result = await sendEntityToMonsterLabs(
      {
        name: "Crown of the Last Ember",
        type: "item",
        description: "A tarnished circlet.",
      },
      { open },
    );

    expect(result.ok).toBe(true);
    const url = sentUrl(open);
    expect(url!.origin + url!.pathname).toBe(
      MONSTERLABS_MAGIC_ITEM_GENERATOR_URL,
    );
  });

  it("routes a character or creature to the monster generator", async () => {
    const { open } = stubWindow();
    const result = await sendEntityToMonsterLabs(
      {
        name: "Ash-Eater Varkesh",
        type: "creature",
        description: "A soot-caked horror.",
      },
      { open },
    );

    expect(result.ok).toBe(true);
    const url = sentUrl(open);
    expect(url!.origin + url!.pathname).toBe(MONSTERLABS_MONSTER_GENERATOR_URL);
  });

  it("reports empty-content for a name-only entity regardless of destination, without opening a tab", async () => {
    const { open } = stubWindow();

    await expect(
      sendEntityToMonsterLabs(
        { name: "Nameless", type: "creature", description: "" },
        { open },
      ),
    ).resolves.toEqual({ ok: false, reason: "empty-content" });
    await expect(
      sendEntityToMonsterLabs(
        { name: "Nameless", type: "item", description: "" },
        { open },
      ),
    ).resolves.toEqual({ ok: false, reason: "empty-content" });
    expect(open).not.toHaveBeenCalled();
  });
});

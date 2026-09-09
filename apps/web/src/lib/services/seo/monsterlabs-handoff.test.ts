import { describe, it, expect, vi } from "vitest";
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
  it("opens the monster generator with the prompt and attribution params", () => {
    const open = vi.fn();

    const result = sendToMonsterLabsMonsterGenerator(
      {
        name: "Ash-Eater Varkesh",
        type: "creature",
        description: "A soot-caked horror.",
      },
      { open },
    );

    expect(result.ok).toBe(true);
    expect(open).toHaveBeenCalledTimes(1);
    if (result.ok) {
      const url = new URL(result.url);
      expect(url.origin + url.pathname).toBe(MONSTERLABS_MONSTER_GENERATOR_URL);
      expect(url.searchParams.get("prompt")).toBe(
        "Name: Ash-Eater Varkesh\nType: Creature\n\nA soot-caked horror.",
      );
      expect(url.searchParams.get("utm_source")).toBe("codexcryptica");
    }
  });

  it("survives markdown, unicode, and special characters in the description", () => {
    const description =
      "# Notes\n\n*Cunning & ruthless* — wields a +2 blade\nHP: 120 | 世界";
    const result = sendToMonsterLabsMonsterGenerator(
      {
        name: "Grand Vizier",
        type: "character",
        description,
      },
      { open: vi.fn() },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const url = new URL(result.url);
      expect(url.searchParams.get("prompt")).toBe(
        `Name: Grand Vizier\nType: Character\n\n${description}`,
      );
    }
  });

  it("reports an explicit failure instead of opening a tab for a blank description", () => {
    const open = vi.fn();
    const result = sendToMonsterLabsMonsterGenerator(
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

  it("reports an explicit failure instead of opening a tab for an oversized entity", () => {
    const open = vi.fn();
    const result = sendToMonsterLabsMonsterGenerator(
      {
        name: "Wall of Text",
        type: "creature",
        description: "a".repeat(9000),
      },
      { open },
    );

    expect(result.ok).toBe(false);
    expect(open).not.toHaveBeenCalled();
    if (!result.ok) {
      expect(result.reason).toBe("url-too-long");
    }
  });
});

describe("sendToMonsterLabsMagicItemGenerator", () => {
  it("opens the magic item generator with the prompt and attribution params", () => {
    const open = vi.fn();

    const result = sendToMonsterLabsMagicItemGenerator(
      {
        name: "Crown of the Last Ember",
        type: "item",
        description: "A tarnished circlet that hums when a fire is near.",
      },
      { open },
    );

    expect(result.ok).toBe(true);
    expect(open).toHaveBeenCalledTimes(1);
    if (result.ok) {
      const url = new URL(result.url);
      expect(url.origin + url.pathname).toBe(
        MONSTERLABS_MAGIC_ITEM_GENERATOR_URL,
      );
      expect(url.searchParams.get("prompt")).toBe(
        "Name: Crown of the Last Ember\nType: Item\n\nA tarnished circlet that hums when a fire is near.",
      );
      expect(url.searchParams.get("utm_source")).toBe("codexcryptica");
    }
  });

  it("survives markdown, unicode, and special characters in the description", () => {
    const description =
      "# Notes\n\n*Cursed & coveted* — grants +2 to fire saves\nWeight: 1 lb | 世界";
    const result = sendToMonsterLabsMagicItemGenerator(
      {
        name: "Crown of the Last Ember",
        type: "item",
        description,
      },
      { open: vi.fn() },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const url = new URL(result.url);
      expect(url.searchParams.get("prompt")).toBe(
        `Name: Crown of the Last Ember\nType: Item\n\n${description}`,
      );
    }
  });

  it("reports an explicit failure instead of opening a tab for a blank description", () => {
    const open = vi.fn();
    const result = sendToMonsterLabsMagicItemGenerator(
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

  it("reports an explicit failure instead of opening a tab for an oversized item", () => {
    const open = vi.fn();
    const result = sendToMonsterLabsMagicItemGenerator(
      {
        name: "Wall of Text",
        type: "item",
        description: "a".repeat(9000),
      },
      { open },
    );

    expect(result.ok).toBe(false);
    expect(open).not.toHaveBeenCalled();
    if (!result.ok) {
      expect(result.reason).toBe("url-too-long");
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
  it("routes an item to the magic item generator", () => {
    const open = vi.fn();
    const result = sendEntityToMonsterLabs(
      {
        name: "Crown of the Last Ember",
        type: "item",
        description: "A tarnished circlet.",
      },
      { open },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const url = new URL(result.url);
      expect(url.origin + url.pathname).toBe(
        MONSTERLABS_MAGIC_ITEM_GENERATOR_URL,
      );
    }
  });

  it("routes a character or creature to the monster generator", () => {
    const open = vi.fn();
    const result = sendEntityToMonsterLabs(
      {
        name: "Ash-Eater Varkesh",
        type: "creature",
        description: "A soot-caked horror.",
      },
      { open },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const url = new URL(result.url);
      expect(url.origin + url.pathname).toBe(MONSTERLABS_MONSTER_GENERATOR_URL);
    }
  });

  it("reports empty-content for a name-only entity regardless of destination", () => {
    const open = vi.fn();

    expect(
      sendEntityToMonsterLabs(
        { name: "Nameless", type: "creature", description: "" },
        { open },
      ),
    ).toEqual({ ok: false, reason: "empty-content" });
    expect(
      sendEntityToMonsterLabs(
        { name: "Nameless", type: "item", description: "" },
        { open },
      ),
    ).toEqual({ ok: false, reason: "empty-content" });
    expect(open).not.toHaveBeenCalled();
  });
});

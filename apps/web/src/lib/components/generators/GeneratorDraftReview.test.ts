/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { GeneratedDraft } from "generator-engine";
import GeneratorDraftReview from "./GeneratorDraftReview.svelte";

function dungeonDraft(overrides: Partial<GeneratedDraft> = {}): GeneratedDraft {
  return {
    title: "The Observatory of Weeping Veins",
    entityType: "location",
    summary: "A contested subterranean sanctuary.",
    content:
      "## History & Original Purpose\nScholars carved the sanctuary into mithril veins.\n\n## Key Sectors & Layout\n### The Gallery\nEchoing halls descend beneath the observatory.",
    lore: "### Dungeon Layout\nThe Observatory → The Gallery\n\n### Central Secret / Boss Mystery\nThe archmages remain within the mithril.",
    labels: ["dungeon", "location"],
    sourceGeneratorId: "dungeon",
    templateApplied: false,
    ...overrides,
  };
}

const categories = [{ id: "location", label: "Location" }] as never;

describe("GeneratorDraftReview", () => {
  it("renders the complete dungeon document and GM reference separately", () => {
    render(GeneratorDraftReview, {
      props: {
        draft: dungeonDraft(),
        categories,
        saving: false,
        onsave: vi.fn(),
        onback: vi.fn(),
      },
    });

    expect(screen.getByText("Summary")).toBeTruthy();
    expect(screen.getByText("Content")).toBeTruthy();
    expect(screen.getByText("GM Reference")).toBeTruthy();
    expect(screen.getByText("History & Original Purpose")).toBeTruthy();
    expect(
      screen.getByText("The archmages remain within the mithril."),
    ).toBeTruthy();
  });

  it("does not show an empty Content section for legacy drafts", () => {
    render(GeneratorDraftReview, {
      props: {
        draft: dungeonDraft({ content: undefined }),
        categories,
        saving: false,
        onsave: vi.fn(),
        onback: vi.fn(),
      },
    });

    expect(screen.queryByText("Content")).toBeNull();
    expect(screen.getByText("GM Reference")).toBeTruthy();
  });

  it("labels dungeon locations with the active theme term", () => {
    render(GeneratorDraftReview, {
      props: {
        draft: dungeonDraft(),
        categories,
        themeId: "pirate",
        saving: false,
        onsave: vi.fn(),
        onback: vi.fn(),
      },
    });

    expect(
      screen.getByRole("option", { name: "Location (Hideout)" }),
    ).toBeTruthy();
  });

  it("keeps the ordinary location label for non-dungeon drafts", () => {
    render(GeneratorDraftReview, {
      props: {
        draft: dungeonDraft({ sourceGeneratorId: "settlement" }),
        categories,
        themeId: "scifi",
        saving: false,
        onsave: vi.fn(),
        onback: vi.fn(),
      },
    });

    expect(screen.getByRole("option", { name: "Location" })).toBeTruthy();
    expect(
      screen.queryByRole("option", { name: "Location (Facility)" }),
    ).toBeNull();
  });

  it("shows the explicitly selected naming language in review", () => {
    render(GeneratorDraftReview, {
      props: {
        draft: dungeonDraft({
          sourceGeneratorId: "settlement",
          primaryLanguageId: "l1",
          primaryLanguageTitle: "Lemari",
        }),
        categories,
        saving: false,
        onsave: vi.fn(),
        onback: vi.fn(),
      },
    });

    expect(
      screen.getByTestId("primary-language-context").textContent,
    ).toContain("Naming language: Lemari");
  });

  it("shows and invokes the Plot Twist handoff action", async () => {
    const onGeneratePlotTwist = vi.fn();
    render(GeneratorDraftReview, {
      props: {
        draft: dungeonDraft({ labels: ["rpg-quest"] }),
        categories,
        saving: false,
        onsave: vi.fn(),
        onback: vi.fn(),
        onGeneratePlotTwist,
      },
    });

    const button = screen.getByTestId("generate-plot-twist-from-quest");
    expect(button.getAttribute("disabled")).toBeNull();
    await fireEvent.click(button);
    expect(onGeneratePlotTwist).toHaveBeenCalledOnce();
  });

  it("shows and invokes the Boss handoff action for delve drafts", async () => {
    const onGenerateBoss = vi.fn();
    render(GeneratorDraftReview, {
      props: {
        draft: dungeonDraft({ labels: ["dungeon", "delve"] }),
        categories,
        saving: false,
        onsave: vi.fn(),
        onback: vi.fn(),
        onGenerateBoss,
      },
    });

    const button = screen.getByTestId("generate-boss-from-dungeon");
    expect(button.getAttribute("disabled")).toBeNull();
    await fireEvent.click(button);
    expect(onGenerateBoss).toHaveBeenCalledOnce();
  });

  it("disables the Boss handoff while saving", () => {
    render(GeneratorDraftReview, {
      props: {
        draft: dungeonDraft({ labels: ["dungeon", "delve"] }),
        categories,
        saving: true,
        onsave: vi.fn(),
        onback: vi.fn(),
        onGenerateBoss: vi.fn(),
      },
    });

    expect(
      screen.getByTestId("generate-boss-from-dungeon").getAttribute("disabled"),
    ).not.toBeNull();
  });

  it("shows in-vault context provenance when present", () => {
    render(GeneratorDraftReview, {
      props: {
        draft: dungeonDraft({
          contextProvenance: [
            { id: "e1", title: "Silver Keep" },
            { id: "e2", title: "Lord Varis" },
          ],
        }),
        categories,
        saving: false,
        onsave: vi.fn(),
        onback: vi.fn(),
      },
    });

    const badge = screen.getByTestId("in-vault-provenance");
    expect(badge.textContent).toContain("Used context:");
    expect(badge.textContent).toContain("Silver Keep");
    expect(badge.textContent).toContain("Lord Varis");
  });

  it("omits in-vault context provenance when absent", () => {
    render(GeneratorDraftReview, {
      props: {
        draft: dungeonDraft({ contextProvenance: undefined }),
        categories,
        saving: false,
        onsave: vi.fn(),
        onback: vi.fn(),
      },
    });

    expect(screen.queryByTestId("in-vault-provenance")).toBeNull();
  });

  describe("spoiler shield (solo play)", () => {
    const adventure = () =>
      dungeonDraft({
        title: "The Drowned Bell",
        sourceGeneratorId: "adventure",
        summary: "A bell tolls under the harbour.",
        content: "The harbourmaster is the cultist.",
        lore: "The bell wakes the drowned at dawn.",
      });
    const props = (spoilerShield: boolean) => ({
      draft: adventure(),
      categories,
      saving: false,
      onsave: vi.fn(),
      onback: vi.fn(),
      spoilerShield,
    });

    it("keeps the plot hidden but shows the hook until revealed", async () => {
      render(GeneratorDraftReview, { props: props(true) });

      expect(screen.getByText("A bell tolls under the harbour.")).toBeTruthy();
      expect(screen.getByTestId("spoiler-shield")).toBeTruthy();
      expect(
        screen.queryByText("The harbourmaster is the cultist."),
      ).toBeNull();
      expect(screen.queryByText("GM Reference")).toBeNull();

      await fireEvent.click(screen.getByTestId("spoiler-reveal"));

      expect(
        screen.getByText("The harbourmaster is the cultist."),
      ).toBeTruthy();
      expect(screen.getByText("GM Reference")).toBeTruthy();
      expect(screen.queryByTestId("spoiler-shield")).toBeNull();
    });

    it("still saves the full draft while the plot is hidden", async () => {
      const onsave = vi.fn();
      render(GeneratorDraftReview, {
        props: { ...props(true), onsave },
      });

      await fireEvent.submit(
        screen.getByTestId("spoiler-shield").closest("form")!,
      );

      expect(onsave).toHaveBeenCalledOnce();
      expect(onsave.mock.calls[0][0].content).toBe(
        "The harbourmaster is the cultist.",
      );
    });

    it("shows everything when the shield is off", () => {
      render(GeneratorDraftReview, { props: props(false) });

      expect(
        screen.getByText("The harbourmaster is the cultist."),
      ).toBeTruthy();
    });
  });

  describe("Tales of the Valiant mechanics preview", () => {
    it("renders Game Mechanics section when mechanics bundle is present", () => {
      render(GeneratorDraftReview, {
        props: {
          draft: dungeonDraft({
            mechanics: {
              systemId: "tales-of-the-valiant",
              kind: "tov-quick-npc",
              isHomebrew: false,
              data: {
                cr: "1/2",
                ac: 13,
                hp: 18,
                hitDice: "3d8+3",
                speed: "30 ft.",
                attackName: "Shortsword",
                attackBonus: 3,
                attackFormula: "1d20+3",
                damageFormula: "1d6+1",
                damageType: "piercing",
                luck: 1,
                abilityScores: {
                  str: 10,
                  dex: 12,
                  con: 12,
                  int: 10,
                  wis: 10,
                  cha: 10,
                },
                keySaves: [],
                keySkills: [],
                notes: "",
                isHomebrew: false,
              },
            },
          }),
          categories,
          saving: false,
          onsave: vi.fn(),
          onback: vi.fn(),
        },
      });

      expect(screen.getByText("Game Mechanics")).toBeTruthy();
      expect(screen.getByTestId("generator-mechanics-preview")).toBeTruthy();
      expect(screen.getByText("Tales of the Valiant (BFRD)")).toBeTruthy();
      expect(screen.getByText("Quick NPC")).toBeTruthy();
      expect(screen.getByText("Shortsword")).toBeTruthy();
    });

    it("renders GM review badge when mechanics are flagged as homebrew", () => {
      render(GeneratorDraftReview, {
        props: {
          draft: dungeonDraft({
            mechanics: {
              systemId: "tales-of-the-valiant",
              kind: "tov-quick-npc",
              isHomebrew: true,
              data: {
                cr: "1",
                ac: 14,
                hp: 20,
                hitDice: "4d8",
                speed: "30 ft.",
                attackName: "Dagger",
                attackBonus: 4,
                attackFormula: "1d20+4",
                damageFormula: "1d4+2",
                damageType: "piercing",
                luck: 0,
                abilityScores: {
                  str: 10,
                  dex: 14,
                  con: 10,
                  int: 10,
                  wis: 10,
                  cha: 10,
                },
                keySaves: [],
                keySkills: [],
                notes: "",
                isHomebrew: true,
              },
            },
          }),
          categories,
          saving: false,
          onsave: vi.fn(),
          onback: vi.fn(),
        },
      });

      expect(screen.getByTestId("homebrew-gm-review-badge")).toBeTruthy();
      expect(screen.getByText("GM Review")).toBeTruthy();
    });

    it("renders published BFRD encounter Doom guidance without homebrew badges", () => {
      render(GeneratorDraftReview, {
        props: {
          draft: dungeonDraft({
            sourceGeneratorId: "encounter",
            mechanics: {
              systemId: "tales-of-the-valiant",
              kind: "tov-encounter",
              isHomebrew: false,
              data: {
                qualitativeDifficulty: "Moderate for 4 Level 3 characters",
                recommendedCrRange: "CR 1–2 minions with a CR 3 leader",
                suggestedCreatures: [
                  {
                    name: "Shadow Hound",
                    cr: "1",
                    count: 2,
                    role: "Skirmisher",
                    isHomebrew: false,
                  },
                ],
                tacticalAdvice: "Flank in low light.",
                doomNotes:
                  "Start the encounter with a CR-based GM Doom pool of 2 points. Spend Doom to give a creature advantage on an attack, give a PC disadvantage on a save, or once per encounter recharge or gain one additional use of a limited-use feature.",
                isHomebrew: false,
              },
            },
          }),
          categories,
          saving: false,
          onsave: vi.fn(),
          onback: vi.fn(),
        },
      });

      expect(
        screen.getByText("Encounter Doom Guidance (Optional BFRD Rule)"),
      ).toBeTruthy();
      expect(
        screen.queryByText("Doom Actions & Usage (Boss / High Threat)"),
      ).toBeNull();
      expect(screen.queryByTestId("encounter-doom-homebrew-badge")).toBeNull();
      expect(screen.queryByTestId("homebrew-gm-review-badge")).toBeNull();
    });

    it("renders Homebrew and GM Review badges when encounter Doom guidance includes custom creature spends", () => {
      render(GeneratorDraftReview, {
        props: {
          draft: dungeonDraft({
            sourceGeneratorId: "encounter",
            mechanics: {
              systemId: "tales-of-the-valiant",
              kind: "tov-encounter",
              isHomebrew: false,
              data: {
                qualitativeDifficulty: "Dangerous for 4 Level 3 characters",
                recommendedCrRange: "Single CR 4 boss",
                suggestedCreatures: [
                  {
                    name: "Gloom Caller",
                    cr: "4",
                    count: 1,
                    role: "Boss",
                    isHomebrew: false,
                  },
                ],
                tacticalAdvice: "Hold the altar.",
                doomNotes:
                  "[Homebrew] Spend 2 Doom to summon a Shadow Minion at initiative count 20.",
                isHomebrew: false,
              },
            },
          }),
          categories,
          saving: false,
          onsave: vi.fn(),
          onback: vi.fn(),
        },
      });

      expect(
        screen.getByText("Encounter Doom Guidance (Optional BFRD Rule)"),
      ).toBeTruthy();
      expect(screen.getByTestId("encounter-doom-homebrew-badge")).toBeTruthy();
      expect(screen.getByTestId("homebrew-gm-review-badge")).toBeTruthy();
    });
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ZenHeader MonsterLabs handoff action", () => {
  const source = readFileSync(
    `${process.cwd()}/src/lib/components/zen/ZenHeader.svelte`,
    "utf8",
  );

  it("imports the shared MonsterLabs handoff service and confirm-first flow", () => {
    expect(source).toContain('from "$lib/services/seo/monsterlabs-handoff"');
    expect(source).toContain("isMonsterLabsHandoffEligibleType");
    expect(source).toContain(
      'from "$lib/services/seo/monsterlabs-handoff-flow.svelte"',
    );
    expect(source).toContain("createMonsterLabsHandoffFlow");
  });

  it("exposes a send to MonsterLabs button for eligible entity types", () => {
    expect(source).toContain('data-testid="zen-send-to-monsterlabs-button"');
    expect(source).toContain(
      "{#if entity && isMonsterLabsHandoffEligibleType(entity.type)}",
    );
  });

  it("guards the handoff handler against a missing entity", () => {
    expect(source).toContain("const handleSendToMonsterLabs = () => {");
    expect(source).toContain("if (!entity) return;");
  });

  it("only starts the confirm flow — no sending happens until confirmed in the modal", () => {
    expect(source).toContain("monsterLabsFlow.start({");
    expect(source).toContain("disabled={monsterLabsFlow.open}");
    expect(source).toContain("aria-busy={monsterLabsFlow.open}");
  });

  it("sends the entity's title, type, and content/lore", () => {
    expect(source).toContain("name: entity.title");
    expect(source).toContain("type: entity.type");
  });

  it("wires the modal to the flow's confirm/open/close callbacks", () => {
    expect(source).toContain("onConfirm={monsterLabsFlow.confirm}");
    expect(source).toContain("onOpen={monsterLabsFlow.close}");
    expect(source).toContain("onClose={monsterLabsFlow.close}");
  });
});

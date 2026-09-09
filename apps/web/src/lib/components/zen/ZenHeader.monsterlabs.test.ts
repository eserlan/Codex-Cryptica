import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ZenHeader MonsterLabs handoff action", () => {
  const source = readFileSync(
    `${process.cwd()}/src/lib/components/zen/ZenHeader.svelte`,
    "utf8",
  );

  it("imports the shared MonsterLabs handoff service", () => {
    expect(source).toContain('from "$lib/services/seo/monsterlabs-handoff"');
    expect(source).toContain("isMonsterLabsHandoffEligibleType");
    expect(source).toContain("sendEntityToMonsterLabs");
  });

  it("exposes a send to MonsterLabs button for eligible entity types", () => {
    expect(source).toContain('data-testid="zen-send-to-monsterlabs-button"');
    expect(source).toContain(
      "{#if entity && isMonsterLabsHandoffEligibleType(entity.type)}",
    );
  });

  it("guards the handoff handler against a missing entity", () => {
    expect(source).toContain("const handleSendToMonsterLabs = async () => {");
    expect(source).toContain("if (!entity || isSendingToMonsterLabs) return;");
  });

  it("tracks a busy state while the (possibly AI-compressed) send is in flight", () => {
    expect(source).toContain("let isSendingToMonsterLabs = $state(false);");
    expect(source).toContain("isSendingToMonsterLabs = true;");
    expect(source).toContain("isSendingToMonsterLabs = false;");
    expect(source).toContain("disabled={isSendingToMonsterLabs}");
  });

  it("sends the entity's title, type, and content/lore", () => {
    expect(source).toContain("sendEntityToMonsterLabs({");
    expect(source).toContain("name: entity.title");
    expect(source).toContain("type: entity.type");
  });

  it("surfaces a notification when the handoff fails", () => {
    expect(source).toContain("if (!result.ok) {");
    expect(source).toContain("notificationStore.notify(");
  });
});

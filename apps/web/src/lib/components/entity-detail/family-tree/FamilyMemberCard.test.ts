/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
import type { FamilyMember } from "@codex/family-engine";
import FamilyMemberCard from "./FamilyMemberCard.svelte";

function member(overrides: Partial<FamilyMember> = {}): FamilyMember {
  return {
    entityId: "m1",
    name: "Test Person",
    deceased: false,
    relation: "parent",
    generation: -1,
    ...overrides,
  };
}

describe("FamilyMemberCard category + gender", () => {
  it("shows the specific relation term when present", () => {
    render(FamilyMemberCard, {
      member: member({ relationLabel: "Mother" }),
    });
    expect(screen.getByText("Mother")).toBeTruthy();
  });

  it("falls back to the generic relation category when no term is set", () => {
    render(FamilyMemberCard, { member: member({ relation: "sibling" }) });
    expect(screen.getByText("Sibling")).toBeTruthy();
  });

  it("shows no category text for the focus card", () => {
    render(FamilyMemberCard, {
      member: member({ relation: "focus", generation: 0 }),
      isFocus: true,
    });
    expect(screen.queryByText("Parent")).toBeNull();
    expect(screen.queryByText("Focus")).toBeNull();
  });

  it("renders a gender icon with accessible text for male/female", () => {
    const { container: maleContainer } = render(FamilyMemberCard, {
      member: member({ gender: "male" }),
    });
    expect(
      maleContainer.querySelector(".icon-\\[lucide--mars\\]"),
    ).toBeTruthy();
    expect(screen.getByText("Male")).toBeTruthy();
  });

  it("renders no gender icon when gender is unknown", () => {
    const { container } = render(FamilyMemberCard, { member: member() });
    expect(container.querySelector(".icon-\\[lucide--mars\\]")).toBeNull();
    expect(container.querySelector(".icon-\\[lucide--venus\\]")).toBeNull();
  });
});

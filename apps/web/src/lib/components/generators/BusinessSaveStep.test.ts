/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import {
  buildBusinessSavePlan,
  generateBusinessLocal,
  type BusinessSavePlan,
} from "generator-engine";
import BusinessSaveStep from "./BusinessSaveStep.svelte";

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function planFor(
  opts: {
    existing?: Array<[string, string]>;
    source?: "location" | "character" | "faction";
    seed?: number;
  } = {},
) {
  const doc = generateBusinessLocal(
    {
      genre: "Classic Fantasy",
      businessType: "Blacksmith",
      scale: "established",
      playersOwn: false,
    },
    seeded(opts.seed ?? 51),
  );
  const existingTitles = new Map(opts.existing ?? []);
  const plan = buildBusinessSavePlan(doc, {
    existingTitles,
    source: opts.source
      ? { entityId: "ent-src", entityType: opts.source }
      : undefined,
  });
  return { doc, plan };
}

function renderStep(
  plan: BusinessSavePlan,
  extra: Record<string, unknown> = {},
) {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  render(BusinessSaveStep, {
    props: { plan, busy: false, onSave, onCancel, ...extra },
  });
  return { onSave, onCancel };
}

describe("BusinessSaveStep", () => {
  it("lists the people ticked by default", () => {
    const { plan } = planFor();
    renderStep(plan);
    const owner = screen.getByRole("checkbox", {
      name: new RegExp(plan.people[0].draft.title),
    }) as HTMLInputElement;
    expect(owner.checked).toBe(true);
  });

  it("links a matched party as ticked and offers an unmatched one as new, unticked", () => {
    const { doc, plan } = planFor({ existing: [] });
    const withMatch = buildBusinessSavePlan(doc, {
      existingTitles: new Map([
        [doc.relationships[0].name.toLowerCase(), "ent-x"],
      ]),
    });
    renderStep(withMatch);
    const matched = screen.getByRole("checkbox", {
      name: new RegExp(`Link ${doc.relationships[0].name}`),
    }) as HTMLInputElement;
    expect(matched.checked).toBe(true);
    expect(plan.parties.length).toBeGreaterThan(0);
  });

  it("offers an unmatched party as new, unticked", () => {
    const { plan } = planFor();
    renderStep(plan);
    const created = screen.getByRole("checkbox", {
      name: new RegExp(`Create new ${plan.parties[0].name}`),
    }) as HTMLInputElement;
    expect(created.checked).toBe(false);
  });

  it("emits the user's ticks when saved, leaving out an unticked person", async () => {
    const { plan } = planFor();
    const { onSave } = renderStep(plan);
    const owner = plan.people[0];
    const ownerBox = screen.getByRole("checkbox", {
      name: new RegExp(owner.draft.title),
    });
    await fireEvent.click(ownerBox);
    await fireEvent.click(screen.getByRole("button", { name: /Save/i }));
    const choices = onSave.mock.calls[0][0];
    expect(choices.tickedPersonIds).not.toContain(owner.personId);
  });

  it("shows a collision notice and emits the rename the user typed", async () => {
    const { doc } = planFor();
    const colliding = buildBusinessSavePlan(doc, {
      existingTitles: new Map([
        [doc.leadership.name.toLowerCase(), "ent-same"],
      ]),
    });
    const { onSave } = renderStep(colliding);
    expect(screen.getByText(/already in your vault/i)).toBeTruthy();
    const rename = screen.getByLabelText(
      new RegExp(`Name for ${doc.leadership.name}`, "i"),
    ) as HTMLInputElement;
    await fireEvent.input(rename, { target: { value: "Iska Venn" } });
    await fireEvent.click(screen.getByRole("button", { name: /Save/i }));
    expect(onSave.mock.calls[0][0].renames[doc.leadership.id]).toBe(
      "Iska Venn",
    );
  });

  it("offers the source link label for the source type and emits the chosen one", async () => {
    const { plan } = planFor({ source: "faction" });
    const { onSave } = renderStep(plan);
    const select = screen.getByLabelText(/Link label/i) as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toEqual([
      "protected by",
      "contracted by",
    ]);
    await fireEvent.change(select, { target: { value: "contracted by" } });
    await fireEvent.click(screen.getByRole("button", { name: /Save/i }));
    expect(onSave.mock.calls[0][0].sourceLabel).toBe("contracted by");
  });

  it("cancels without saving", async () => {
    const { plan } = planFor();
    const { onSave, onCancel } = renderStep(plan);
    await fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("disables Save while a save is running", () => {
    const { plan } = planFor();
    renderStep(plan, { busy: true });
    expect(
      (
        screen.getByRole("button", {
          name: /Saving|Save/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});

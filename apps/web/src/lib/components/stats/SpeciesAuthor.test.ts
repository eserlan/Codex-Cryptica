/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { EntitySchema } from "schema";
vi.mock("#lib/stores/vault.svelte.js", () => ({ vault: {} }));
import SpeciesAuthor from "./SpeciesAuthor.svelte";
const entity = () =>
  EntitySchema.parse({
    id: "k",
    title: "Kethari",
    type: "creature",
    content: "Lore",
  });
async function start() {
  await fireEvent.click(
    screen.getByRole("button", { name: "Designate Species/Ancestry" }),
  );
  await fireEvent.click(screen.getByRole("button", { name: "Add trait" }));
}

describe("SpeciesAuthor", () => {
  it("authors validated traits without changing category, content or sheet", async () => {
    const original = entity(),
      before = structuredClone(original),
      save = vi.fn();
    render(SpeciesAuthor, { entity: original, save });
    await start();
    await fireEvent.input(screen.getByLabelText("Trait name 1"), {
      target: { value: "Powerful" },
    });
    await fireEvent.input(screen.getByLabelText("Description 1"), {
      target: { value: "Strong" },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: "Add adjustment 1" }),
    );
    await fireEvent.input(screen.getByLabelText("Target key 1.1"), {
      target: { value: "strength" },
    });
    await fireEvent.input(screen.getByLabelText("Amount 1.1"), {
      target: { value: "2" },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: "Save species definition" }),
    );
    expect(save).toHaveBeenCalledWith({
      speciesDefinition: {
        kind: "species",
        version: 1,
        traits: [
          {
            id: expect.any(String),
            name: "Powerful",
            description: "Strong",
            adjustments: [{ key: "strength", amount: 2 }],
          },
        ],
      },
    });
    expect(original).toEqual(before);
  });
  it("rejects blank names, invalid keys and empty numeric amounts", async () => {
    const save = vi.fn();
    const view = render(SpeciesAuthor, { entity: entity(), save });
    await start();
    const submit = () =>
      fireEvent.submit(view.container.querySelector("form")!);
    await submit();
    expect(screen.getByRole("alert").textContent).toContain(
      "Trait name is required",
    );
    await fireEvent.input(screen.getByLabelText("Trait name 1"), {
      target: { value: "Powerful" },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: "Add adjustment 1" }),
    );
    await fireEvent.input(screen.getByLabelText("Target key 1.1"), {
      target: { value: "bad-key" },
    });
    await submit();
    expect(screen.getByRole("alert").textContent).toContain("Key must start");
    await fireEvent.input(screen.getByLabelText("Target key 1.1"), {
      target: { value: "strength" },
    });
    await fireEvent.input(screen.getByLabelText("Amount 1.1"), {
      target: { value: "" },
    });
    await submit();
    expect(screen.getByRole("alert").textContent).toContain("amount");
    expect(save).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Designate Species/Ancestry" }),
    );
  });
  it("allows abilities without adjustments, retains failed drafts and retries", async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error("disk"))
      .mockResolvedValueOnce(true);
    render(SpeciesAuthor, { entity: entity(), save });
    await start();
    await fireEvent.input(screen.getByLabelText("Trait name 1"), {
      target: { value: "Night sight" },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: "Save species definition" }),
    );
    expect(screen.getByRole("alert").textContent).toContain("Try again");
    expect(screen.getByLabelText("Trait name 1")).toHaveProperty(
      "value",
      "Night sight",
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "Save species definition" }),
    );
    expect(save).toHaveBeenCalledTimes(2);
  });
  it("hides designation controls for guests and does not write on render", () => {
    const save = vi.fn();
    render(SpeciesAuthor, { entity: entity(), readOnly: true, save });
    expect(screen.queryByRole("button")).toBeNull();
    expect(save).not.toHaveBeenCalled();
  });
});

describe("designation removal", () => {
  it("removes only metadata and allows abandoning an invalid draft", async () => {
    const original = {
      ...entity(),
      speciesDefinition: {
        kind: "species" as const,
        version: 1 as const,
        traits: [
          {
            id: "sight",
            name: "Night sight",
            description: "See in darkness",
            adjustments: [],
          },
        ],
      },
    };
    const save = vi.fn();
    render(SpeciesAuthor, { entity: original, save });
    await fireEvent.click(
      screen.getByRole("button", { name: "Edit species traits" }),
    );
    await fireEvent.input(screen.getByLabelText("Trait name 1"), {
      target: { value: "" },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: "Remove designation" }),
    );
    expect(save).toHaveBeenCalledWith({ speciesDefinition: undefined });
    expect(original.speciesDefinition.traits[0].name).toBe("Night sight");
    expect(original.type).toBe("creature");
    expect(original.content).toBe("Lore");
  });
});

describe("trait form editing", () => {
  it.each(["save", "cancel"])(
    "retains trait identities when adjustments and earlier traits are removed: %s",
    async (action) => {
      const original = EntitySchema.parse({
        ...entity(),
        speciesDefinition: {
          kind: "species",
          version: 1,
          traits: [
            {
              id: "power",
              name: "Powerful",
              description: "Strong",
              adjustments: [
                { key: "strength", amount: 2 },
                { key: "presence", amount: -1 },
              ],
            },
            {
              id: "sight",
              name: "Night sight",
              description: "See in darkness",
              adjustments: [],
            },
          ],
        },
      });
      const before = structuredClone(original),
        save = vi.fn();
      render(SpeciesAuthor, { entity: original, save });
      await fireEvent.click(
        screen.getByRole("button", { name: "Edit species traits" }),
      );
      await fireEvent.click(
        screen.getByRole("button", { name: "Remove adjustment 1.1" }),
      );
      expect(screen.getByLabelText("Target key 1.1")).toHaveProperty(
        "value",
        "presence",
      );
      expect(screen.getByLabelText("Amount 1.1")).toHaveProperty("value", "-1");
      await fireEvent.click(
        screen.getByRole("button", { name: "Remove trait 1" }),
      );
      expect(screen.getByLabelText("Trait name 1")).toHaveProperty(
        "value",
        "Night sight",
      );
      expect(screen.queryByLabelText("Target key 1.1")).toBeNull();
      expect(save).not.toHaveBeenCalled();
      await fireEvent.click(
        screen.getByRole("button", {
          name: action === "save" ? "Save species definition" : "Cancel",
        }),
      );
      if (action === "save") {
        expect(save).toHaveBeenCalledExactlyOnceWith({
          speciesDefinition: {
            kind: "species",
            version: 1,
            traits: [before.speciesDefinition!.traits[1]],
          },
        });
      } else {
        expect(save).not.toHaveBeenCalled();
        await fireEvent.click(
          screen.getByRole("button", { name: "Edit species traits" }),
        );
        expect(screen.getByLabelText("Trait name 1")).toHaveProperty(
          "value",
          "Powerful",
        );
        expect(screen.getByLabelText("Target key 1.2")).toHaveProperty(
          "value",
          "presence",
        );
      }
      expect(original).toEqual(before);
    },
  );
});

/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const openForEntity = vi.fn();
vi.mock("#lib/stores/ui/modal-ui.svelte.js", () => ({
  modalUIStore: {
    openGeneratorWorkflowForEntity: (...args: unknown[]) =>
      openForEntity(...args),
  },
}));

import GenerateBusinessButton from "./GenerateBusinessButton.svelte";

describe("GenerateBusinessButton", () => {
  beforeEach(() => openForEntity.mockReset());

  it("opens the business generator from the entity", async () => {
    render(GenerateBusinessButton, {
      props: { entityId: "ent-1", entityType: "location" },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: /Generate a business here/i }),
    );
    expect(openForEntity).toHaveBeenCalledWith("ent-1", "business");
  });

  it.each(["location", "character", "faction"])(
    "appears for a %s",
    (entityType) => {
      render(GenerateBusinessButton, {
        props: { entityId: "ent-1", entityType },
      });
      expect(
        screen.getByRole("button", { name: /Generate a business here/i }),
      ).toBeTruthy();
    },
  );

  it.each(["note", "item", "event", "creature"])(
    "is hidden for a %s",
    (entityType) => {
      const { container } = render(GenerateBusinessButton, {
        props: { entityId: "ent-1", entityType },
      });
      expect(container.querySelector("button")).toBeNull();
    },
  );
});

/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

const { publishTemplate } = vi.hoisted(() => ({ publishTemplate: vi.fn() }));

vi.mock("$lib/services/publishing/PublicTemplateDirectoryService", () => ({
  publicTemplateDirectoryService: { publishTemplate },
}));

import TemplatePublishModal from "./TemplatePublishModal.svelte";

const templates = [
  {
    id: "first",
    name: "First sheet",
    description: "First layout",
    fields: [{ id: "hp", label: "HP", type: "counter" }],
  },
  {
    id: "second",
    name: "Second sheet",
    description: "Second layout",
    fields: [{ id: "armor", label: "Armor", type: "counter" }],
  },
] as any;

describe("TemplatePublishModal", () => {
  it("does not publish until the creator acknowledges public sharing", async () => {
    publishTemplate.mockClear();
    render(TemplatePublishModal, { templates });

    await fireEvent.click(screen.getByText("Publish templates"));

    expect(publishTemplate).not.toHaveBeenCalled();
  });

  it("publishes selected templates independently and displays their management keys", async () => {
    publishTemplate.mockReset();
    publishTemplate
      .mockResolvedValueOnce({
        listing: { listingId: "listing-first" },
        ownerToken: "first-management-key",
      })
      .mockResolvedValueOnce({
        listing: { listingId: "listing-second" },
        ownerToken: "second-management-key",
      });
    const onPublished = vi.fn();
    render(TemplatePublishModal, { templates, onPublished });

    await fireEvent.click(
      screen.getByLabelText(
        "I understand 2 templates will be publicly discoverable.",
      ),
    );
    await fireEvent.click(screen.getByText("Publish templates"));

    expect(publishTemplate).toHaveBeenCalledTimes(2);
    expect(onPublished).toHaveBeenCalledWith(
      "listing-first",
      "first-management-key",
    );
    expect(screen.getByText("first-management-key")).toBeTruthy();
    expect(screen.getByText("second-management-key")).toBeTruthy();
  });

  it("keeps successful publishes and retries only failed templates", async () => {
    publishTemplate.mockReset();
    publishTemplate
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce({
        listing: { listingId: "listing-second" },
        ownerToken: "second-management-key",
      })
      .mockResolvedValueOnce({
        listing: { listingId: "listing-first" },
        ownerToken: "retried-management-key",
      });
    render(TemplatePublishModal, { templates });

    await fireEvent.click(
      screen.getByLabelText(
        "I understand 2 templates will be publicly discoverable.",
      ),
    );
    await fireEvent.click(screen.getByText("Publish templates"));

    expect(screen.getByText("1 template could not be published.")).toBeTruthy();
    await fireEvent.click(screen.getByText("Retry failed templates"));

    expect(publishTemplate).toHaveBeenCalledTimes(3);
    expect(screen.getByText("retried-management-key")).toBeTruthy();
  });

  it("displays validation error inline when draft fields are invalid and blocks publish gracefully", async () => {
    publishTemplate.mockReset();
    const invalidTemplate = {
      id: "broken-template",
      name: "Broken Sheet",
      description: "A sheet with bad min/max",
      fields: [
        {
          id: "hp",
          label: "HP",
          type: "counter",
          min: 100,
          max: 10,
        },
      ],
    } as any;

    render(TemplatePublishModal, { templates: [invalidTemplate] });

    // The validation error should be visible inline
    expect(
      screen.getByText("Field 1: Field minimum cannot exceed maximum"),
    ).toBeTruthy();

    // Acknowledge and try to publish
    await fireEvent.click(
      screen.getByLabelText(
        "I understand 1 template will be publicly discoverable.",
      ),
    );
    await fireEvent.click(screen.getByText("Publish template"));

    // Network publish should not have been called for invalid draft
    expect(publishTemplate).not.toHaveBeenCalled();

    // Failure message should be surfaced cleanly
    expect(screen.getByText("1 template could not be published.")).toBeTruthy();
  });

  it("handles clearing game system and surfaces missing system or category error", async () => {
    publishTemplate.mockReset();
    const validTpl = {
      id: "tpl-1",
      name: "Test Sheet",
      description: "Test description",
      fields: [{ id: "hp", label: "HP", type: "counter" }],
    } as any;

    render(TemplatePublishModal, { templates: [validTpl] });

    const systemInput = screen.getByLabelText("Game system");
    await fireEvent.input(systemInput, { target: { value: "" } });

    expect(
      screen.getByText("A system or entity category is required"),
    ).toBeTruthy();
  });

  it("renders and publishes templates with item-table and modifierSource", async () => {
    publishTemplate.mockReset();
    publishTemplate.mockResolvedValueOnce({
      listing: { listingId: "listing-mythras" },
      ownerToken: "mythras-key",
    });

    const complexTemplate = {
      id: "complex-tpl",
      name: "Mythras Warrior",
      description: "Mythras layout",
      category: "character",
      fields: [
        {
          id: "str",
          label: "STR Check",
          type: "dice",
          formula: "1d20+2",
          modifierSource: "str_score",
        },
        {
          id: "weapons",
          label: "Weapons",
          type: "item-table",
          linkVaultItems: true,
          columns: [
            { id: "weapon", label: "Weapon", type: "text" },
            { id: "damage", label: "Damage", type: "dice" },
          ],
        },
      ],
    } as any;

    render(TemplatePublishModal, { templates: [complexTemplate] });

    expect(screen.getByText("Fields shared (2)")).toBeTruthy();

    await fireEvent.click(
      screen.getByLabelText(
        "I understand 1 template will be publicly discoverable.",
      ),
    );
    await fireEvent.click(screen.getByText("Publish template"));

    expect(publishTemplate).toHaveBeenCalledTimes(1);
    expect(screen.getByText("mythras-key")).toBeTruthy();
  });
});

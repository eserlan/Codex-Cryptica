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
});

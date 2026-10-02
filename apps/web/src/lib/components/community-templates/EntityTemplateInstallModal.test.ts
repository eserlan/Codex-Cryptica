/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/stores/help.svelte", () => ({
  helpStore: { openHelpToArticle: vi.fn() },
}));
vi.mock("$lib/stores/entity-templates/entity-template-install", () => ({
  installEntityTemplateFromListing: vi.fn(),
}));

import EntityTemplateInstallModal from "./EntityTemplateInstallModal.svelte";

const template = { id: "t1", name: "Guild Hall" } as any;

describe("EntityTemplateInstallModal", () => {
  it("hides the decorative close icon from assistive technology", () => {
    render(EntityTemplateInstallModal, {
      listingId: "l1",
      title: "Guild Hall",
      install: vi.fn(),
    });
    const closeButton = screen.getByRole("button", { name: "Close" });
    expect(closeButton.querySelector("span")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });

  it("explains what installing does before doing anything", () => {
    const install = vi.fn();
    render(EntityTemplateInstallModal, {
      listingId: "l1",
      title: "Guild Hall",
      install,
    });
    expect(screen.getByText(/won't become your default/i)).toBeTruthy();
    expect(install).not.toHaveBeenCalled();
  });

  it("links to the sharing help article", async () => {
    const { helpStore } = await import("$lib/stores/help.svelte");
    render(EntityTemplateInstallModal, {
      listingId: "l1",
      title: "T",
      install: vi.fn(),
    });
    await fireEvent.click(screen.getByText("How sharing works"));
    expect(helpStore.openHelpToArticle).toHaveBeenCalledWith(
      "sharing-templates",
    );
  });

  it("installs and confirms, with a notice for an unknown category", async () => {
    const install = vi.fn(async () => ({
      status: "installed" as const,
      template,
      notice: "No such category yet.",
    }));
    const onInstalled = vi.fn();
    render(EntityTemplateInstallModal, {
      listingId: "l1",
      title: "Guild Hall",
      install,
      onInstalled,
    });
    await fireEvent.click(screen.getByText("Install"));
    expect(await screen.findByText(/Installed\./)).toBeTruthy();
    expect(screen.getByText("No such category yet.")).toBeTruthy();
    expect(install).toHaveBeenCalledWith("l1", undefined);
    expect(onInstalled).toHaveBeenCalled();
  });

  it("asks for a new name on a collision and installs with it", async () => {
    const install = vi
      .fn()
      .mockResolvedValueOnce({
        status: "needs-name",
        suggestedName: "Guild Hall (community)",
      })
      .mockResolvedValueOnce({ status: "installed", template });
    render(EntityTemplateInstallModal, {
      listingId: "l1",
      title: "Guild Hall",
      install,
    });
    await fireEvent.click(screen.getByText("Install"));
    const input = (await screen.findByLabelText(
      "Name for your copy",
    )) as HTMLInputElement;
    expect(input.value).toBe("Guild Hall (community)");
    await fireEvent.input(input, { target: { value: "My Guild Hall" } });
    await fireEvent.click(screen.getByText("Install with this name"));
    expect(await screen.findByText(/Installed\./)).toBeTruthy();
    expect(install).toHaveBeenLastCalledWith("l1", "My Guild Hall");
  });

  it("cancels at the name step without installing", async () => {
    const install = vi.fn(async () => ({
      status: "needs-name" as const,
      suggestedName: "X",
    }));
    const onClose = vi.fn();
    render(EntityTemplateInstallModal, {
      listingId: "l1",
      title: "T",
      install,
      onClose,
    });
    await fireEvent.click(screen.getByText("Install"));
    await screen.findByLabelText("Name for your copy");
    await fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
    expect(install).toHaveBeenCalledTimes(1);
  });

  it("shows a plain-language error and can retry", async () => {
    const install = vi
      .fn()
      .mockResolvedValueOnce({
        status: "error",
        message: "This template is no longer available.",
      })
      .mockResolvedValueOnce({ status: "installed", template });
    render(EntityTemplateInstallModal, {
      listingId: "l1",
      title: "T",
      install,
    });
    await fireEvent.click(screen.getByText("Install"));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(
      screen.getByText("This template is no longer available."),
    ).toBeTruthy();
    await fireEvent.click(screen.getByText("Try again"));
    expect(await screen.findByText(/Installed\./)).toBeTruthy();
  });

  it("installs only once when Install is pressed twice quickly", async () => {
    let release: (v: any) => void = () => {};
    const install = vi.fn(() => new Promise((resolve) => (release = resolve)));
    render(EntityTemplateInstallModal, {
      listingId: "l1",
      title: "T",
      install: install as any,
    });
    const button = screen.getByText("Install") as HTMLButtonElement;
    button.click();
    button.click();
    expect(install).toHaveBeenCalledTimes(1);
    release({ status: "installed", template });
    expect(await screen.findByText(/Installed\./)).toBeTruthy();
  });
});

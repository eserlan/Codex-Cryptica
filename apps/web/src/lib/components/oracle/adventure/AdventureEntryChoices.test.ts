/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureEntryChoices from "./AdventureEntryChoices.svelte";

describe("AdventureEntryChoices", () => {
  it("opens the existing rumour generator from Discover an Adventure", async () => {
    const onDiscover = vi.fn();
    const onOwnPremise = vi.fn();
    render(AdventureEntryChoices, {
      props: { onDiscover, onOwnPremise },
    });

    await fireEvent.click(screen.getByTestId("adventure-discover"));

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onOwnPremise).not.toHaveBeenCalled();
    expect(screen.getByText(/Get six rumours instantly/)).toBeTruthy();
  });

  it("opens the existing manual premise form without generating anything", async () => {
    const onDiscover = vi.fn();
    const onOwnPremise = vi.fn();
    render(AdventureEntryChoices, {
      props: { onDiscover, onOwnPremise },
    });

    await fireEvent.click(screen.getByTestId("adventure-own-premise"));

    expect(onOwnPremise).toHaveBeenCalledTimes(1);
    expect(onDiscover).not.toHaveBeenCalled();
  });

  it("disables discovery until a Vault is ready but keeps manual entry available", async () => {
    const onDiscover = vi.fn();
    const onOwnPremise = vi.fn();
    render(AdventureEntryChoices, {
      props: { onDiscover, onOwnPremise, canDiscover: false },
    });

    const discover = screen.getByTestId(
      "adventure-discover",
    ) as HTMLButtonElement;
    expect(discover.disabled).toBe(true);
    await fireEvent.click(discover);
    await fireEvent.click(screen.getByTestId("adventure-own-premise"));

    expect(onDiscover).not.toHaveBeenCalled();
    expect(onOwnPremise).toHaveBeenCalledTimes(1);

    expect(
      (screen.getByTestId("adventure-discover") as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByTestId("adventure-surprise-me") as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getAllByText(/fully loaded Vault/)).toHaveLength(2);
  });

  it("opens the new in-world scene setup without a generated quest", async () => {
    const onEnterWorld = vi.fn();
    render(AdventureEntryChoices, {
      props: { onDiscover: vi.fn(), onOwnPremise: vi.fn(), onEnterWorld },
    });

    const entry = screen.getByTestId("adventure-enter-world");
    expect(entry.textContent).toContain("Enter Your World");
    expect(entry.tagName).toBe("BUTTON");
    await fireEvent.click(entry);
    expect(onEnterWorld).toHaveBeenCalledOnce();
    expect(screen.getAllByRole("button")).toHaveLength(5);
  });

  it("renders Import Adventure JSON and triggers the file input on activation, plus guide link and drag-and-drop", async () => {
    const onImportFile = vi.fn();
    render(AdventureEntryChoices, {
      props: {
        onDiscover: vi.fn(),
        onOwnPremise: vi.fn(),
        onImportFile,
      },
    });

    const importButton = screen.getByTestId("adventure-import");
    const fileInput = screen.getByTestId(
      "adventure-file-input",
    ) as HTMLInputElement;
    expect(fileInput.getAttribute("tabindex")).toBe("-1");
    expect(fileInput.accept).toContain(".json");
    expect(fileInput.accept).toContain("application/json");
    const clickSpy = vi.spyOn(fileInput, "click");

    await fireEvent.click(importButton);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    const file = new File(
      ['{"formatVersion":"adventure-json/v1"}'],
      "module.json",
      {
        type: "application/json",
      },
    );
    await fireEvent.change(fileInput, { target: { files: [file] } });
    expect(onImportFile).toHaveBeenCalledWith(file);

    const guideLink = screen.getByTestId(
      "adventure-import-guide-link",
    ) as HTMLAnchorElement;
    expect(guideLink.getAttribute("href")).toContain("/adventure-import");

    const dropzone = screen.getByTestId("adventure-json-dropzone");
    const droppedFile = new File(
      ['{"formatVersion":"adventure-json/v1"}'],
      "dropped.json",
      {
        type: "application/json",
      },
    );
    await fireEvent.drop(dropzone, {
      dataTransfer: { files: [droppedFile] },
    });
    expect(onImportFile).toHaveBeenCalledWith(droppedFile);
  });

  it("focuses and scrolls to the importer when opened through its deep link", () => {
    const originalUrl = window.location.href;
    const originalScrollIntoView = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "scrollIntoView",
    );
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    window.history.replaceState(null, "", "#import-adventure-json");
    let unmount: (() => void) | undefined;

    try {
      ({ unmount } = render(AdventureEntryChoices, {
        props: { onDiscover: vi.fn(), onOwnPremise: vi.fn() },
      }));
      const heading = screen.getByRole("heading", {
        name: "Import Adventure JSON",
      });
      expect(heading.id).toBe("import-adventure-json");
      expect(document.activeElement).toBe(heading);
      expect(scrollIntoView).toHaveBeenCalledWith({ block: "center" });
    } finally {
      unmount?.();
      window.history.replaceState(null, "", originalUrl);
      if (originalScrollIntoView) {
        Object.defineProperty(
          HTMLElement.prototype,
          "scrollIntoView",
          originalScrollIntoView,
        );
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
      }
    }
  });

  it("accepts .md and .pdf on the labeled experimental convenience input and shows loading state while importing", async () => {
    const onImportExperimentalFile = vi.fn();
    const { rerender } = render(AdventureEntryChoices, {
      props: {
        onDiscover: vi.fn(),
        onOwnPremise: vi.fn(),
        onImportFile: vi.fn(),
        onImportExperimentalFile,
        importing: false,
      },
    });

    expect(
      screen.getByTestId("adventure-experimental-import-label").textContent,
    ).toContain("Experimental convenience");

    const fileInput = screen.getByTestId(
      "adventure-experimental-file-input",
    ) as HTMLInputElement;
    expect(fileInput.getAttribute("tabindex")).toBeNull();
    expect(fileInput.accept).toContain(".md");
    expect(fileInput.accept).toContain(".pdf");
    expect(fileInput.accept).toContain("application/pdf");

    const mdFile = new File(["# Title\n\n## Scene 1\nHello"], "module.md", {
      type: "text/markdown",
    });
    await fireEvent.change(fileInput, { target: { files: [mdFile] } });
    expect(onImportExperimentalFile).toHaveBeenCalledWith(mdFile);

    const pdfFile = new File(["%PDF-1.4"], "module.pdf", {
      type: "application/pdf",
    });
    await fireEvent.change(fileInput, { target: { files: [pdfFile] } });
    expect(onImportExperimentalFile).toHaveBeenCalledWith(pdfFile);

    await rerender({
      onDiscover: vi.fn(),
      onOwnPremise: vi.fn(),
      onImportFile: vi.fn(),
      onImportExperimentalFile,
      importing: true,
    });
    expect(screen.getByTestId("adventure-import-loading")).toBeTruthy();
    expect(
      (screen.getByTestId("adventure-import") as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("disables the import entry when no owner Vault is ready", async () => {
    const onImportFile = vi.fn();
    render(AdventureEntryChoices, {
      props: {
        onDiscover: vi.fn(),
        onOwnPremise: vi.fn(),
        onImportFile,
        canImport: false,
      },
    });

    const importButton = screen.getByTestId(
      "adventure-import",
    ) as HTMLButtonElement;
    expect(importButton.disabled).toBe(true);
    await fireEvent.click(importButton);
    expect(onImportFile).not.toHaveBeenCalled();
    expect(screen.getByText(/ready owner Vault/)).toBeTruthy();
  });

  it("uses touch-sized cards in a single-column mobile layout", () => {
    render(AdventureEntryChoices, {
      props: { onDiscover: vi.fn(), onOwnPremise: vi.fn() },
    });

    expect(screen.getByTestId("adventure-entry-choices").textContent).toContain(
      "Where will your story begin?",
    );
    for (const id of [
      "adventure-discover",
      "adventure-surprise-me",
      "adventure-own-premise",
      "adventure-enter-world",
    ]) {
      const button = screen.getByTestId(id);
      expect(button.className).toContain("min-h-44");
      expect(button.className).toContain("text-left");
    }
    expect(screen.getByTestId("adventure-json-dropzone")).toBeTruthy();
  });

  it("stacks the Adventure JSON dropzone header and full-width CTA on mobile and stays stacked when disabled (#4986)", async () => {
    const { rerender } = render(AdventureEntryChoices, {
      props: { onDiscover: vi.fn(), onOwnPremise: vi.fn(), canImport: true },
    });

    const header = screen.getByTestId("adventure-import-header");
    expect(header.className).toContain("flex-col");
    expect(header.className).toContain("sm:flex-row");
    expect(header.className).not.toContain("flex-wrap");

    const uploadButton = screen.getByTestId("adventure-import");
    expect(uploadButton.className).toContain("w-full");
    expect(uploadButton.className).toContain("sm:w-auto");
    expect(uploadButton.className).toContain("min-h-11");
    expect(uploadButton.getAttribute("aria-describedby")).toBe(
      "adventure-import-description",
    );

    const footer = screen.getByTestId("adventure-import-footer");
    expect(footer.className).toContain("flex-col");
    expect(footer.className).toContain("sm:flex-row");

    expect(
      screen.getByTestId("adventure-import-guide-link").className,
    ).toContain("max-w-full");
    expect(
      screen.getByTestId("adventure-experimental-import-label").className,
    ).toContain("max-w-full");

    await rerender({
      onDiscover: vi.fn(),
      onOwnPremise: vi.fn(),
      canImport: false,
    });
    expect(
      (screen.getByTestId("adventure-import") as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(screen.getByTestId("adventure-import-header").className).toContain(
      "flex-col",
    );
    expect(screen.getByText(/ready owner Vault/)).toBeTruthy();
  });
});

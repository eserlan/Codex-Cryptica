/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import VaultFilesDropzone from "./VaultFilesDropzone.svelte";

describe("VaultFilesDropzone", () => {
  it("renders a drop area and a Choose Files button", () => {
    render(VaultFilesDropzone, { onSelect: vi.fn() });

    expect(screen.getByTestId("vault-files-dropzone")).toBeTruthy();
    expect(screen.getByText("Choose Files")).toBeTruthy();
  });

  it("calls onSelect with DroppedItems for files chosen via the upload dialog", async () => {
    const onSelect = vi.fn();
    render(VaultFilesDropzone, { onSelect });

    const input = screen.getByLabelText(
      "Choose files to import",
    ) as HTMLInputElement;
    const file = new File(["hi"], "thistle.md");
    Object.defineProperty(input, "files", { value: [file] });

    await fireEvent.change(input);

    expect(onSelect).toHaveBeenCalledWith([
      { relativePath: "thistle.md", file },
    ]);
  });
});

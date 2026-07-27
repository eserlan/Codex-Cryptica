/** @vitest-environment jsdom */

import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import GeneratorConfigForm from "./GeneratorConfigForm.svelte";

describe("GeneratorConfigForm", () => {
  it("submits custom option values for select-based generator options", async () => {
    const onsubmit = vi.fn();

    render(GeneratorConfigForm, {
      props: {
        generatorId: "npc",
        onsubmit,
        aiPolicy: { isEnabled: true, isAvailable: true },
      },
    });

    const raceSelect = screen.getByLabelText("Race");
    await fireEvent.change(raceSelect, { target: { value: "__custom__" } });

    const customRaceInput = screen.getByLabelText("Race (Own option)");
    await fireEvent.input(customRaceInput, {
      target: { value: "Clockwork pilgrim" },
    });

    const roleSelect = screen.getByLabelText("Role");
    await fireEvent.change(roleSelect, { target: { value: "Merchant" } });

    await fireEvent.click(screen.getByRole("button", { name: "Generate" }));

    expect(onsubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        generatorId: "npc",
        options: expect.objectContaining({
          race: "Clockwork pilgrim",
          role: "Merchant",
        }),
      }),
    );
  });

  it("does not show custom inputs before the user asks for them", () => {
    render(GeneratorConfigForm, {
      props: {
        generatorId: "npc",
        onsubmit: vi.fn(),
        aiPolicy: { isEnabled: true, isAvailable: true },
      },
    });

    expect(screen.queryByLabelText("Race (Own option)")).toBeNull();
    expect(screen.queryByLabelText("Role (Own option)")).toBeNull();
  });

  it("uses theme terminology and only offers theme-appropriate delve purposes", async () => {
    render(GeneratorConfigForm, {
      props: {
        generatorId: "dungeon",
        themeId: "scifi",
        categoryLabels: [{ id: "location", label: "Location" }],
        onsubmit: vi.fn(),
        aiPolicy: { isEnabled: true, isAvailable: true },
      },
    });

    expect(
      screen.getByRole("radio", { name: "Location (Facility)" }),
    ).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByLabelText("Original Purpose")).toBeTruthy();
    });
    expect(
      screen.getByRole("option", { name: "Research Facility" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("option", { name: "Temple & Shrine" }),
    ).toBeNull();
  });
});

/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
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
});

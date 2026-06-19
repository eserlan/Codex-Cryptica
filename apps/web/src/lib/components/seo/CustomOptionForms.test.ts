/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import QuestFormFields from "./QuestFormFields.svelte";
import KingdomFormFields from "./KingdomFormFields.svelte";
import NationFormFields from "./NationFormFields.svelte";
import SocialHubFormFields from "./SocialHubFormFields.svelte";
import TavernFormFields from "./TavernFormFields.svelte";
import VampireFormFields from "./VampireFormFields.svelte";
import PantheonFormFields from "./PantheonFormFields.svelte";
import NameFormFields from "./NameFormFields.svelte";

describe("Custom option forms", () => {
  it("quest fields reveal a custom input", async () => {
    render(QuestFormFields);
    await fireEvent.change(screen.getByLabelText("Tone"), {
      target: { value: "__custom__" },
    });
    expect(screen.getByLabelText("Tone (Own option)")).toBeTruthy();
  });

  it("kingdom fields reveal a custom input", async () => {
    render(KingdomFormFields);
    await fireEvent.change(screen.getByLabelText("Polity type"), {
      target: { value: "__custom__" },
    });
    expect(screen.getByLabelText("Polity type (Own option)")).toBeTruthy();
  });

  it("nation fields reveal a custom input", async () => {
    render(NationFormFields);
    await fireEvent.change(screen.getByLabelText("Genre / Setting"), {
      target: { value: "__custom__" },
    });
    expect(screen.getByLabelText("Genre / Setting (Own option)")).toBeTruthy();
  });

  it("social hub fields reveal a custom input", async () => {
    render(SocialHubFormFields);
    await fireEvent.change(screen.getByLabelText("Venue type"), {
      target: { value: "__custom__" },
    });
    expect(screen.getByLabelText("Venue type (Own option)")).toBeTruthy();
  });

  it("tavern fields reveal a custom input", async () => {
    render(TavernFormFields);
    await fireEvent.change(screen.getByLabelText("Tavern type"), {
      target: { value: "__custom__" },
    });
    expect(screen.getByLabelText("Tavern type (Own option)")).toBeTruthy();
  });

  it("vampire fields reveal a custom input", async () => {
    render(VampireFormFields);
    await fireEvent.change(screen.getByLabelText("Choose their bloodline"), {
      target: { value: "__custom__" },
    });
    expect(screen.getByLabelText("Choose their bloodline (Own option)")).toBeTruthy();
  });

  it("pantheon fields reveal a custom input", async () => {
    render(PantheonFormFields);
    await fireEvent.change(screen.getByLabelText("Primary Domain"), {
      target: { value: "__custom__" },
    });
    expect(screen.getByLabelText("Primary Domain (Own option)")).toBeTruthy();
  });

  it("name fields reveal a custom input", async () => {
    render(NameFormFields);
    await fireEvent.change(screen.getByLabelText("Culture / Style"), {
      target: { value: "__custom__" },
    });
    expect(screen.getByLabelText("Culture / Style (Own option)")).toBeTruthy();
  });
});

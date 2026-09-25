/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { createEmptySessionPrep, type SessionPrep } from "generator-engine";
import SessionPrepBuilderForm from "./SessionPrepBuilderForm.svelte";

vi.mock("$lib/services/seo/session-prep-service", () => ({
  SESSION_PREP_SEED_MAX_LENGTH: 2000,
}));

function makeService(overrides: Record<string, unknown> = {}) {
  return {
    draft: vi.fn(),
    suggest: vi.fn(),
    suggestRoutes: vi.fn(),
    ...overrides,
  };
}

function renderForm(
  prep: SessionPrep,
  service = makeService(),
  props: { online?: boolean; disabled?: boolean } = {},
) {
  // Reactive like the page's `$state` prep, so in-place list edits re-render.
  const reactivePrep = $state(prep);
  render(SessionPrepBuilderForm, {
    props: { prep: reactivePrep, service: service as never, ...props },
  });
  return service;
}

function seeded(): SessionPrep {
  const prep = createEmptySessionPrep("A courier vanished on the road.");
  prep.start = "A riderless horse at the gate.";
  return prep;
}

describe("SessionPrepBuilderForm drafting", () => {
  it("drafts empty steps with AI and shows the drafted material as AI", async () => {
    const service = makeService({
      draft: vi.fn(async (prep: SessionPrep) => ({
        ...prep,
        pressure: "The judge arrives in two days.",
        people: [
          {
            id: "p1",
            name: "Reeve Callan",
            wants: "the ledger burned",
            doesNext: "sends men",
            source: "ai",
          },
        ],
      })),
    });
    renderForm(seeded(), service);

    expect(screen.getByText(/7 of 8 steps are empty/)).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("button", { name: /Draft empty steps/ }),
    );

    await waitFor(() =>
      expect(
        (screen.getByLabelText("Tonight's pressure") as HTMLTextAreaElement)
          .value,
      ).toBe("The judge arrives in two days."),
    );
    expect(service.draft.mock.calls[0][0].start).toBe(
      "A riderless horse at the gate.",
    );
    expect(
      (screen.getByLabelText("Where play begins") as HTMLTextAreaElement).value,
    ).toBe("A riderless horse at the gate.");
    expect(screen.getByDisplayValue("Reeve Callan")).toBeTruthy();
    expect(
      screen.getByTitle("Drafted by AI. Edit it to make it yours."),
    ).toBeTruthy();
  });

  it("shows the AI error and keeps the GM's fields editable", async () => {
    const service = makeService({
      draft: vi.fn(async () => {
        throw new Error("The AI response was incomplete. Please try again.");
      }),
    });
    renderForm(seeded(), service);

    await fireEvent.click(
      screen.getByRole("button", { name: /Draft empty steps/ }),
    );

    expect((await screen.findByRole("alert")).textContent).toContain(
      "The AI response was incomplete",
    );
    const start = screen.getByLabelText(
      "Where play begins",
    ) as HTMLTextAreaElement;
    expect(start.disabled).toBe(false);
    expect(start.value).toBe("A riderless horse at the gate.");
  });

  it("disables AI actions offline but keeps the steps usable", () => {
    renderForm(seeded(), makeService(), { online: false });
    expect(
      (
        screen.getByRole("button", {
          name: /Draft empty steps/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: "Suggest options for People with AI",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      (screen.getByLabelText("Tonight's pressure") as HTMLTextAreaElement)
        .disabled,
    ).toBe(false);
    expect(screen.getByText(/You are offline/)).toBeTruthy();
  });
});

describe("SessionPrepBuilderForm manual editing", () => {
  it("adds and removes a person the GM writes", async () => {
    renderForm(seeded());
    await fireEvent.click(screen.getByRole("button", { name: /Add person/ }));
    const name = screen.getByLabelText("Name") as HTMLInputElement;
    await fireEvent.input(name, { target: { value: "Keeper Orla" } });
    expect(screen.getByDisplayValue("Keeper Orla")).toBeTruthy();
    expect(
      screen.queryByTitle("Drafted by AI. Edit it to make it yours."),
    ).toBeNull();

    await fireEvent.click(
      screen.getByRole("button", { name: "Remove person" }),
    );
    expect(screen.queryByDisplayValue("Keeper Orla")).toBeNull();
  });
});

describe("SessionPrepBuilderForm suggestions", () => {
  it("adds only the option the GM picks", async () => {
    const service = makeService({
      suggest: vi.fn(async () => ({
        step: "people",
        options: [
          { name: "Maren", wants: "her brother found", doesNext: "goes alone" },
          { name: "Old Tebb", wants: "paying", doesNext: "sells the secret" },
        ],
      })),
    });
    renderForm(seeded(), service);

    await fireEvent.click(
      screen.getByRole("button", {
        name: "Suggest options for People with AI",
      }),
    );
    await screen.findByText(/Maren, wants her brother found/);
    expect(screen.queryByDisplayValue("Maren")).toBeNull();

    await fireEvent.click(screen.getAllByRole("button", { name: "Add" })[0]);

    expect(screen.getByDisplayValue("Maren")).toBeTruthy();
    expect(screen.queryByDisplayValue("Old Tebb")).toBeNull();
    expect(screen.queryByText(/Maren, wants her brother found/)).toBeNull();
    expect(screen.getByText(/Old Tebb, wants paying/)).toBeTruthy();
  });
});

describe("SessionPrepBuilderForm concurrency", () => {
  it("locks suggestion choices while another AI request is running", async () => {
    let finishDraft: (prep: SessionPrep) => void = () => {};
    const service = makeService({
      suggest: vi.fn(async () => ({
        step: "people",
        options: [{ name: "Maren", wants: "", doesNext: "" }],
      })),
      draft: vi.fn(
        () =>
          new Promise<SessionPrep>((resolve) => {
            finishDraft = resolve;
          }),
      ),
    });
    renderForm(seeded(), service);

    await fireEvent.click(
      screen.getByRole("button", {
        name: "Suggest options for People with AI",
      }),
    );
    const add = (await screen.findByRole("button", {
      name: "Add",
    })) as HTMLButtonElement;
    expect(add.disabled).toBe(false);

    await fireEvent.click(
      screen.getByRole("button", { name: /Draft empty steps/ }),
    );
    expect(add.disabled).toBe(true);
    await fireEvent.click(add);
    expect(screen.queryByDisplayValue("Maren")).toBeNull();

    finishDraft(seeded());
    await waitFor(() => expect(add.disabled).toBe(false));
  });
});

describe("SessionPrepBuilderForm clue routes", () => {
  it("flags a needed fact with one route and adds AI routes on request", async () => {
    const prep = seeded();
    prep.information = [
      {
        id: "c1",
        fact: "Callan ordered the ambush",
        routes: ["The signet"],
        critical: true,
        source: "gm",
      },
    ];
    const service = makeService({
      suggestRoutes: vi.fn(async (current: SessionPrep) => ({
        ...current,
        information: [
          {
            ...current.information[0],
            routes: ["The signet", "Dosh admits it"],
          },
        ],
      })),
    });
    renderForm(prep, service);

    expect(screen.getByText(/has only one way to be found/)).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("button", { name: /Suggest more ways/ }),
    );

    await waitFor(() =>
      expect(screen.queryByText(/has only one way to be found/)).toBeNull(),
    );
    expect(service.suggestRoutes).toHaveBeenCalledWith(
      expect.objectContaining({ seed: prep.seed }),
      "c1",
    );
  });

  it("does not flag optional facts", () => {
    const prep = seeded();
    prep.information = [
      {
        id: "c1",
        fact: "The miller keeps bees",
        routes: [],
        critical: false,
        source: "gm",
      },
    ];
    renderForm(prep);
    expect(screen.queryByText(/has only one way to be found/)).toBeNull();
  });
});

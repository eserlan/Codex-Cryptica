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
    draftStep: vi.fn(),
    redraftStep: vi.fn(),
    suggest: vi.fn(),
    suggestRoutes: vi.fn(),
    ...overrides,
  };
}

function renderForm(
  prep: SessionPrep,
  service = makeService(),
  props: {
    online?: boolean;
    disabled?: boolean;
    hasBuilt?: boolean;
    hasUnbuiltChanges?: boolean;
  } = {},
) {
  // Reactive like the page's `$state` prep, so in-place list edits re-render.
  const reactivePrep = $state(prep);
  const onBuild = vi.fn();
  render(SessionPrepBuilderForm, {
    props: {
      prep: reactivePrep,
      service: service as never,
      onBuild,
      ...props,
    },
  });
  return { service, onBuild };
}

function seeded(): SessionPrep {
  const prep = createEmptySessionPrep("A courier vanished on the road.");
  prep.start = "A riderless horse at the gate.";
  return prep;
}

const button = (name: string | RegExp) =>
  screen.getByRole("button", { name }) as HTMLButtonElement;

const PROPOSE_TOGGLE = /Next asks AI to propose an answer/;

/** Most tests step through by hand, so Next must not call AI. */
async function turnOffProposals() {
  const toggle = screen.queryByLabelText(PROPOSE_TOGGLE) as HTMLInputElement;
  if (toggle?.checked) await fireEvent.click(toggle);
}

/** Opens a question from its collapsed row in the column. */
async function goToQuestion(label: string) {
  await turnOffProposals();
  const row = screen.queryByRole("button", {
    name: new RegExp(`^\\d+\\. ${label}\\b`),
  });
  if (row) await fireEvent.click(row);
}

describe("SessionPrepBuilderForm questions", () => {
  it("opens one question at a time in a single column and moves back and forth", async () => {
    renderForm(createEmptySessionPrep());

    expect(screen.getByText("0 of 9 answered")).toBeTruthy();
    // Every other question waits as a collapsed row.
    expect(button(/^8\. Reserve/)).toBeTruthy();
    expect(
      screen.getByRole("textbox", { name: "What is tonight about?" }),
    ).toBeTruthy();
    expect(button("Back").disabled).toBe(true);
    expect(button("Skip")).toBeTruthy();

    await fireEvent.input(
      screen.getByRole("textbox", { name: "What is tonight about?" }),
      {
        target: { value: "A courier vanished." },
      },
    );
    await turnOffProposals();
    await fireEvent.click(button("Next"));

    expect(screen.getByText("1 of 9 answered")).toBeTruthy();
    expect(screen.getByLabelText("Where play begins")).toBeTruthy();
    // The answered hook stays in the column as a row showing the answer.
    expect(button(/^Hook A courier vanished\./)).toBeTruthy();
    expect(
      screen.queryByRole("textbox", { name: "What is tonight about?" }),
    ).toBeNull();

    await fireEvent.click(button("Back"));
    expect(
      (
        screen.getByRole("textbox", {
          name: "What is tonight about?",
        }) as HTMLTextAreaElement
      ).value,
    ).toBe("A courier vanished.");
  });

  it("answers the current question with AI and keeps the answer editable", async () => {
    const service = makeService({
      draftStep: vi.fn(async (prep: SessionPrep) => ({
        ...prep,
        pressure: "The judge arrives in two days.",
      })),
    });
    renderForm(seeded(), service);
    await goToQuestion("Pressure");

    await fireEvent.click(button("Answer Pressure with AI"));

    const pressure = (await screen.findByLabelText(
      "Tonight's pressure",
    )) as HTMLTextAreaElement;
    await waitFor(() =>
      expect(pressure.value).toBe("The judge arrives in two days."),
    );
    expect(service.draftStep).toHaveBeenCalledWith(
      expect.objectContaining({ start: "A riderless horse at the gate." }),
      "pressure",
      expect.objectContaining({ direction: undefined }),
    );
    expect(pressure.disabled).toBe(false);
    // A filled question offers more ideas instead of answering again.
    expect(button("Suggest more ideas for Pressure with AI")).toBeTruthy();
    expect(button("Next")).toBeTruthy();
  });

  it("sends the GM's guidance with the AI answer, and Enter asks too", async () => {
    const service = makeService({
      draftStep: vi.fn(async (prep: SessionPrep) => ({
        ...prep,
        people: [
          { id: "p1", name: "Vessa", wants: "", doesNext: "", source: "ai" },
        ],
      })),
      suggest: vi.fn(async () => ({ step: "people", options: [] })),
    });
    renderForm(seeded(), service);
    await goToQuestion("People");

    const guide = screen.getByLabelText("Guide the AI for People");
    await fireEvent.input(guide, { target: { value: "a rival adventurer" } });
    await fireEvent.click(button("Answer People with AI"));

    await screen.findByDisplayValue("Vessa");
    expect(service.draftStep).toHaveBeenCalledWith(
      expect.anything(),
      "people",
      expect.objectContaining({ direction: "a rival adventurer" }),
    );

    // The step is filled now, so Enter in the guide asks for more ideas.
    await fireEvent.keyDown(guide, { key: "Enter" });
    expect(service.suggest).toHaveBeenCalledWith(
      expect.anything(),
      "people",
      expect.objectContaining({ direction: "a rival adventurer" }),
    );
  });

  it("does not call AI from the guide field while offline", async () => {
    const service = makeService();
    renderForm(seeded(), service, { online: false });
    await goToQuestion("Pressure");

    await fireEvent.keyDown(
      screen.getByLabelText("Guide the AI for Pressure"),
      {
        key: "Enter",
      },
    );
    expect(service.draftStep).not.toHaveBeenCalled();
  });

  it("shows an AI error on the question and keeps the GM's answers", async () => {
    const service = makeService({
      draftStep: vi.fn(async () => {
        throw new Error("The AI response was incomplete. Please try again.");
      }),
    });
    renderForm(seeded(), service);
    await goToQuestion("Pressure");

    await fireEvent.click(button("Answer Pressure with AI"));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "The AI response was incomplete",
    );
    expect(
      (screen.getByLabelText("Tonight's pressure") as HTMLTextAreaElement)
        .disabled,
    ).toBe(false);
  });

  it("jumps to any question from its row", async () => {
    renderForm(seeded());
    await goToQuestion("Reserve");
    expect(
      screen.getByText("What do you want in your back pocket?"),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
    await goToQuestion("Start");
    expect(
      (screen.getByLabelText("Where play begins") as HTMLTextAreaElement).value,
    ).toBe("A riderless horse at the gate.");
  });

  it("builds without AI filling the gaps, then offers an update", async () => {
    const { onBuild } = renderForm(seeded());
    await fireEvent.click(button(/Build my run sheet/));
    expect(onBuild).toHaveBeenCalledWith(
      expect.objectContaining({ fillEmpty: false }),
    );
  });

  it("lets AI answer every remaining question and build", async () => {
    const { onBuild } = renderForm(seeded());

    expect(screen.getByText(/7 of 8 questions are unanswered/)).toBeTruthy();
    await fireEvent.click(button(/Answer the rest with AI/));
    expect(onBuild).toHaveBeenCalledWith(
      expect.objectContaining({ fillEmpty: true }),
    );
  });

  it("offers AI answers only once there is a hook", () => {
    renderForm(createEmptySessionPrep());
    expect(
      screen.queryByRole("button", { name: /Answer the rest/ }),
    ).toBeNull();
  });

  it("disables AI actions offline but keeps the questions usable", async () => {
    renderForm(seeded(), makeService(), { online: false });
    expect(
      screen.queryByRole("button", { name: /Answer the rest/ }),
    ).toBeNull();
    expect(screen.getByText(/You are offline/)).toBeTruthy();

    await goToQuestion("Pressure");
    expect(button("Answer Pressure with AI").disabled).toBe(true);
    expect(
      (screen.getByLabelText("Tonight's pressure") as HTMLTextAreaElement)
        .disabled,
    ).toBe(false);
  });

  it("adds and removes a person the GM writes", async () => {
    renderForm(seeded());
    await goToQuestion("People");
    await fireEvent.click(button(/Add person/));
    const name = screen.getByLabelText("Name") as HTMLInputElement;
    await fireEvent.input(name, { target: { value: "Keeper Orla" } });
    expect(screen.getByDisplayValue("Keeper Orla")).toBeTruthy();
    expect(
      screen.queryByTitle("Drafted by AI. Edit it to make it yours."),
    ).toBeNull();

    await fireEvent.click(button("Remove person"));
    expect(screen.queryByDisplayValue("Keeper Orla")).toBeNull();
  });
});

describe("SessionPrepBuilderForm proposals on Next", () => {
  it("asks AI to propose an answer to the next question once this one is answered", async () => {
    const service = makeService({
      draftStep: vi.fn(async (prep: SessionPrep) => ({
        ...prep,
        pressure: "The judge arrives in two days.",
      })),
    });
    renderForm(seeded(), service);

    // The hook is answered; the opening is already filled, so no AI yet.
    await fireEvent.click(button("Next"));
    expect(screen.getByText("Where does play begin?")).toBeTruthy();
    expect(service.draftStep).not.toHaveBeenCalled();

    await fireEvent.click(button("Next"));
    expect(screen.getByText("What is moving tonight?")).toBeTruthy();
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Tonight's pressure") as HTMLTextAreaElement)
          .value,
      ).toBe("The judge arrives in two days."),
    );
    expect(service.draftStep).toHaveBeenCalledWith(
      expect.objectContaining({ start: "A riderless horse at the gate." }),
      "pressure",
      expect.objectContaining({ direction: undefined }),
    );
    // A proposal can be redrafted from the wizard.
    expect(button("Redraft Pressure with AI")).toBeTruthy();
  });

  it("does not propose when the question is skipped or proposals are off", async () => {
    const service = makeService();
    renderForm(seeded(), service);
    await fireEvent.click(button("Next")); // hook -> start (already filled)
    await turnOffProposals();
    await fireEvent.click(button("Next")); // start -> pressure, proposals off
    await fireEvent.click(button("Skip")); // pressure empty -> people
    expect(screen.getByText("Who matters tonight?")).toBeTruthy();
    expect(service.draftStep).not.toHaveBeenCalled();
  });

  it("keeps moving and shows the error when a proposal fails", async () => {
    const service = makeService({
      draftStep: vi.fn(async () => {
        throw new Error("Network down");
      }),
    });
    renderForm(seeded(), service);
    await fireEvent.click(button("Next"));
    await fireEvent.click(button("Next"));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Network down",
    );
    expect(screen.getByText("What is moving tonight?")).toBeTruthy();
    expect(
      (screen.getByLabelText("Tonight's pressure") as HTMLTextAreaElement)
        .disabled,
    ).toBe(false);
  });

  it("hides the proposal toggle offline", () => {
    renderForm(seeded(), makeService(), { online: false });
    expect(screen.queryByLabelText(PROPOSE_TOGGLE)).toBeNull();
  });
});

describe("SessionPrepBuilderForm suggestions", () => {
  it("adds only the option the GM picks", async () => {
    const prep = seeded();
    prep.people = [
      { id: "p0", name: "Reeve Callan", wants: "", doesNext: "", source: "gm" },
    ];
    const service = makeService({
      suggest: vi.fn(async () => ({
        step: "people",
        options: [
          { name: "Maren", wants: "her brother found", doesNext: "goes alone" },
          { name: "Old Tebb", wants: "paying", doesNext: "sells the secret" },
        ],
      })),
    });
    renderForm(prep, service);
    await goToQuestion("People");

    await fireEvent.click(button("Suggest more ideas for People with AI"));
    await screen.findByText(/Maren, wants her brother found/);
    expect(screen.queryByDisplayValue("Maren")).toBeNull();

    await fireEvent.click(screen.getAllByRole("button", { name: "Add" })[0]);

    expect(screen.getByDisplayValue("Maren")).toBeTruthy();
    expect(screen.queryByDisplayValue("Old Tebb")).toBeNull();
    expect(screen.getByText(/Old Tebb, wants paying/)).toBeTruthy();
  });

  it("locks suggestion choices while another AI request is running", async () => {
    let finishRoutes: (prep: SessionPrep) => void = () => {};
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
      suggest: vi.fn(async () => ({
        step: "information",
        options: [{ fact: "The mill is empty", routes: [], critical: false }],
      })),
      suggestRoutes: vi.fn(
        () =>
          new Promise<SessionPrep>((resolve) => {
            finishRoutes = resolve;
          }),
      ),
    });
    renderForm(prep, service);
    await goToQuestion("Information");

    await fireEvent.click(button("Suggest more ideas for Information with AI"));
    const add = (await screen.findByRole("button", {
      name: "Add",
    })) as HTMLButtonElement;
    expect(add.disabled).toBe(false);

    await fireEvent.click(button(/Suggest more ways/));
    expect(add.disabled).toBe(true);
    expect(button("Next").disabled).toBe(true);

    finishRoutes(prep);
    await waitFor(() => expect(add.disabled).toBe(false));
  });
});

describe("SessionPrepBuilderForm turned-down ideas", () => {
  function peopleSuggestion() {
    return {
      step: "people",
      options: [
        { name: "Maren", wants: "her brother found", doesNext: "goes alone" },
        { name: "Old Tebb", wants: "paying", doesNext: "sells the secret" },
      ],
    };
  }

  function lastGuidance(mock: ReturnType<typeof vi.fn>) {
    return mock.mock.calls.at(-1)![2].guidance;
  }

  it("remembers dismissed suggestions and sends them with the next request", async () => {
    const prep = seeded();
    prep.people = [
      { id: "p0", name: "Callan", wants: "", doesNext: "", source: "gm" },
    ];
    const service = makeService({
      suggest: vi.fn(async () => peopleSuggestion()),
    });
    const { onBuild } = renderForm(prep, service);
    await goToQuestion("People");

    await fireEvent.click(button("Suggest more ideas for People with AI"));
    await screen.findByText(/Maren, wants her brother found/);
    expect(lastGuidance(service.suggest).turnedDown).toEqual([]);

    await fireEvent.click(button("Dismiss these suggestions"));
    expect(
      screen.getByText(/AI will avoid 2 ideas you turned down/),
    ).toBeTruthy();

    await fireEvent.click(button("Suggest more ideas for People with AI"));
    await waitFor(() => expect(service.suggest).toHaveBeenCalledTimes(2));
    expect(lastGuidance(service.suggest).turnedDown).toEqual([
      expect.objectContaining({
        step: "people",
        text: expect.stringContaining("Maren"),
      }),
      expect.objectContaining({
        step: "people",
        text: expect.stringContaining("Old Tebb"),
      }),
    ]);

    // Building passes the same guidance on for "Answer the rest with AI".
    await fireEvent.click(button(/Build my run sheet/));
    expect(onBuild.mock.calls[0][0].guidance.turnedDown).toHaveLength(2);
  });

  it("remembers what a redraft replaced, and swaps it when the redraft is undone", async () => {
    const service = makeService({
      redraftStep: vi.fn(async (prep: SessionPrep) => ({
        ...prep,
        start: "Smoke rises over the mill.",
      })),
      suggest: vi.fn(async () => ({ step: "start", options: [] })),
    });
    renderForm(seeded(), service);
    await goToQuestion("Start");

    await fireEvent.click(button("Redraft Start with AI"));
    await screen.findByDisplayValue("Smoke rises over the mill.");
    await fireEvent.click(button("Suggest more ideas for Start with AI"));
    await waitFor(() => expect(service.suggest).toHaveBeenCalled());
    expect(lastGuidance(service.suggest).turnedDown).toEqual([
      { step: "start", text: "A riderless horse at the gate." },
    ]);

    await fireEvent.click(button(/Undo redraft/));
    await fireEvent.click(button("Suggest more ideas for Start with AI"));
    await waitFor(() => expect(service.suggest).toHaveBeenCalledTimes(2));
    expect(lastGuidance(service.suggest).turnedDown).toEqual([
      { step: "start", text: "Smoke rises over the mill." },
    ]);
  });

  it("sends notes from other steps and can forget turned-down ideas", async () => {
    const prep = seeded();
    prep.people = [
      { id: "p0", name: "Callan", wants: "", doesNext: "", source: "gm" },
    ];
    const service = makeService({
      suggest: vi.fn(async () => peopleSuggestion()),
    });
    renderForm(prep, service);
    await goToQuestion("Start");
    await fireEvent.input(screen.getByLabelText("Guide the AI for Start"), {
      target: { value: "grim and rainy" },
    });
    await goToQuestion("People");
    await fireEvent.click(button("Suggest more ideas for People with AI"));
    await screen.findByText(/Maren/);
    expect(lastGuidance(service.suggest).steers).toEqual({
      start: "grim and rainy",
    });

    await fireEvent.click(button("Dismiss these suggestions"));
    await fireEvent.click(button("Forget them"));
    expect(screen.queryByText(/AI will avoid/)).toBeNull();
    await fireEvent.click(button("Suggest more ideas for People with AI"));
    await waitFor(() => expect(service.suggest).toHaveBeenCalledTimes(2));
    expect(lastGuidance(service.suggest).turnedDown).toEqual([]);
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
    await goToQuestion("Information");

    expect(screen.getByText(/has only one way to be found/)).toBeTruthy();
    await fireEvent.click(button(/Suggest more ways/));

    await waitFor(() =>
      expect(screen.queryByText(/has only one way to be found/)).toBeNull(),
    );
    expect(service.suggestRoutes).toHaveBeenCalledWith(
      expect.objectContaining({ seed: prep.seed }),
      "c1",
      expect.objectContaining({ guidance: expect.any(Object) }),
    );
  });

  it("does not flag optional facts", async () => {
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
    renderForm(prep, makeService());
    await goToQuestion("Information");
    expect(screen.queryByText(/has only one way to be found/)).toBeNull();
  });
});

describe("SessionPrepBuilderForm after a build", () => {
  it("shows answers in their rows and rebuilds on request", async () => {
    const { onBuild } = renderForm(seeded(), makeService(), {
      hasBuilt: true,
    });

    expect(button(/^1\. Start A riderless horse at the gate\./)).toBeTruthy();
    expect(button(/^2\. Pressure What is moving tonight\?/)).toBeTruthy();

    await fireEvent.click(button(/Update run sheet/));
    expect(onBuild).toHaveBeenCalledWith(
      expect.objectContaining({ fillEmpty: false }),
    );
  });

  it("redrafts a question with AI and can undo it", async () => {
    const service = makeService({
      redraftStep: vi.fn(async (prep: SessionPrep) => ({
        ...prep,
        start: "Smoke rises over the mill.",
      })),
    });
    renderForm(seeded(), service);
    await goToQuestion("Start");

    await fireEvent.click(button("Redraft Start with AI"));
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Where play begins") as HTMLTextAreaElement)
          .value,
      ).toBe("Smoke rises over the mill."),
    );
    expect(service.redraftStep).toHaveBeenCalledWith(
      expect.objectContaining({ start: "A riderless horse at the gate." }),
      "start",
      expect.objectContaining({ direction: undefined }),
    );

    await fireEvent.click(button(/Undo redraft/));
    expect(
      (screen.getByLabelText("Where play begins") as HTMLTextAreaElement).value,
    ).toBe("A riderless horse at the gate.");
    expect(screen.queryByRole("button", { name: /Undo redraft/ })).toBeNull();
  });

  it("redrafts a question with the GM's guidance", async () => {
    const service = makeService({
      redraftStep: vi.fn(async (prep: SessionPrep) => prep),
    });
    renderForm(seeded(), service);
    await goToQuestion("Start");

    await fireEvent.input(screen.getByLabelText("Guide the AI for Start"), {
      target: { value: "open mid-chase" },
    });
    await fireEvent.click(button("Redraft Start with AI"));
    await waitFor(() =>
      expect(service.redraftStep).toHaveBeenCalledWith(
        expect.anything(),
        "start",
        expect.objectContaining({ direction: "open mid-chase" }),
      ),
    );
  });

  it("keeps the answer when a redraft fails", async () => {
    const service = makeService({
      redraftStep: vi.fn(async () => {
        throw new Error("Network down");
      }),
    });
    renderForm(seeded(), service);
    await goToQuestion("Start");

    await fireEvent.click(button("Redraft Start with AI"));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Network down",
    );
    expect(
      (screen.getByLabelText("Where play begins") as HTMLTextAreaElement).value,
    ).toBe("A riderless horse at the gate.");
    expect(screen.queryByRole("button", { name: /Undo redraft/ })).toBeNull();
  });

  it("warns when edits are not in the run sheet yet", () => {
    renderForm(seeded(), makeService(), {
      hasBuilt: true,
      hasUnbuiltChanges: true,
    });
    expect(screen.getByText(/not in the run sheet yet/)).toBeTruthy();
  });
});

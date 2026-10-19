import { describe, expect, it, vi } from "vitest";
import {
  FeedbackDialogStore,
  type FeedbackDialogDeps,
} from "./feedback-dialog.svelte";
import { FeedbackSubmitError } from "../../services/feedback/FeedbackReportService";

type Submit = FeedbackDialogDeps["service"]["submitReport"];

function setup(over: Partial<FeedbackDialogDeps> & { submit?: Submit } = {}) {
  const submit = vi.fn<Submit>(
    over.submit ?? (async () => ({ reference: "CC-7F3K-9Q2M" })),
  );
  const sleep = vi.fn(async () => {});
  let uuidCount = 0;
  const context = {
    pathname: "/map",
    surface: "app" as const,
    vttActive: true,
    screenWidth: 390,
    navigator: { userAgent: "Mozilla/5.0 Firefox/128.0" },
  };
  const store = new FeedbackDialogStore({
    service: { submitReport: submit },
    appVersion: "0.36.0",
    uuid: () => `uuid-${++uuidCount}`,
    isOnline: over.isOnline ?? (() => true),
    sleep,
    context: () => context,
    ...over,
  });
  return { store, submit, sleep };
}

describe("open and close", () => {
  it("opens a fresh draft with its own submission id and sends nothing", () => {
    const { store, submit } = setup();
    store.open();
    expect(store.isOpen).toBe(true);
    expect(store.draft.submissionId).toBe("uuid-1");
    expect(store.status).toBe("editing");
    expect(submit).not.toHaveBeenCalled();
  });

  it("closing sends nothing and keeps the text for reopening", () => {
    const { store, submit } = setup();
    store.open();
    store.setDescription("Half-written thought");
    store.close();
    expect(store.isOpen).toBe(false);
    expect(store.draft.description).toBe("Half-written thought");
    expect(submit).not.toHaveBeenCalled();
  });

  it("prefills kind, description and area from the caller and keeps them editable", async () => {
    const { store, submit } = setup();
    store.open({
      kind: "idea",
      description: "Dark mode for maps",
      area: "map",
    });
    expect(store.draft.kind).toBe("idea");
    expect(store.draft.description).toBe("Dark mode for maps");
    store.setKind("problem");
    await store.submit();
    expect(submit.mock.calls[0]![0].kind).toBe("problem");
  });

  it("derives the area from the page, never from its address", async () => {
    const { store, submit } = setup({
      context: () => ({
        pathname: "/vault/secret-id?q=x#frag",
        surface: "app" as const,
        screenWidth: 900,
        navigator: {},
      }),
    });
    store.open();
    store.setDescription("Bug");
    await store.submit();
    const sent = JSON.stringify(submit.mock.calls[0]![0]);
    expect(sent).toContain('"area":"other"');
    expect(sent).not.toContain("secret-id");
    expect(sent).not.toContain("frag");
  });
});

describe("submitting", () => {
  it("sends the disclosed fields only and records the reference", async () => {
    const { store, submit } = setup();
    store.open();
    store.setDescription("The tracker stayed empty.");
    store.setContactEmail("gm@example.com");
    await store.submit();

    expect(submit).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(JSON.stringify(submit.mock.calls[0]![0]));
    expect(Object.keys(sent).sort()).toEqual(
      [
        "contactEmail",
        "description",
        "kind",
        "meta",
        "schemaVersion",
        "submissionId",
      ].sort(),
    );
    expect(Object.keys(sent.meta).sort()).toEqual([
      "appVersion",
      "area",
      "browser",
      "screen",
    ]);
    expect(sent.meta).toEqual({
      appVersion: "0.36.0",
      area: "tabletop",
      browser: "firefox",
      screen: "narrow",
    });
    expect(store.status).toBe("sent");
    expect(store.reference).toBe("CC-7F3K-9Q2M");
  });

  it("sends no contact email when the field is empty", async () => {
    const { store, submit } = setup();
    store.open();
    store.setDescription("Bug");
    store.setContactEmail("   ");
    await store.submit();
    expect(submit.mock.calls[0]![0].contactEmail).toBeUndefined();
  });

  it("does not send an empty description", async () => {
    const { store, submit } = setup();
    store.open();
    await store.submit();
    expect(submit).not.toHaveBeenCalled();
    expect(store.failure).toBe("invalid");
  });

  it("ignores a second submit while the first is sending", async () => {
    let finish: (value: { reference: string }) => void = () => {};
    const { store, submit } = setup({
      submit: () => new Promise((resolve) => (finish = resolve)),
    });
    store.open();
    store.setDescription("Bug");
    const first = store.submit();
    const second = store.submit();
    expect(store.status).toBe("sending");
    finish({ reference: "CC-7F3K-9Q2M" });
    await Promise.all([first, second]);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("never reports success without a reference", async () => {
    const { store } = setup({ submit: async () => ({ reference: "" }) });
    store.open();
    store.setDescription("Bug");
    await store.submit();
    expect(store.status).not.toBe("sent");
  });
});

describe("failures keep the text", () => {
  it("does not call the service while offline", async () => {
    const { store, submit } = setup({ isOnline: () => false });
    store.open();
    store.setDescription("Written on the train");
    await store.submit();
    expect(submit).not.toHaveBeenCalled();
    expect(store.status).toBe("failed");
    expect(store.failure).toBe("offline");
    expect(store.draft.description).toBe("Written on the train");
  });

  it("maps a network failure to offline", async () => {
    const { store } = setup({
      submit: async () => {
        throw new FeedbackSubmitError("offline");
      },
    });
    store.open();
    store.setDescription("Bug");
    await store.submit();
    expect(store.failure).toBe("offline");
  });

  it("keeps the retry wait for a rate limit", async () => {
    const { store } = setup({
      submit: async () => {
        throw new FeedbackSubmitError("rate_limited", 60);
      },
    });
    store.open();
    store.setDescription("Bug");
    await store.submit();
    expect(store.failure).toBe("rate_limited");
    expect(store.retryAfterSeconds).toBe(60);
    expect(store.draft.description).toBe("Bug");
  });

  it("maps a server problem to unavailable", async () => {
    const { store } = setup({
      submit: async () => {
        throw new FeedbackSubmitError("unavailable");
      },
    });
    store.open();
    store.setDescription("Bug");
    await store.submit();
    expect(store.failure).toBe("unavailable");
    expect(store.status).toBe("failed");
  });

  it("waits and retries an in_progress answer up to three times", async () => {
    let calls = 0;
    const { store, sleep } = setup({
      submit: async () => {
        calls++;
        if (calls < 3) throw new FeedbackSubmitError("in_progress");
        return { reference: "CC-7F3K-9Q2M" };
      },
    });
    store.open();
    store.setDescription("Bug");
    await store.submit();
    expect(calls).toBe(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(store.status).toBe("sent");
  });

  it("gives up as unavailable when in_progress persists", async () => {
    const { store, submit } = setup({
      submit: async () => {
        throw new FeedbackSubmitError("in_progress");
      },
    });
    store.open();
    store.setDescription("Bug");
    await store.submit();
    expect(submit).toHaveBeenCalledTimes(4);
    expect(store.failure).toBe("unavailable");
  });

  it("retries with the same submission id, so one report is never filed twice", async () => {
    let calls = 0;
    const { store, submit } = setup({
      submit: async () => {
        calls++;
        if (calls === 1) throw new FeedbackSubmitError("unavailable");
        return { reference: "CC-7F3K-9Q2M" };
      },
    });
    store.open();
    store.setDescription("Bug");
    await store.submit();
    await store.retry();
    expect(submit.mock.calls[0]![0].submissionId).toBe(
      submit.mock.calls[1]![0].submissionId,
    );
    expect(store.status).toBe("sent");
  });

  it("keeps the outcome when the dialog is closed and reopened mid-send", async () => {
    let finish: (value: { reference: string }) => void = () => {};
    const { store } = setup({
      submit: () => new Promise((resolve) => (finish = resolve)),
    });
    store.open();
    store.setDescription("Bug");
    const sending = store.submit();
    store.close();
    store.open();
    expect(store.draft.description).toBe("Bug");
    finish({ reference: "CC-7F3K-9Q2M" });
    await sending;
    expect(store.status).toBe("sent");
  });
});

describe("sending another", () => {
  it("starts a fresh draft with a new submission id after success", async () => {
    const { store } = setup();
    store.open();
    store.setDescription("Bug");
    await store.submit();
    store.sendAnother();
    expect(store.status).toBe("editing");
    expect(store.reference).toBeUndefined();
    expect(store.draft.description).toBe("");
    expect(store.draft.submissionId).toBe("uuid-2");
  });
});

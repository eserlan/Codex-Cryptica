/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { FeedbackDialogStore } from "$lib/stores/ui/feedback-dialog.svelte";
import { FeedbackSubmitError } from "$lib/services/feedback/FeedbackReportService";
import FeedbackDialog from "./FeedbackDialog.svelte";

// jsdom has no Web Animations API, which Svelte transitions use on close.
if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = (() => {
    const animation = {
      onfinish: null as null | (() => void),
      cancel() {},
      finished: Promise.resolve(),
    };
    queueMicrotask(() => animation.onfinish?.());
    return animation;
  }) as unknown as Element["animate"];
}

function makeStore(
  submit = vi.fn(async () => ({ reference: "CC-7F3K-9Q2M" })),
) {
  let n = 0;
  return new FeedbackDialogStore({
    service: { submitReport: submit },
    appVersion: "0.36.0",
    uuid: () => `uuid-${++n}`,
    isOnline: () => true,
    sleep: async () => {},
    context: () => ({
      pathname: "/map",
      surface: "app",
      vttActive: true,
      screenWidth: 390,
      navigator: { userAgent: "Mozilla/5.0 Firefox/128.0" },
    }),
  });
}

function openDialog(store: FeedbackDialogStore, options = {}) {
  store.open(options);
  return render(FeedbackDialog, { props: { store } });
}

describe("FeedbackDialog", () => {
  it("offers the three kinds, a labelled description and an optional email", () => {
    openDialog(makeStore());
    expect(
      screen.getByRole("radio", { name: "Something isn't working" }),
    ).toBeTruthy();
    expect(screen.getByRole("radio", { name: "I have an idea" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Something else" })).toBeTruthy();
    expect(screen.getByLabelText("Description")).toBeTruthy();
    expect(screen.getByLabelText(/Email \(optional\)/)).toBeTruthy();
  });

  it("asks what the user tried and what happened for a problem, but not for an idea", async () => {
    const store = makeStore();
    openDialog(store);
    expect(
      screen.getByText(/What were you trying to do\? What happened\?/),
    ).toBeTruthy();
    store.setKind("idea");
    await waitFor(() =>
      expect(screen.queryByText(/What were you trying to do/)).toBeNull(),
    );
  });

  it("keeps Send disabled until there is a description", async () => {
    const store = makeStore();
    openDialog(store);
    const send = screen.getByRole("button", {
      name: "Send report",
    }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    store.setDescription("It broke");
    await waitFor(() => expect(send.disabled).toBe(false));
  });

  it("lists exactly what will be sent and where it is stored", () => {
    openDialog(makeStore());
    expect(screen.getByText("App version")).toBeTruthy();
    expect(screen.getByText("0.36.0")).toBeTruthy();
    expect(screen.getByText("Area")).toBeTruthy();
    expect(screen.getByText("tabletop")).toBeTruthy();
    expect(screen.getByText("Browser")).toBeTruthy();
    expect(screen.getByText("firefox")).toBeTruthy();
    expect(screen.getByText("Screen")).toBeTruthy();
    expect(screen.getByText("narrow")).toBeTruthy();
    expect(
      screen.getByText(/stored as a private issue on GitHub/i),
    ).toBeTruthy();
    expect(screen.getByText(/deleted after 180 days/i)).toBeTruthy();
  });

  it("shows the reference after a successful send", async () => {
    const store = makeStore();
    openDialog(store);
    store.setDescription("It broke");
    await fireEvent.click(screen.getByRole("button", { name: "Send report" }));
    await waitFor(() => expect(screen.getByText(/CC-7F3K-9Q2M/)).toBeTruthy());
  });

  it("sends once when Send is pressed twice", async () => {
    const submit = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return { reference: "CC-7F3K-9Q2M" };
    });
    const store = makeStore(submit);
    openDialog(store);
    store.setDescription("It broke");
    const send = screen.getByRole("button", { name: "Send report" });
    await fireEvent.click(send);
    await fireEvent.click(send);
    await waitFor(() => expect(store.status).toBe("sent"));
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("explains an offline failure and keeps the text", async () => {
    const store = makeStore(
      vi.fn(async () => {
        throw new FeedbackSubmitError("offline");
      }),
    );
    openDialog(store);
    store.setDescription("Written on the train");
    await fireEvent.click(screen.getByRole("button", { name: "Send report" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/offline/i);
    expect(
      (screen.getByLabelText("Description") as HTMLTextAreaElement).value,
    ).toBe("Written on the train");
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("shows the sending limit with its wait", async () => {
    const store = makeStore(
      vi.fn(async () => {
        throw new FeedbackSubmitError("rate_limited", 120);
      }),
    );
    openDialog(store);
    store.setDescription("Bug");
    await fireEvent.click(screen.getByRole("button", { name: "Send report" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /try again/i,
    );
  });

  it("offers Discord and GitHub alternatives after a service failure", async () => {
    const store = makeStore(
      vi.fn(async () => {
        throw new FeedbackSubmitError("unavailable");
      }),
    );
    openDialog(store);
    store.setDescription("Bug");
    await fireEvent.click(screen.getByRole("button", { name: "Send report" }));
    await screen.findByRole("alert");
    expect(
      screen.getByRole("link", { name: /Discord/ }).getAttribute("href"),
    ).toContain("discord");
    expect(
      screen.getByRole("link", { name: /GitHub/ }).getAttribute("href"),
    ).toContain("github.com");
  });

  it("closes on Escape without sending", async () => {
    const submit = vi.fn(async () => ({ reference: "CC-7F3K-9Q2M" }));
    const store = makeStore(submit);
    openDialog(store);
    store.setDescription("Bug");
    await fireEvent.keyDown(window, { key: "Escape" });
    expect(store.isOpen).toBe(false);
    expect(submit).not.toHaveBeenCalled();
  });

  it("returns focus to the element that opened it", async () => {
    const opener = document.createElement("button");
    opener.textContent = "Report a problem";
    document.body.appendChild(opener);
    opener.focus();
    const store = makeStore();
    const { unmount } = openDialog(store);
    store.close();
    await waitFor(() => expect(document.activeElement).toBe(opener));
    unmount();
    opener.remove();
  });
});

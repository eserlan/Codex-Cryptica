import {
  browserFamily,
  feedbackAreaFor,
  screenClass,
  type FeedbackArea,
  type FeedbackBrowser,
  type FeedbackKind,
  type FeedbackReportInput,
  type FeedbackScreen,
  type NavigatorLike,
} from "feedback-engine";
import { VERSION } from "$lib/config";
import {
  FeedbackSubmitError,
  feedbackReportService,
  type FeedbackFailureCode,
} from "../../services/feedback/FeedbackReportService";

export type FeedbackStatus = "editing" | "sending" | "sent" | "failed";

/** What the user has written. Held in memory only, never persisted. */
export interface FeedbackDraft {
  submissionId: string;
  kind: FeedbackKind;
  description: string;
  contactEmail: string;
  area: FeedbackArea;
}

export interface FeedbackOpenOptions {
  kind?: FeedbackKind;
  description?: string;
  area?: string;
}

export interface FeedbackPageContext {
  pathname: string;
  surface: "app" | "public";
  vttActive?: boolean;
  screenWidth: number;
  navigator: NavigatorLike;
}

export interface FeedbackDialogDeps {
  service: {
    submitReport: (
      input: FeedbackReportInput,
    ) => Promise<{ reference: string }>;
  };
  appVersion: string;
  uuid: () => string;
  isOnline: () => boolean;
  sleep: (ms: number) => Promise<void>;
  context: () => FeedbackPageContext;
}

/** Retries an in-progress answer this many times, 1.5 seconds apart. */
const IN_PROGRESS_RETRIES = 3;
const IN_PROGRESS_WAIT_MS = 1500;

/**
 * The reusable report dialog's state: open or closed, the draft, and the
 * submission state machine. Nothing is sent until submit() is called, and
 * nothing is persisted.
 */
export class FeedbackDialogStore {
  isOpen = $state(false);
  status = $state<FeedbackStatus>("editing");
  reference = $state<string | undefined>(undefined);
  failure = $state<FeedbackFailureCode | undefined>(undefined);
  retryAfterSeconds = $state<number | undefined>(undefined);
  draft = $state<FeedbackDraft>({
    submissionId: "",
    kind: "problem",
    description: "",
    contactEmail: "",
    area: "other",
  });

  private started = false;
  /** The element that had focus before the dialog opened, to return to on close. */
  private opener: HTMLElement | null = null;

  constructor(private deps: FeedbackDialogDeps) {}

  /** Opens the dialog. Callers may prefill, and the user can edit everything. */
  open(options: FeedbackOpenOptions = {}) {
    if (!this.isOpen) {
      this.opener =
        typeof document === "undefined"
          ? null
          : (document.activeElement as HTMLElement | null);
    }
    if (!this.started || this.status === "sent") {
      this.resetDraft(options);
    } else {
      this.applyPrefill(options);
    }
    this.isOpen = true;
  }

  close() {
    this.isOpen = false;
    const opener = this.opener;
    this.opener = null;
    opener?.focus?.();
  }

  setKind(kind: FeedbackKind) {
    this.draft.kind = kind;
  }

  setDescription(description: string) {
    this.draft.description = description;
  }

  setContactEmail(contactEmail: string) {
    this.draft.contactEmail = contactEmail;
  }

  /** The exact technical details that will be sent, for the disclosure. */
  get disclosed(): {
    appVersion: string;
    area: FeedbackArea;
    browser: FeedbackBrowser;
    screen: FeedbackScreen;
  } {
    const ctx = this.deps.context();
    return {
      appVersion: this.deps.appVersion,
      area: this.draft.area,
      browser: browserFamily(ctx.navigator),
      screen: screenClass(ctx.screenWidth),
    };
  }

  async submit(): Promise<void> {
    if (this.status === "sending" || this.status === "sent") return;
    this.failure = undefined;
    this.retryAfterSeconds = undefined;

    if (this.draft.description.trim() === "") {
      this.fail("invalid");
      return;
    }
    if (!this.deps.isOnline()) {
      this.fail("offline");
      return;
    }

    this.status = "sending";
    try {
      this.reference = await this.sendWithRetries(this.buildInput());
      this.status = "sent";
    } catch (error) {
      this.failWith(error);
    }
  }

  /** Re-sends the same draft with the same submission id, so it is never filed twice. */
  retry(): Promise<void> {
    return this.submit();
  }

  /** Starts a new report after a success, with a fresh submission id. */
  sendAnother() {
    this.resetDraft({});
  }

  /** Sends once, then again while the service says the same report is in progress. */
  private async sendWithRetries(input: FeedbackReportInput): Promise<string> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.sendOnce(input);
      } catch (error) {
        const inProgress =
          error instanceof FeedbackSubmitError && error.code === "in_progress";
        if (!inProgress || attempt >= IN_PROGRESS_RETRIES) throw error;
        await this.deps.sleep(IN_PROGRESS_WAIT_MS);
      }
    }
  }

  private async sendOnce(input: FeedbackReportInput): Promise<string> {
    const receipt = await this.deps.service.submitReport(input);
    if (!receipt.reference) throw new FeedbackSubmitError("unavailable");
    return receipt.reference;
  }

  private failWith(error: unknown) {
    if (!(error instanceof FeedbackSubmitError)) {
      this.fail("unavailable");
      return;
    }
    this.fail(
      error.code === "in_progress" ? "unavailable" : error.code,
      error.retryAfterSeconds,
    );
  }

  private fail(code: FeedbackFailureCode, retryAfterSeconds?: number) {
    this.status = "failed";
    this.failure = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  private resetDraft(options: FeedbackOpenOptions) {
    const ctx = this.deps.context();
    this.started = true;
    this.reference = undefined;
    this.status = "editing";
    this.failure = undefined;
    this.retryAfterSeconds = undefined;
    this.draft = {
      submissionId: this.deps.uuid(),
      kind: options.kind ?? "problem",
      description: options.description ?? "",
      contactEmail: "",
      area: feedbackAreaFor({
        pathname: ctx.pathname,
        surface: ctx.surface,
        vttActive: ctx.vttActive,
        helpArea: options.area,
      }),
    };
  }

  /** Reopening a draft in progress keeps its text; only empty fields take the prefill. */
  private applyPrefill(options: FeedbackOpenOptions) {
    if (options.kind) this.draft.kind = options.kind;
    if (options.description && this.draft.description === "")
      this.draft.description = options.description;
    if (options.area) {
      this.draft.area = feedbackAreaFor({
        pathname: this.deps.context().pathname,
        surface: this.deps.context().surface,
        helpArea: options.area,
      });
    }
  }

  private buildInput(): FeedbackReportInput {
    const email = this.draft.contactEmail.trim();
    return {
      schemaVersion: 1,
      submissionId: this.draft.submissionId,
      kind: this.draft.kind,
      description: this.draft.description,
      contactEmail: email === "" ? undefined : email,
      meta: this.disclosed,
    } as FeedbackReportInput;
  }
}

function pageContext(): FeedbackPageContext {
  const hasWindow = typeof window !== "undefined";
  return {
    pathname: hasWindow ? window.location.pathname : "/",
    surface: "app",
    vttActive: false,
    screenWidth: hasWindow ? window.innerWidth : 1024,
    navigator:
      typeof navigator === "undefined" ? {} : (navigator as NavigatorLike),
  };
}

/** The app-wide dialog, opened from any Help entry point. */
export const feedbackDialog = new FeedbackDialogStore({
  service: feedbackReportService,
  appVersion: VERSION,
  uuid: () => crypto.randomUUID(),
  isOnline: () => (typeof navigator === "undefined" ? true : navigator.onLine),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  context: pageContext,
});

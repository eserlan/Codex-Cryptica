import {
  PerformanceRecorder,
  type PerformanceClock,
  type PerformanceRecorderOptions,
  type PerformanceSampleV1,
  type PerformanceSink,
} from "@codex/performance-observability";

type LongAnimationFrameEntry = PerformanceEntry & {
  startTime: number;
  duration: number;
};

type PerformanceObserverConstructor = new (
  callback: (list: PerformanceObserverEntryList) => void,
) => PerformanceObserver;

export interface BrowserPerformanceCaptureOptions {
  isEnabled?: () => boolean;
  performanceRef?: Performance;
  PerformanceObserver?: PerformanceObserverConstructor;
}

/**
 * Local-only browser capture for the performance harness. It never sends,
 * persists, logs, or enriches samples with browser entry details.
 */
export class BrowserPerformanceCapture implements PerformanceSink {
  private readonly isEnabled: () => boolean;
  private readonly performanceRef: Performance | undefined;
  private readonly PerformanceObserver:
    PerformanceObserverConstructor | undefined;
  private readonly samples: PerformanceSampleV1[] = [];
  private readonly longAnimationFrames: LongAnimationFrameEntry[] = [];
  private observer: PerformanceObserver | undefined;

  readonly recorder: PerformanceRecorder;

  constructor(options: BrowserPerformanceCaptureOptions = {}) {
    this.isEnabled = options.isEnabled ?? (() => false);
    this.performanceRef =
      options.performanceRef ??
      (typeof performance === "undefined" ? undefined : performance);
    this.PerformanceObserver =
      options.PerformanceObserver ??
      (typeof PerformanceObserver === "undefined"
        ? undefined
        : PerformanceObserver);
    const clock: PerformanceClock = {
      now: () => this.performanceRef?.now() ?? Date.now(),
    };
    const recorderOptions: PerformanceRecorderOptions = {
      clock,
      isEnabled: this.isEnabled,
      sink: this,
    };
    this.recorder = new PerformanceRecorder(recorderOptions);
  }

  /** Starts optional Long Animation Frame collection only when capture is enabled. */
  start(): void {
    if (!this.isEnabled() || this.observer || !this.PerformanceObserver) return;

    try {
      this.observer = new this.PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (
            typeof entry.startTime === "number" &&
            typeof entry.duration === "number"
          ) {
            this.longAnimationFrames.push(entry as LongAnimationFrameEntry);
          }
        }
      });
      this.observer.observe({ type: "long-animation-frame", buffered: true });
    } catch {
      // Long Animation Frames are optional and currently unavailable in some browsers.
      this.observer?.disconnect();
      this.observer = undefined;
    }
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = undefined;
  }

  record(sample: PerformanceSampleV1): void {
    this.samples.push(sample);
  }

  getSamples(): readonly PerformanceSampleV1[] {
    return this.samples;
  }

  clear(): void {
    this.samples.length = 0;
    this.longAnimationFrames.length = 0;
  }

  /** Returns aggregate duration only; raw browser entries and script details stay private. */
  longestAnimationFrameSince(startedAt: number): number | undefined {
    let longest = 0;
    for (const entry of this.longAnimationFrames) {
      if (entry.startTime >= startedAt) {
        longest = Math.max(longest, entry.duration);
      }
    }
    return longest > 0 ? longest : undefined;
  }

  now(): number {
    return this.performanceRef?.now() ?? Date.now();
  }
}

type HarnessGlobal = typeof globalThis & {
  __CODEX_PERFORMANCE_CAPTURE__?: boolean;
};

const harnessGlobal = globalThis as HarnessGlobal;

export const browserPerformanceCapture = new BrowserPerformanceCapture({
  isEnabled: () => harnessGlobal.__CODEX_PERFORMANCE_CAPTURE__ === true,
});

export const browserPerformanceRecorder = browserPerformanceCapture.recorder;

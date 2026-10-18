import type { StatBlockReadReason } from "./types";

export const STAT_BLOCK_SOURCE_LIMIT = 12_000;

export class StatBlockSourceEmptyError extends Error {
  constructor() {
    super("Paste a stat block first.");
    this.name = "StatBlockSourceEmptyError";
  }
}

export class StatBlockSourceTooLongError extends Error {
  readonly length: number;
  readonly limit: number;

  constructor(length: number, limit: number) {
    super("Paste just the stat block.");
    this.name = "StatBlockSourceTooLongError";
    this.length = length;
    this.limit = limit;
  }
}

export class StatBlockReadError extends Error {
  readonly reason: StatBlockReadReason;

  constructor(reason: StatBlockReadReason, message?: string) {
    super(message ?? DEFAULT_MESSAGES[reason]);
    this.name = "StatBlockReadError";
    this.reason = reason;
  }
}

const DEFAULT_MESSAGES: Record<StatBlockReadReason, string> = {
  timeout: "The AI took too long to read this stat block.",
  gateway: "The AI could not be reached to read this stat block.",
  malformed: "The AI's reply could not be read as a stat block.",
};

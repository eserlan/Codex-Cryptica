/**
 * Threads: open questions, leads, objectives and mysteries that carry a campaign
 * across sessions (spec 174, US3). Pure rules and the file format; storage is
 * the web app's job. Stored in the vault as `.codex/threads.json`.
 */
import type { IdSource, ClockSource } from "./types";

export const THREAD_KINDS = [
  "question",
  "lead",
  "objective",
  "mystery",
] as const;
export type ThreadKind = (typeof THREAD_KINDS)[number];
export type ThreadStatus = "open" | "closed";

export const THREAD_LIMITS = {
  title: 120,
  note: 500,
  links: 20,
  threads: 200,
} as const;

export interface Thread {
  id: string;
  title: string;
  kind: ThreadKind;
  note: string;
  status: ThreadStatus;
  closingNote: string;
  entityIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ThreadsFile {
  version: 1;
  threads: Thread[];
}

export type ThreadResult =
  { ok: true; thread: Thread } | { ok: false; error: string };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isKind = (v: unknown): v is ThreadKind =>
  typeof v === "string" && (THREAD_KINDS as readonly string[]).includes(v);
const isStatus = (v: unknown): v is ThreadStatus =>
  v === "open" || v === "closed";
const isTime = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v > 0;

function parseThread(raw: unknown): Thread | null {
  if (!isRecord(raw)) return null;
  const {
    id,
    title,
    kind,
    note,
    status,
    closingNote,
    entityIds,
    createdAt,
    updatedAt,
  } = raw;
  if (typeof id !== "string" || id.length === 0) return null;
  if (typeof title !== "string") return null;
  const cleanTitle = title.trim();
  if (cleanTitle.length === 0 || cleanTitle.length > THREAD_LIMITS.title)
    return null;
  if (!isKind(kind) || !isStatus(status)) return null;
  if (typeof note !== "string" || note.length > THREAD_LIMITS.note) return null;
  if (
    typeof closingNote !== "string" ||
    closingNote.length > THREAD_LIMITS.note
  )
    return null;
  if (
    !Array.isArray(entityIds) ||
    !entityIds.every((e) => typeof e === "string")
  )
    return null;
  if (!isTime(createdAt) || !isTime(updatedAt) || updatedAt < createdAt)
    return null;
  return {
    id,
    title: cleanTitle,
    kind,
    note,
    status,
    closingNote,
    entityIds: [...new Set(entityIds)].slice(0, THREAD_LIMITS.links),
    createdAt,
    updatedAt,
  };
}

/**
 * Reads the threads file. A file with another version, or that is not a file
 * at all, reads as no threads and is not overwritten (`valid: false`). Invalid
 * items are skipped and the valid ones are kept. Never throws.
 */
export function parseThreadsFile(raw: unknown): {
  threads: Thread[];
  valid: boolean;
} {
  if (!isRecord(raw) || raw.version !== 1 || !Array.isArray(raw.threads)) {
    return { threads: [], valid: false };
  }
  const threads: Thread[] = [];
  const seen = new Set<string>();
  for (const item of raw.threads) {
    const thread = parseThread(item);
    if (!thread || seen.has(thread.id)) continue;
    seen.add(thread.id);
    threads.push(thread);
    if (threads.length >= THREAD_LIMITS.threads) break;
  }
  return { threads, valid: true };
}

export function serialiseThreadsFile(threads: readonly Thread[]): string {
  const file: ThreadsFile = { version: 1, threads: [...threads] };
  return JSON.stringify(file, null, 2);
}

export function createThread(
  input: { title: string; kind: ThreadKind; note?: string },
  deps: { ids: IdSource; clock: ClockSource },
  existing: readonly Thread[],
): ThreadResult {
  if (existing.length >= THREAD_LIMITS.threads) {
    return {
      ok: false,
      error: `This vault has ${THREAD_LIMITS.threads} threads. Close or delete one to add another.`,
    };
  }
  const checked = checkFields(input.title, input.note ?? "");
  if (!checked.ok) return checked;
  if (!isKind(input.kind))
    return { ok: false, error: "Choose a kind for the thread." };
  const now = deps.clock.now();
  return {
    ok: true,
    thread: {
      id: deps.ids.uuid(),
      title: checked.title,
      kind: input.kind,
      note: checked.note,
      status: "open",
      closingNote: "",
      entityIds: [],
      createdAt: now,
      updatedAt: now,
    },
  };
}

function checkFields(
  title: string,
  note: string,
): { ok: true; title: string; note: string } | { ok: false; error: string } {
  const cleanTitle = title.trim();
  if (cleanTitle.length === 0)
    return { ok: false, error: "Give the thread a title." };
  if (cleanTitle.length > THREAD_LIMITS.title) {
    return {
      ok: false,
      error: `The title is at most ${THREAD_LIMITS.title} characters.`,
    };
  }
  if (note.length > THREAD_LIMITS.note) {
    return {
      ok: false,
      error: `The note is at most ${THREAD_LIMITS.note} characters.`,
    };
  }
  return { ok: true, title: cleanTitle, note };
}

export function editThread(
  thread: Thread,
  changes: { title?: string; kind?: ThreadKind; note?: string },
  clock: ClockSource,
): ThreadResult {
  const checked = checkFields(
    changes.title ?? thread.title,
    changes.note ?? thread.note,
  );
  if (!checked.ok) return checked;
  return {
    ok: true,
    thread: {
      ...thread,
      title: checked.title,
      note: checked.note,
      kind: changes.kind && isKind(changes.kind) ? changes.kind : thread.kind,
      updatedAt: clock.now(),
    },
  };
}

export function closeThread(
  thread: Thread,
  closingNote: string,
  clock: ClockSource,
): ThreadResult {
  if (closingNote.length > THREAD_LIMITS.note) {
    return {
      ok: false,
      error: `The closing note is at most ${THREAD_LIMITS.note} characters.`,
    };
  }
  return {
    ok: true,
    thread: {
      ...thread,
      status: "closed",
      closingNote,
      updatedAt: clock.now(),
    },
  };
}

/** Reopening keeps the closing note, so the history stays (data-model.md). */
export function reopenThread(thread: Thread, clock: ClockSource): Thread {
  return { ...thread, status: "open", updatedAt: clock.now() };
}

export function linkEntity(
  thread: Thread,
  entityId: string,
  clock: ClockSource,
): ThreadResult {
  if (thread.entityIds.includes(entityId)) return { ok: true, thread };
  if (thread.entityIds.length >= THREAD_LIMITS.links) {
    return {
      ok: false,
      error: `A thread links at most ${THREAD_LIMITS.links} entries.`,
    };
  }
  return {
    ok: true,
    thread: {
      ...thread,
      entityIds: [...thread.entityIds, entityId],
      updatedAt: clock.now(),
    },
  };
}

export function unlinkEntity(
  thread: Thread,
  entityId: string,
  clock: ClockSource,
): Thread {
  return {
    ...thread,
    entityIds: thread.entityIds.filter((id) => id !== entityId),
    updatedAt: clock.now(),
  };
}

/** Drops links to entries that are no longer in the vault. */
export function pruneLinks(
  threads: readonly Thread[],
  existingIds: ReadonlySet<string>,
): Thread[] {
  return threads.map((t) => {
    const kept = t.entityIds.filter((id) => existingIds.has(id));
    return kept.length === t.entityIds.length ? t : { ...t, entityIds: kept };
  });
}

export function filterThreads(
  threads: readonly Thread[],
  filter: { status?: ThreadStatus; kind?: ThreadKind; search?: string },
): Thread[] {
  const term = filter.search?.trim().toLowerCase() ?? "";
  return threads.filter(
    (t) =>
      (!filter.status || t.status === filter.status) &&
      (!filter.kind || t.kind === filter.kind) &&
      (!term || t.title.toLowerCase().includes(term)),
  );
}

/** A random open thread, or null when none is open. Never returns a closed thread. */
export function pickOpenThread(
  threads: readonly Thread[],
  rng: () => number,
): Thread | null {
  const open = threads.filter((t) => t.status === "open");
  if (open.length === 0) return null;
  return open[Math.min(open.length - 1, Math.floor(rng() * open.length))];
}

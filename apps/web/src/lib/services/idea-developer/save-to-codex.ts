import type { SessionEntity } from "generator-engine";
import { ImportDraftSchema } from "$lib/services/seo/import-handler";
import { browserStorage, type StorageLike } from "$lib/utils/runtime-deps";
import { hubSync } from "./hub-sync";

/**
 * Hands the conversation's Session Hub draft to the existing save flow
 * (#3228, FR-040).
 *
 * The public generators save by writing an import draft to `localStorage`,
 * which the app's importer picks up after the redirect. This does the same
 * small step for the Idea Developer, so it adds no persistence of its own. The
 * larger generator layout that does this for the other tools is left alone.
 */
export const PENDING_IMPORT_KEY = "__codex_pending_import";

export type SaveToCodexResult = { ok: true } | { ok: false; message: string };

const BLOCKED_MESSAGE =
  "Storage access is blocked. Please copy the result manually.";
const MISSING_MESSAGE =
  "This draft is no longer in your Session Hub, so it can't be saved. Copy the result instead.";

export class SaveToCodex {
  constructor(
    private readonly getDraft: (id: string) => SessionEntity | undefined,
    private readonly storage: StorageLike = browserStorage,
  ) {}

  save(hubDraftId: string | undefined): SaveToCodexResult {
    const entity = hubDraftId ? this.getDraft(hubDraftId) : undefined;
    if (!entity) return { ok: false, message: MISSING_MESSAGE };

    const parsed = ImportDraftSchema.safeParse({
      type: entity.type,
      kind: entity.kind,
      title: entity.title,
      content: entity.content,
      lore: entity.lore,
      labels: entity.labels,
      status: entity.status,
    });
    if (!parsed.success) return { ok: false, message: MISSING_MESSAGE };

    const payload = JSON.stringify([parsed.data]);
    try {
      this.storage.setItem(PENDING_IMPORT_KEY, payload);
      // The default storage swallows write errors, so read it back.
      if (this.storage.getItem(PENDING_IMPORT_KEY) !== payload) {
        return { ok: false, message: BLOCKED_MESSAGE };
      }
    } catch {
      return { ok: false, message: BLOCKED_MESSAGE };
    }
    return { ok: true };
  }
}

export const saveToCodex = new SaveToCodex((id) => hubSync.get(id));

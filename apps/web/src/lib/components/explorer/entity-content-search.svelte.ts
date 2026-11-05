import type { SearchIndexProgress } from "@codex/search-engine";
import type { SearchService } from "@codex/search-orchestrator";
import {
  createEntityTextSearchRunner,
  parseEntitySearchQuery,
} from "./entityListFiltering.js";

/** Per-view indexed search state, shared by the explorer and table. */
export class EntityContentSearch {
  textMatchIds = $state<Set<string> | null>(null);
  textSearchPending = $state(false);
  textSearchUnavailable = $state(false);
  textSearchError = $state<string | null>(null);
  indexProgress = $state<SearchIndexProgress>();
  private latestIndexStatus: SearchIndexProgress["status"];
  private indexStatusVersion = $state(0);
  private hasTextQuery = $state(false);

  constructor(
    private readonly getService: () => Pick<
      SearchService,
      "search" | "getIndexProgress" | "subscribeIndexProgress"
    >,
  ) {
    this.indexProgress = getService().getIndexProgress();
    this.latestIndexStatus = this.indexProgress.status;
  }

  /** Effects belong to the calling component and clean up on its destruction. */
  connect(getQuery: () => string, getEntityCount: () => number) {
    $effect(() => {
      const service = this.getService();
      const progress = service.getIndexProgress();
      this.latestIndexStatus = progress.status;
      this.indexProgress = progress;
      return service.subscribeIndexProgress((progress) => {
        if (progress.status !== this.latestIndexStatus) {
          this.latestIndexStatus = progress.status;
          this.indexStatusVersion += 1;
        }
        this.indexProgress = progress;
      });
    });
    $effect(() => {
      const query = getQuery();
      const entityCount = getEntityCount();
      void this.indexStatusVersion;
      return this.search(query, entityCount);
    });
  }

  private reset(unavailable: boolean, pending = false) {
    this.textMatchIds = null;
    this.textSearchPending = pending;
    this.textSearchUnavailable = unavailable;
    this.textSearchError = null;
  }

  private search(query: string, entityCount: number) {
    const hasTextQuery = Boolean(parseEntitySearchQuery(query).textQuery);
    this.hasTextQuery = hasTextQuery;
    if (!hasTextQuery) {
      this.reset(false);
      return;
    }
    if (this.latestIndexStatus === "idle") {
      this.reset(true);
      return;
    }
    this.reset(false, true);
    const runner = createEntityTextSearchRunner(this.getService());
    void runner.search(query, entityCount).then((result) => {
      if (!result) return;
      this.textSearchPending = false;
      this.textMatchIds = result.error ? null : result.matchIds;
      this.textSearchUnavailable = result.error !== null;
      this.textSearchError = result.error?.message ?? null;
    });
    return () => runner.cancel();
  }

  get statusMessage() {
    if (this.textSearchPending) return "Searching indexed content…";
    if (this.textSearchError)
      return "Content search is temporarily unavailable; matching titles, aliases, and labels.";
    if (this.indexProgress?.isPartial && this.hasTextQuery)
      return "Search is still indexing; results will update as indexing finishes.";
    return null;
  }
}

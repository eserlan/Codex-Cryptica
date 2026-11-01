import type { TableColumnFilters } from "#lib/components/explorer/entityListFiltering.js";
import type { VaultAuditPreset } from "#lib/components/table/vaultAudit.js";
import type { ViewPreset } from "#lib/stores/view-presets.js";
import {
  nextSortState,
  type SortKey,
  type SortState,
} from "#lib/components/table/entityTableSort.js";
import type { PerformanceOperation } from "@codex/performance-observability";

function toggleValue(values: Set<string>, value: string) {
  const next = new Set(values);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function toggleSingleValue(values: Set<string>, value: string) {
  return values.size === 1 && values.has(value)
    ? new Set<string>()
    : new Set([value]);
}

/** Table-local filter and audit transitions. */
export class TableFilters {
  searchQuery = $state("");
  typeFilters = $state<Set<string>>(new Set());
  labelFilters = $state<Set<string>>(new Set());
  showIncompleteOnly = $state(false);
  columnFilters = $state<TableColumnFilters>({});
  showAuditPanel = $state(false);
  activeAuditPresetId = $state<string | null>(null);
  auditPanelTab = $state<"findings" | "distribution">("findings");
  sort = $state<SortState>({ key: "title", direction: "asc" });

  constructor(
    private readonly measure: (
      operation: PerformanceOperation,
      update: () => void,
    ) => void = (_operation, update) => update(),
  ) {}

  syncAuditMode(mode: string | null, audit: string | null) {
    this.showAuditPanel =
      mode === "audit" || audit === "true" || mode === "overview";
    this.auditPanelTab =
      mode === "overview" && audit !== "true" ? "distribution" : "findings";
  }
  handleSort = (key: SortKey) => {
    this.measure("table_sort", () => {
      this.sort = nextSortState(this.sort, key);
    });
  };

  toggleType = (type: string) => {
    this.measure("table_filter", () => {
      this.typeFilters = toggleValue(this.typeFilters, type);
    });
  };

  toggleLabel = (label: string) => {
    this.measure("table_filter", () => {
      this.labelFilters = toggleValue(this.labelFilters, label);
    });
  };

  toggleIncompleteOnly = () => {
    this.measure("table_filter", () => {
      this.showIncompleteOnly = !this.showIncompleteOnly;
    });
  };

  handleUpdateColumnFilters = (newFilters: TableColumnFilters) => {
    this.measure("table_filter", () => {
      this.columnFilters = newFilters;
    });
  };

  toggleAuditPanel = () => {
    this.showAuditPanel = !this.showAuditPanel;
  };

  handleApplyAuditPreset = (preset: VaultAuditPreset) => {
    this.measure("table_filter", () => {
      this.activeAuditPresetId = preset.id;
      this.searchQuery = "";
      this.labelFilters = new Set();
      if (preset.typeFilter) {
        this.typeFilters = new Set([preset.typeFilter]);
      } else {
        this.typeFilters = new Set();
      }
      this.showIncompleteOnly = preset.showIncompleteOnly ?? false;
      this.columnFilters = preset.columnFilters
        ? { ...preset.columnFilters }
        : {};
    });
  };

  handleAuditDrillDown = (
    finding:
      | "missing_images"
      | "missing_descriptions"
      | "zero_connections"
      | "unlabelled"
      | "incomplete",
  ) => {
    this.measure("table_filter", () => {
      this.activeAuditPresetId = null;
      this.searchQuery = "";
      this.typeFilters = new Set();
      this.labelFilters = new Set();

      if (finding === "missing_images") {
        this.showIncompleteOnly = false;
        this.columnFilters = { imageMode: "missing_image" };
      } else if (finding === "missing_descriptions") {
        this.showIncompleteOnly = false;
        this.columnFilters = { summaryMode: "missing_summary" };
      } else if (finding === "zero_connections") {
        this.showIncompleteOnly = false;
        this.columnFilters = { connectionsMode: "zero" };
      } else if (finding === "unlabelled") {
        this.showIncompleteOnly = false;
        this.columnFilters = { labelMode: "missing" };
      } else if (finding === "incomplete") {
        this.showIncompleteOnly = true;
        this.columnFilters = {};
      }
    });
  };

  handleSelectDistributionCategory = (typeId: string) => {
    this.measure("table_filter", () => {
      this.activeAuditPresetId = null;
      this.typeFilters = toggleSingleValue(this.typeFilters, typeId);
    });
  };

  handleSelectDistributionLabel = (label: string) => {
    this.measure("table_filter", () => {
      this.activeAuditPresetId = null;
      this.labelFilters = toggleSingleValue(this.labelFilters, label);
    });
  };

  handleSelectDistributionUnlabelled = () => {
    this.measure("table_filter", () => {
      this.activeAuditPresetId = null;
      this.labelFilters = new Set();
      this.columnFilters = {
        ...this.columnFilters,
        labelMode:
          this.columnFilters.labelMode === "missing" ? "all" : "missing",
      };
    });
  };

  clearFilters = () => {
    this.measure("table_filter", () => {
      this.resetFilterValues();
    });
  };

  setSearchQuery = (value: string) => {
    this.measure("table_filter", () => {
      this.searchQuery = value;
    });
  };

  showMobileFilters = $state(false);
  hasActiveColumnFilters = $derived(
    Boolean(
      this.columnFilters.nameQuery ||
      (this.columnFilters.imageMode &&
        this.columnFilters.imageMode !== "all") ||
      (this.columnFilters.typeValues &&
        this.columnFilters.typeValues.size > 0) ||
      (this.columnFilters.labelMode &&
        this.columnFilters.labelMode !== "all") ||
      (this.columnFilters.labelValues &&
        this.columnFilters.labelValues.size > 0) ||
      (this.columnFilters.connectionsMode &&
        this.columnFilters.connectionsMode !== "all") ||
      (this.columnFilters.summaryMode &&
        this.columnFilters.summaryMode !== "all") ||
      (this.columnFilters.createdMode &&
        this.columnFilters.createdMode !== "all") ||
      (this.columnFilters.modifiedMode &&
        this.columnFilters.modifiedMode !== "all"),
    ),
  );
  activeFilterCount = $derived(
    this.typeFilters.size +
      this.labelFilters.size +
      (this.showIncompleteOnly ? 1 : 0) +
      (this.hasActiveColumnFilters ? 1 : 0),
  );
  hasActiveFilters = $derived(
    this.searchQuery.trim().length > 0 ||
      this.typeFilters.size > 0 ||
      this.labelFilters.size > 0 ||
      this.showIncompleteOnly ||
      this.hasActiveColumnFilters,
  );

  handleApplyPreset = (preset: ViewPreset) => {
    const s = preset.state;
    this.activeAuditPresetId = null;
    this.searchQuery = s.searchQuery ?? "";
    this.typeFilters = new Set(s.activeCategories);
    this.labelFilters = new Set(s.activeLabels);
    this.showIncompleteOnly = s.showIncompleteOnly ?? false;
    this.columnFilters = s.columnFilters ? { ...s.columnFilters } : {};
    if (s.tableSort) {
      this.sort = { ...s.tableSort };
    }
  };

  handleResetFilters = () => {
    this.resetFilterValues();
    this.sort = { key: "title", direction: "asc" };
  };

  private resetFilterValues() {
    this.activeAuditPresetId = null;
    this.searchQuery = "";
    this.typeFilters = new Set();
    this.labelFilters = new Set();
    this.showIncompleteOnly = false;
    this.columnFilters = {};
  }
}

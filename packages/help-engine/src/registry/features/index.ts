import { sessionJournal } from "./session-journal";
import { entityReports } from "./entity-reports";
import { statSheets } from "./stat-sheets";
import { entityTemplates } from "./entity-templates";
import { chronology } from "./chronology";
import { familyTree } from "./family-tree";
import { guidedMode } from "./guided-mode";
import { sessionPrep } from "./session-prep";
import { publishing } from "./publishing";
import { loreOracle } from "./lore-oracle";
import { themeSettings } from "./theme-settings";
import { schemaSettings } from "./schema-settings";
import { entityTable } from "./entity-table";
import { diceRoller } from "./dice-roller";
import { soloAdventure } from "./solo-adventure";
import { soloSession } from "./solo-session";
import { entityExplorer } from "./entity-explorer";
import { entityShelf } from "./entity-shelf";
import type { FeatureEntry } from "../schema";
import { archiveImport } from "./archive-import";
import { backupAndRestore } from "./backup-and-restore";
import { campaignGenerator } from "./campaign-generator";
import { canvas } from "./canvas";
import { entityConnections } from "./entity-connections";
import { entityEditing } from "./entity-editing";
import { graphView } from "./graph-view";
import { relatedEntityGeneration } from "./related-entity-generation";
import { sessionHub } from "./session-hub";
import { tables } from "./tables";
import { vttMap } from "./vtt-map";

/** Contextual Help coverage. Entries reference shared user-facing Help articles. */
export const FEATURE_REGISTRY: readonly FeatureEntry[] = [
  entityConnections,
  graphView,
  sessionHub,
  tables,
  campaignGenerator,
  canvas,
  vttMap,
  entityEditing,
  relatedEntityGeneration,
  backupAndRestore,
  archiveImport,
  sessionJournal,
  entityReports,
  statSheets,
  entityTemplates,
  chronology,
  familyTree,
  guidedMode,
  sessionPrep,
  publishing,
  loreOracle,
  themeSettings,
  schemaSettings,
  entityTable,
  diceRoller,
  soloAdventure,
  soloSession,
  entityExplorer,
  entityShelf,
];

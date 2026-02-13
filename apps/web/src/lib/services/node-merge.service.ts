import type {
  INodeContent,
  IMergedContentProposal,
} from "../../../../../packages/editor-core/src/operations/merge-utils";
import {
  mergeFrontmatter,
  concatenateBody,
} from "../../../../../packages/editor-core/src/operations/merge-utils";
import { vault } from "../stores/vault.svelte";
import { oracle } from "../stores/oracle.svelte";
import { aiService, TIER_MODES } from "./ai";
import type { LocalEntity } from "../stores/vault/types";

export type { IMergedContentProposal };

export interface IMergeRequest {
  sourceNodeIds: string[];
  targetNodeId: string;
  strategy: "ai" | "concat";
}

export class NodeMergeService {
  /**
   * Fetches the full content of the specified nodes.
   */
  async fetchNodeContent(nodeIds: string[]): Promise<INodeContent[]> {
    const contents: INodeContent[] = [];
    for (const id of nodeIds) {
      const entity = vault.entities[id];
      if (entity) {
        // Construct frontmatter from entity properties
        const frontmatter: Record<string, any> = {
          title: entity.title,
          type: entity.type,
          tags: entity.tags,
          labels: entity.labels,
          lore: entity.lore,
          date: entity.date,
          start_date: entity.start_date,
          end_date: entity.end_date,
          ...entity.metadata, // Merge generic metadata if any
        };

        contents.push({
          id: entity.id,
          frontmatter,
          body: entity.content || "",
          connections: entity.connections.map((c) => ({
            source: id,
            target: c.target,
            label: c.label || "",
          })),
        });
      }
    }
    return contents;
  }

  /**
   * Generates a proposal for merging the content.
   */
  async proposeMerge(request: IMergeRequest): Promise<IMergedContentProposal> {
    const { sourceNodeIds, targetNodeId, strategy } = request;
    const allContent = await this.fetchNodeContent(sourceNodeIds);

    const targetContent = allContent.find((c) => c.id === targetNodeId);
    if (!targetContent) {
      throw new Error(`Target node ${targetNodeId} not found in selection.`);
    }

    const sources = allContent.filter((c) => c.id !== targetNodeId);

    let suggestedFrontmatter: Record<string, any>;
    let suggestedBody: string;

    if (strategy === "ai") {
      const apiKey = oracle.effectiveApiKey;
      if (!apiKey) {
        throw new Error(
          "AI API Key not configured. Please enable AI in settings or use Manual Merge.",
        );
      }
      const modelName = TIER_MODES[oracle.tier];

      // We pass the "raw" entity-like structure that aiService expects (title, type, content, lore)
      // fetchNodeContent returns INodeContent.
      // We need to map back to what aiService.getConsolidatedContext expects?
      // Actually, getConsolidatedContext expects { lore, content }.
      // INodeContent has { body, frontmatter: { lore } }.
      const mapToAiEntity = (n: INodeContent) => ({
        title: n.frontmatter.title,
        type: n.frontmatter.type,
        content: n.body,
        lore: n.frontmatter.lore,
      });

      const aiProposal = await aiService.generateMergeProposal(
        apiKey,
        modelName,
        mapToAiEntity(targetContent),
        sources.map(mapToAiEntity),
      );

      suggestedFrontmatter = mergeFrontmatter(targetContent, sources);
      suggestedBody = aiProposal.body;
      if (aiProposal.lore) {
        suggestedFrontmatter.lore = aiProposal.lore;
      }
    } else {
      suggestedFrontmatter = mergeFrontmatter(targetContent, sources);
      suggestedBody = concatenateBody(targetContent, sources);
    }

    // Preserve OUTGOING connections from sources
    // We want to add them to the target.
    const outgoingConnections = sources.flatMap((s) =>
      s.connections.map((c) => ({
        ...c,
        source: targetNodeId, // Re-parent to target
      })),
    );

    return {
      targetId: targetNodeId,
      suggestedFrontmatter,
      suggestedBody,
      incomingConnections: [], // To be populated in US3
      outgoingConnections,
    };
  }

  /**
   * Checks if any of the nodes are currently open/selected, which implies potential unsaved changes.
   */
  checkUnsavedChanges(nodeIds: string[]): boolean {
    if (vault.status !== "idle") return true;
    if (vault.selectedEntityId && nodeIds.includes(vault.selectedEntityId)) {
      // Logic could be stricter: only if dirty. But we don't have access to dirty state here easily.
      // Warn if selected.
      return true;
    }
    return false;
  }

  /**
   * Executes the merge operation: writes new file, updates links, deletes old files.
   */
  async executeMerge(
    finalContent: IMergedContentProposal,
    sourceIds: string[],
  ): Promise<void> {
    const {
      targetId,
      suggestedFrontmatter,
      suggestedBody,
      outgoingConnections,
    } = finalContent;

    const targetEntity = vault.entities[targetId];
    if (!targetEntity) throw new Error(`Target entity ${targetId} not found`);

    // 1. Update Target Entity
    const updates: Partial<LocalEntity> = {
      title: suggestedFrontmatter.title || targetEntity.title,
      type: suggestedFrontmatter.type || targetEntity.type,
      tags: suggestedFrontmatter.tags || targetEntity.tags,
      labels: suggestedFrontmatter.labels || targetEntity.labels,
      lore: suggestedFrontmatter.lore || targetEntity.lore,
      date: suggestedFrontmatter.date,
      start_date: suggestedFrontmatter.start_date,
      end_date: suggestedFrontmatter.end_date,
      content: suggestedBody,
      metadata: {
        ...targetEntity.metadata,
        ...suggestedFrontmatter, // Copy other fields back to metadata
      },
    };

    // Merge connections
    // Existing target connections
    const existingConnections = targetEntity.connections || [];
    // New connections from sources
    // Filter out connections that already exist on target
    const newConnections = outgoingConnections.filter(
      (newC) => !existingConnections.some((exC) => exC.target === newC.target),
    );

    // Also filter out connections pointing to deleted source nodes!
    // If Source A pointed to Source B, and we delete B, we shouldn't add a connection to B on Target.
    // But B is being merged into Target. So it should point to Target? (Self-reference?)
    // Usually self-references are avoided.

    const finalConnections = [
      ...existingConnections,
      ...newConnections.map((c) => ({
        target: c.target,
        label: c.label,
        strength: (c as any).strength ?? 1,
        type: (c as any).type ?? "related_to",
      })),
    ].filter((c) => !sourceIds.includes(c.target) && c.target !== targetId);

    updates.connections = finalConnections;

    // Apply Update
    vault.updateEntity(targetId, updates);

    // 2. Delete Source Nodes
    // We filter sourceIds to exclude targetId (just in case)
    const toDelete = sourceIds.filter((id) => id !== targetId);

    for (const id of toDelete) {
      await vault.deleteEntity(id);
    }

    // 3. Update Backlinks (US3)
    // We do this BEFORE deletion to ensure we have titles, although we can just get them before.
    // Actually, updateBacklinks needs source TITLES to find wikilinks.
    // Source IDs are passed.
    await this.updateBacklinks(toDelete, targetId);

    // 2. Delete Source Nodes
    for (const id of toDelete) {
      await vault.deleteEntity(id);
    }
  }

  /**
   * Finds and replaces links in referencing files.
   */
  async updateBacklinks(sourceIds: string[], targetId: string): Promise<void> {
    const targetEntity = vault.entities[targetId];
    if (!targetEntity) return;
    const targetTitle = targetEntity.title;

    const sourceTitles = sourceIds
      .map((id) => vault.entities[id]?.title)
      .filter((t) => t);

    const allEntities = Object.values(vault.entities);

    for (const entity of allEntities) {
      if (sourceIds.includes(entity.id) || entity.id === targetId) continue;

      let contentModified = false;
      let newContent = entity.content || "";
      let newLore = entity.lore || "";
      let connectionsModified = false;
      const newConnections = [...(entity.connections || [])];

      // 1. Text Replacement
      for (const sourceTitle of sourceTitles) {
        const escaped = sourceTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // Match [[Title]] or [[Title|Alias]]
        const regex = new RegExp(`\\[\\[${escaped}(\\|.*?)?\\]\\]`, "gi");

        if (newContent.match(regex)) {
          newContent = newContent.replace(
            regex,
            (_match, p1) => `[[${targetTitle}${p1 || ""}]]`,
          );
          contentModified = true;
        }
        if (newLore.match(regex)) {
          newLore = newLore.replace(
            regex,
            (_match, p1) => `[[${targetTitle}${p1 || ""}]]`,
          );
          contentModified = true;
        }
      }

      // 2. Connection Re-mapping (Graph Edges)
      const sourceIdSet = new Set(sourceIds);
      const updatedConnections = newConnections.map((c) => {
        if (sourceIdSet.has(c.target)) {
          connectionsModified = true;
          return { ...c, target: targetId };
        }
        return c;
      });

      if (connectionsModified) {
        // Deduplicate connections to the same target resulting from remapping
        const unique = [];
        const seen = new Set();
        for (const c of updatedConnections) {
          const key = `${c.target}:${c.label || ""}`;
          if (!seen.has(key)) {
            unique.push(c);
            seen.add(key);
          }
        }
        newConnections.splice(0, newConnections.length, ...unique);
      }

      if (contentModified || connectionsModified) {
        vault.updateEntity(entity.id, {
          content: newContent,
          lore: newLore,
          connections: newConnections,
        });
      }
    }
  }
}

export const nodeMergeService = new NodeMergeService();

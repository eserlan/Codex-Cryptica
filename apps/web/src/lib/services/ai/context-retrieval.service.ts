import { searchService as defaultSearchService } from "../search";
import type { ContextRetrievalService } from "schema";

export class DefaultContextRetrievalService implements ContextRetrievalService {
  private styleCache: string | null = null;
  private styleTitleCache: string | null = null;

  constructor(private searchService = defaultSearchService) {}

  getConsolidatedContext(entity: any): string {
    const parts = [];
    if (entity.lore?.trim()) parts.push(entity.lore.trim());
    if (entity.content?.trim()) parts.push(entity.content.trim());
    return parts.join("\n\n");
  }

  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private findExplicitSubject(
    query: string,
    entities: Record<string, any>,
  ): string | undefined {
    const queryLower = query.toLowerCase();
    const matches = [];

    for (const id in entities) {
      const e = entities[id];
      const titleLower = e.title.toLowerCase();
      let matched = false;

      if (titleLower.length > 2) {
        if (queryLower.includes(titleLower)) matched = true;
      } else {
        const pattern = new RegExp(`\\b${this.escapeRegExp(titleLower)}\\b`);
        if (pattern.test(queryLower)) matched = true;
      }

      if (matched) matches.push(e);
    }

    matches.sort((a: any, b: any) => b.title.length - a.title.length);

    return matches[0]?.id;
  }

  private isFollowUp(query: string): boolean {
    const q = query.toLowerCase().trim();
    const followUpPatterns = [
      /^tell me more$/i,
      /^more$/i,
      /^elaborate$/i,
      /^anything else\??$/i,
      /^and\b/i,
      /^what about (it|him|her|them|that|she|he|they)\??$/i,
    ];

    const isShort = q.split(/\s+/).length <= 3;
    if (isShort) {
      const pronounOnlyPattern =
        /^(it|him|her|them|that|she|he|they|his|hers|its)\??$/i;
      if (pronounOnlyPattern.test(q)) return true;
    }

    return followUpPatterns.some((p) => p.test(q));
  }

  async retrieveContext(
    query: string,
    excludeTitles: Set<string>,
    vault: any,
    lastEntityId?: string,
    isImage: boolean = false,
  ): Promise<{
    content: string;
    primaryEntityId?: string;
    sourceIds: string[];
    activeStyleTitle?: string;
  }> {
    let styleContext = "";
    let activeStyleTitle: string | undefined;

    if (isImage) {
      if (this.styleCache !== null) {
        styleContext = this.styleCache;
        activeStyleTitle = this.styleTitleCache || undefined;
      } else {
        const styleResults = await this.searchService.search(
          "art style visual aesthetic",
          { limit: 1 },
        );
        if (styleResults.length > 0 && styleResults[0].score > 0.5) {
          const styleId = styleResults[0].id;
          // Ensure content is loaded from Dexie before reading context.
          await vault.loadEntityContent?.(styleId);
          const styleEntity = vault.entities[styleId];
          if (styleEntity) {
            styleContext = `--- GLOBAL ART STYLE ---\n${this.getConsolidatedContext(styleEntity)}\n\n`;
            activeStyleTitle = styleEntity.title;
            this.styleCache = styleContext;
            this.styleTitleCache = activeStyleTitle || "";
          }
        } else {
          this.styleCache = "";
          this.styleTitleCache = "";
        }
      }
    }

    let results = await this.searchService.search(query, { limit: 5 });

    if (results.length === 0) {
      const keywords = query
        .toLowerCase()
        .replace(/[^\w\s']/g, "")
        .split(/\s+/)
        .filter(
          (w) =>
            w.length > 2 &&
            ![
              "the",
              "and",
              "was",
              "for",
              "who",
              "how",
              "did",
              "his",
              "her",
              "they",
              "with",
              "from",
            ].includes(w),
        );

      if (keywords.length > 0) {
        results = await this.searchService.search(keywords.join(" "), {
          limit: 5,
        });
      }
    }

    const activeId = vault.selectedEntityId;
    const explicitSubject = this.findExplicitSubject(query, vault.entities);
    const topSearchResult = results[0];
    const isHighConfidenceSearch =
      topSearchResult && topSearchResult.score >= 0.6;
    const isFollowUp = this.isFollowUp(query);

    let primaryEntityId: string | undefined;

    if (explicitSubject) {
      primaryEntityId = explicitSubject;
    } else if (isHighConfidenceSearch) {
      primaryEntityId = topSearchResult.id;
    } else if (isFollowUp && lastEntityId) {
      primaryEntityId = lastEntityId;
    } else {
      primaryEntityId = activeId || topSearchResult?.id;
    }

    // Pre-load content for all entity IDs that will contribute to the oracle
    // context.  This is needed because graph entities start with content = ""
    // (lazy-loaded); the Dexie round-trip is batched here to keep the loop
    // below synchronous.
    if (vault.loadEntityContent) {
      const candidateIds = new Set<string>();
      if (activeId) candidateIds.add(activeId);
      if (lastEntityId) candidateIds.add(lastEntityId);
      for (const res of results) candidateIds.add(res.id);
      // Also pre-fetch connections of the top 3 results.
      for (const res of results.slice(0, 3)) {
        const e = vault.entities[res.id];
        if (e?.connections) {
          for (const c of e.connections) {
            candidateIds.add(c.target);
          }
        }
      }
      await Promise.all(
        Array.from(candidateIds).map((id) => vault.loadEntityContent(id)),
      );
    }

    const contextMap = new Map<string, string>();
    const sourceIds: string[] = [];
    const MAX_CHARS = 10000;
    let currentTotal = styleContext.length;

    const addEntityToContext = (id: string, isEnrichment: boolean = false) => {
      if (contextMap.has(id)) return;
      const entity = vault.entities[id];
      if (!entity || excludeTitles.has(entity.title)) return;

      const mainContent = isEnrichment
        ? (entity.content || "").trim()
        : this.getConsolidatedContext(entity);
      if (!mainContent && !isEnrichment) return;

      const isActive = id === activeId;
      const prefix = isActive ? "[ACTIVE FILE] " : "";

      let connectionContext = "";
      const outbound = (entity.connections || []).map((c: any) => {
        const targetEntity = vault.entities[c.target];
        const target =
          targetEntity && targetEntity.title
            ? targetEntity.title
            : `[missing entity: ${c.target}]`;
        return `- ${entity.title} → ${c.label || c.type} → ${target}`;
      });

      const inbound = (vault.inboundConnections[id] || []).map((item: any) => {
        const sourceEntity = vault.entities[item.sourceId];
        const source =
          sourceEntity && sourceEntity.title
            ? sourceEntity.title
            : `[missing entity: ${item.sourceId}]`;
        return `- ${source} → ${item.connection.label || item.connection.type} → ${entity.title}`;
      });

      if (outbound.length > 0 || inbound.length > 0) {
        connectionContext =
          "\n--- Connections ---\n" + [...outbound, ...inbound].join("\n");
      }

      const header = `--- ${prefix}File: ${entity.title} ---\n`;
      const fullSnippet = `${header}${mainContent}${connectionContext}`;

      if (currentTotal + fullSnippet.length > MAX_CHARS) {
        if (!isEnrichment) {
          const overhead = header.length + connectionContext.length + 50;
          const allowed = MAX_CHARS - currentTotal - overhead;
          if (allowed > 100) {
            const truncated =
              mainContent.slice(0, allowed) + "... [truncated content]";
            contextMap.set(id, `${header}${truncated}${connectionContext}`);
            sourceIds.push(id);
            currentTotal = MAX_CHARS;
          }
        }
        return;
      }

      contextMap.set(id, fullSnippet);
      sourceIds.push(id);
      currentTotal += fullSnippet.length + 2;
    };

    if (activeId) addEntityToContext(activeId);

    for (const res of results) {
      if (currentTotal >= MAX_CHARS) break;
      addEntityToContext(res.id);
    }

    if (lastEntityId && currentTotal < MAX_CHARS) {
      addEntityToContext(lastEntityId);
    }

    const topResults = results.slice(0, 3);
    for (const res of topResults) {
      if (currentTotal >= MAX_CHARS) break;
      const entity = vault.entities[res.id];
      if (!entity) continue;

      const connections = entity.connections || [];
      for (const conn of connections) {
        if (currentTotal >= MAX_CHARS) break;
        addEntityToContext(conn.target, true);
      }
    }

    if (sourceIds.length > 0) {
      console.log(
        `[ContextRetrievalService] Consulted ${sourceIds.length} records:`,
        sourceIds,
      );
    }

    let finalContent = Array.from(contextMap.values()).join("\n\n");
    if (contextMap.size === 0 && excludeTitles.size === 0) {
      const allTitles = Object.values(vault.entities)
        .map((e: any) => e.title)
        .join(", ");
      if (allTitles) {
        finalContent = `--- Available Records ---\nYou have records on the following subjects: ${allTitles}. None specifically matched, but they are available.`;
      }
    }

    return {
      content: styleContext + finalContent,
      primaryEntityId: primaryEntityId || undefined,
      sourceIds,
      activeStyleTitle,
    };
  }

  clearStyleCache() {
    this.styleCache = null;
    this.styleTitleCache = null;
  }
}

export const contextRetrievalService = new DefaultContextRetrievalService();

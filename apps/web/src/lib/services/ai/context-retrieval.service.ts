import { searchService as defaultSearchService } from "../search.svelte";
import { isEntityVisible } from "schema";
import type { ContextRetrievalService, VaultMinimal } from "schema";
import { loreHash, type LoreEntry } from "./lore-delta-tracker";

export class DefaultContextRetrievalService implements ContextRetrievalService {
  private styleCache: string | null = null;
  private styleTitleCache: string | null = null;
  private cachedVaultId: string | null = null;
  private _searchService: any;

  constructor(searchService?: any) {
    this._searchService = searchService;
  }

  private get searchService() {
    return this._searchService || defaultSearchService;
  }

  getConsolidatedContext(entity: any, options?: { isGuest?: boolean }): string {
    const parts = [];
    if (!options?.isGuest && entity.lore?.trim())
      parts.push(entity.lore.trim());
    if (entity.content?.trim()) parts.push(entity.content.trim());
    return parts.join("\n\n");
  }

  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private findExplicitSubject(
    query: string,
    vault: VaultMinimal,
  ): string | undefined {
    const queryLower = query.toLowerCase();

    if ((vault as any).titleAndAliasIndex) {
      const index = (vault as any).titleAndAliasIndex;
      for (const entry of index) {
        if (entry.status === "draft") continue;

        if (vault.isGuest) {
          const realEntity = vault.entities?.[entry.entityId];
          const checkEntity = realEntity || {
            visibility: entry.visibility,
            labels: entry.labels,
          };
          if (
            !isEntityVisible(checkEntity as any, {
              sharedMode: true,
              defaultVisibility: vault.defaultVisibility,
            })
          ) {
            continue;
          }
        }

        const text = entry.lowercaseText;
        let matched = false;
        if (text.length > 2) {
          if (queryLower.includes(text)) matched = true;
        } else {
          const pattern = new RegExp(`\\b${this.escapeRegExp(text)}\\b`);
          if (pattern.test(queryLower)) matched = true;
        }

        if (matched) {
          return entry.entityId;
        }
      }
      return undefined;
    }

    const matches = [];
    const entities = vault.entities || {};

    for (const id in entities) {
      const e = entities[id];

      // Enforce Fog of War for guests in explicit subject matching
      if (
        vault.isGuest &&
        !isEntityVisible(e, {
          sharedMode: true,
          defaultVisibility: vault.defaultVisibility,
        })
      ) {
        continue;
      }

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
    vault: VaultMinimal,
    lastEntityId?: string,
    _isImage: boolean = false,
  ): Promise<{
    content: string;
    primaryEntityId?: string;
    sourceIds: string[];
    entries: LoreEntry[];
    activeStyleTitle?: string;
  }> {
    let styleContext = "";
    let activeStyleTitle: string | undefined;

    const currentVaultId = vault.activeVaultId || vault.id || "default";
    if (this.cachedVaultId !== currentVaultId) {
      this.clearStyleCache();
      this.cachedVaultId = currentVaultId;
    }

    // 1. Retrieve Global Art Style (Influences tone/description)
    if (this.styleCache !== null) {
      styleContext = this.styleCache;
      activeStyleTitle = this.styleTitleCache || undefined;
    } else {
      const styleResults = await this.searchService.search(
        "art style direction visual aesthetic style guide",
        { limit: 3, includeDrafts: true },
      );
      const styleKeywords = [
        "art style",
        "visual aesthetic",
        "style guide",
        "art direction",
        "visual direction",
      ];
      let bestStyleId: string | undefined;

      for (const res of styleResults) {
        if (res.score > 0.4) {
          const ent = vault.entities[res.id];
          const title = ent?.title?.toLowerCase() || "";
          if (styleKeywords.some((kw) => title.includes(kw))) {
            bestStyleId = res.id;
            break;
          }
        }
      }

      if (bestStyleId) {
        const styleId = bestStyleId;
        await vault.loadEntityContent?.(styleId);
        const styleEntity = vault.entities[styleId];
        const isVisible =
          !vault.isGuest ||
          (styleEntity &&
            isEntityVisible(styleEntity, {
              sharedMode: true,
              defaultVisibility: vault.defaultVisibility,
            }));

        if (styleEntity && isVisible) {
          styleContext = `--- GLOBAL ART STYLE ---\n${this.getConsolidatedContext(styleEntity, { isGuest: vault.isGuest })}\n\n`;
          activeStyleTitle = styleEntity.title;
          this.styleCache = styleContext;
          this.styleTitleCache = activeStyleTitle || "";
        }
      }
    }

    // Ensure the style entity itself isn't treated as a subject in the prose.
    // We use a local set to avoid polluting the caller's excludeTitles,
    // which would suppress the "Available Records" fallback logic below.
    const internalExclusions = new Set(excludeTitles);
    if (activeStyleTitle) {
      internalExclusions.add(activeStyleTitle);
    }

    let results = await this.searchService.search(query, {
      limit: 5,
      includeDrafts: true,
    });

    // Enforce Fog of War for guests in search results
    if (vault.isGuest) {
      results = results.filter((res: any) => {
        const entity = vault.entities[res.id];
        return (
          entity &&
          isEntityVisible(entity, {
            sharedMode: true,
            defaultVisibility: vault.defaultVisibility,
          })
        );
      });
    }

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
          includeDrafts: true,
        });

        // Enforce Fog of War for guests in keyword results
        if (vault.isGuest) {
          results = results.filter((res: any) => {
            const entity = vault.entities[res.id];
            return (
              entity &&
              isEntityVisible(entity, {
                sharedMode: true,
                defaultVisibility: vault.defaultVisibility,
              })
            );
          });
        }
      }
    }

    const activeId = vault.selectedEntityId;
    const explicitSubject = this.findExplicitSubject(query, vault);
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
      const lastEntity = vault.entities[lastEntityId];
      const isVisible =
        !vault.isGuest ||
        (lastEntity &&
          isEntityVisible(lastEntity, {
            sharedMode: true,
            defaultVisibility: vault.defaultVisibility,
          }));
      if (isVisible) primaryEntityId = lastEntityId;
    } else {
      const activeEntity = activeId ? vault.entities[activeId] : null;
      const isActiveVisible =
        !vault.isGuest ||
        (activeEntity &&
          isEntityVisible(activeEntity, {
            sharedMode: true,
            defaultVisibility: vault.defaultVisibility,
          }));
      primaryEntityId = isActiveVisible
        ? activeId || topSearchResult?.id
        : topSearchResult?.id;
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
        Array.from(candidateIds).map((id) => vault.loadEntityContent!(id)),
      );
    }

    const contextMap = new Map<string, string>();
    const sourceIds: string[] = [];
    // Per-entity records for lore-delta tracking. The hash covers the stable
    // body only (mainContent + connections), excluding the volatile
    // `[ACTIVE FILE]` header so toggling the active file does not force resends.
    const entries: LoreEntry[] = [];
    const MAX_CHARS = 10000;
    let currentTotal = styleContext.length;

    const addEntityToContext = (id: string, isEnrichment: boolean = false) => {
      if (contextMap.has(id)) return;
      const entity = vault.entities[id];
      if (!entity || internalExclusions.has(entity.title)) return;

      // Enforce Fog of War for guests
      if (
        vault.isGuest &&
        !isEntityVisible(entity, {
          sharedMode: true,
          defaultVisibility: vault.defaultVisibility,
        })
      ) {
        return;
      }

      const mainContent = isEnrichment
        ? (entity.content || "").trim()
        : this.getConsolidatedContext(entity, { isGuest: vault.isGuest });
      if (!mainContent && !isEnrichment) return;

      const isActive = id === activeId;
      const prefix = isActive ? "[ACTIVE FILE] " : "";

      let connectionContext = "";

      // ⚡ Bolt Optimization: Replace .reduce() that returns an array with an imperative loop to eliminate closure allocation overhead.
      const outbound: string[] = [];
      const connections = entity.connections || [];
      for (const c of connections) {
        const targetEntity = vault.entities[c.target];
        if (
          targetEntity &&
          (!vault.isGuest ||
            isEntityVisible(targetEntity, {
              sharedMode: true,
              defaultVisibility: vault.defaultVisibility,
            }))
        ) {
          outbound.push(
            `- ${entity.title} → ${c.label || c.type} → ${targetEntity.title}`,
          );
        }
      }

      // ⚡ Bolt Optimization: Replace .reduce() that returns an array with an imperative loop to eliminate closure allocation overhead.
      const inbound: string[] = [];
      const inboundConn = vault.inboundConnections[id] || [];
      for (const item of inboundConn) {
        const sourceEntity = vault.entities[item.sourceId];
        if (
          sourceEntity &&
          (!vault.isGuest ||
            isEntityVisible(sourceEntity, {
              sharedMode: true,
              defaultVisibility: vault.defaultVisibility,
            }))
        ) {
          inbound.push(
            `- ${sourceEntity.title} → ${item.connection.label || item.connection.type} → ${entity.title}`,
          );
        }
      }

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
            const truncatedSnippet = `${header}${truncated}${connectionContext}`;
            contextMap.set(id, truncatedSnippet);
            sourceIds.push(id);
            entries.push({
              id,
              snippet: truncatedSnippet,
              hash: loreHash(`${truncated}${connectionContext}`),
            });
            currentTotal = MAX_CHARS;
          }
        }
        return;
      }

      contextMap.set(id, fullSnippet);
      sourceIds.push(id);
      entries.push({
        id,
        snippet: fullSnippet,
        hash: loreHash(`${mainContent}${connectionContext}`),
      });
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
      // ⚡ Bolt Optimization: Use pre-derived vault.allEntities and build string in a single pass
      // to avoid an extra titles array from .map(), reducing GC overhead.
      // When vault.allEntities is present, this also avoids an Object.values() allocation.
      let allTitles = "";
      let first = true;

      if ((vault as any).titleAndAliasIndex) {
        const index = (vault as any).titleAndAliasIndex;
        const seen = new Set<string>();
        for (const entry of index) {
          if (entry.isAlias || entry.status === "draft") continue;
          if (seen.has(entry.entityId)) continue;
          seen.add(entry.entityId);

          const title = entry.actualTitle;
          if (title && !internalExclusions.has(title)) {
            if (vault.isGuest) {
              const realEntity = vault.entities?.[entry.entityId];
              const checkEntity = realEntity || {
                visibility: entry.visibility,
                labels: entry.labels,
              };
              if (
                !isEntityVisible(checkEntity as any, {
                  sharedMode: true,
                  defaultVisibility: vault.defaultVisibility,
                })
              ) {
                continue;
              }
            }
            if (!first) {
              allTitles += ", ";
            }
            allTitles += title;
            first = false;
          }
        }
      } else {
        const allEntities =
          vault.allEntities || Object.values(vault.entities || {});
        const count = allEntities.length;
        for (let i = 0; i < count; i++) {
          const e = allEntities[i];
          const title = e.title;
          if (title && !internalExclusions.has(title)) {
            // Enforce Fog of War for guests in title list
            if (
              vault.isGuest &&
              !isEntityVisible(e, {
                sharedMode: true,
                defaultVisibility: vault.defaultVisibility,
              })
            ) {
              continue;
            }

            if (!first) {
              allTitles += ", ";
            }
            allTitles += title;
            first = false;
          }
        }
      }

      if (allTitles) {
        finalContent = `--- Available Records ---\nYou have records on the following subjects: ${allTitles}. None specifically matched, but they are available.`;
      }
    }

    // The global art-style block follows the same send-once / resend-on-change
    // rule under a synthetic id so it is not re-uploaded every turn.
    if (styleContext) {
      entries.unshift({
        id: "__style__",
        snippet: styleContext,
        hash: loreHash(styleContext),
      });
    }

    return {
      content: styleContext + finalContent,
      primaryEntityId: primaryEntityId || undefined,
      sourceIds,
      entries,
      activeStyleTitle,
    };
  }

  clearStyleCache() {
    this.styleCache = null;
    this.styleTitleCache = null;
    this.cachedVaultId = null;
  }
}

export const contextRetrievalService = new DefaultContextRetrievalService();

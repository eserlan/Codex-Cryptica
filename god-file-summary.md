# 🏛️ God File Analysis Report

_Evaluated on 2026-10-18 against Constitution Principle XIV (Bounded Responsibility)._

### Executive Summary

| Metric | Value | Reference |
| :--- | :--- | :--- |
| **Evaluated Source Files** | `2388` | Excluding tests & data catalogues |
| **Data Catalogues Excluded** | `98` | Principle XIV.4 constant registries |
| **🔴 Critical Files (>= 800 lines)** | `29` | Immediate refactor candidates |
| **🟡 Watch Files (>= 500 lines)** | `104` | Principle XIV review trigger |

> [!IMPORTANT]
> **Constitution Principle XIV (Bounded Responsibility)**:
> Files crossing **500 lines** must be justified in review by naming their single responsibility, or decomposed along unrelated concerns. Data modules (constants, catalogues) are exempt from size triggers.

### Top Largest Source Files (Ranked)

| Rank | Status | File Path | Total Lines | Code Lines | Est. Handlers/Funcs | Layer |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | 🔴 CRITICAL | `apps/web/src/lib/stores/vtt/vtt-token-manager.svelte.ts` | 1169 | 983 | 97 | Store (State) |
| 2 | 🔴 CRITICAL | `apps/web/src/lib/components/stats/presentation/PresentationTemplateEditor.svelte` | 1145 | 1076 | 31 | UI Component |
| 3 | 🔴 CRITICAL | `apps/web/src/lib/components/graph/graph-view-controller.svelte.ts` | 1127 | 949 | 63 | Controller |
| 4 | 🔴 CRITICAL | `apps/web/src/lib/components/seo/GeneratorPageContent.svelte` | 1125 | 1017 | 14 | UI Component |
| 5 | 🔴 CRITICAL | `apps/web/src/lib/components/stats/presentation/nodes/ItemTableNode.svelte` | 1125 | 1067 | 41 | UI Component |
| 6 | 🔴 CRITICAL | `apps/web/src/lib/stores/cloud-backup.svelte.ts` | 1125 | 794 | 83 | Store (State) |
| 7 | 🔴 CRITICAL | `apps/web/src/lib/stores/map.svelte.ts` | 1105 | 936 | 83 | Store (State) |
| 8 | 🔴 CRITICAL | `apps/workers/oracle-proxy/src/cloud-backup.ts` | 1047 | 793 | 79 | Worker Router |
| 9 | 🔴 CRITICAL | `apps/web/src/routes/(marketing)/generators/[theme=theme_hub]/+page.svelte` | 1035 | 991 | 3 | UI Component |
| 10 | 🔴 CRITICAL | `apps/web/src/lib/components/random/SourceWorkspace.svelte` | 1022 | 864 | 39 | UI Component |
| 11 | 🔴 CRITICAL | `apps/web/src/routes/(app)/table/+page.svelte` | 1021 | 926 | 53 | UI Component |
| 12 | 🔴 CRITICAL | `packages/vault-engine/src/asset-manager.ts` | 1014 | 780 | 65 | Engine Core |
| 13 | 🔴 CRITICAL | `apps/web/src/lib/components/settings/StatSheetTemplateSettings.svelte` | 1008 | 956 | 31 | UI Component |
| 14 | 🔴 CRITICAL | `apps/web/src/lib/components/generators/GeneratorConfigForm.svelte` | 994 | 932 | 22 | UI Component |
| 15 | 🔴 CRITICAL | `apps/web/src/lib/stores/vault.svelte.ts` | 982 | 870 | 141 | Store (State) |
| 16 | 🔴 CRITICAL | `apps/web/src/lib/stores/vault/entity-mutations.ts` | 961 | 854 | 69 | Store (State) |
| 17 | 🔴 CRITICAL | `apps/web/src/lib/app/init/app-init.ts` | 957 | 779 | 45 | Utility / Module |
| 18 | 🔴 CRITICAL | `packages/cloud-backup-sync/src/cloud-backup-sync.ts` | 921 | 682 | 54 | Utility / Module |
| 19 | 🔴 CRITICAL | `apps/web/src/lib/stores/graph.svelte.ts` | 916 | 711 | 100 | Store (State) |
| 20 | 🔴 CRITICAL | `apps/web/src/lib/components/generators/CampaignGeneratorModal.svelte` | 913 | 825 | 48 | UI Component |
| 21 | 🔴 CRITICAL | `apps/workers/oracle-proxy/src/publish.ts` | 880 | 763 | 61 | Worker Router |
| 22 | 🔴 CRITICAL | `apps/web/src/lib/components/GraphView.svelte` | 873 | 738 | 35 | UI Component |
| 23 | 🔴 CRITICAL | `apps/web/src/lib/config/help-content.ts` | 867 | 768 | 10 | Utility / Module |
| 24 | 🔴 CRITICAL | `packages/graph-engine/src/transformer.ts` | 851 | 706 | 39 | Engine Core |
| 25 | 🔴 CRITICAL | `packages/ai-engine/src/client-manager.ts` | 837 | 570 | 57 | Engine Core |

### Breakdown By Architectural Layer

| Layer | Total Files | Over 500 Lines | Total Lines |
| :--- | :--- | :--- | :--- |
| UI Component | 689 | 63 | 130,688 |
| Store (State) | 157 | 17 | 35,554 |
| Service | 141 | 9 | 26,286 |
| Controller | 6 | 3 | 3,194 |
| Worker Router | 55 | 2 | 12,002 |
| Engine Core | 501 | 21 | 76,031 |
| Utility / Module | 839 | 18 | 126,592 |
| Data Catalog | 98 | 51 | 64,535 |

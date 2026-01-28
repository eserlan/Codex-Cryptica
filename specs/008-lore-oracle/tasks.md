# Tasks: Lore Oracle (Cloud AI)

- [x] **Infrastructure: Dependencies** <!-- id: 1 -->
    - [x] Uninstall `@mlc-ai/web-llm`. <!-- id: 1.1 -->
    - [x] Install `@google/generative-ai` in `apps/web`. <!-- id: 1.2 -->

- [x] **Core: Settings Management** <!-- id: 2 -->
    - [x] Update `apps/web/src/lib/utils/idb.ts` to handle `ai_api_key`. <!-- id: 2.1 -->
    - [x] Create `apps/web/src/lib/components/settings/AISettings.svelte` for key entry. <!-- id: 2.2 -->

- [x] **Core: AI Service** <!-- id: 3 -->
    - [x] Create `apps/web/src/lib/services/ai.ts` with streaming support. <!-- id: 3.1 -->
    - [x] Implement `apps/web/src/lib/stores/oracle.svelte.ts` for chat state. <!-- id: 3.2 -->
    - [x] **Multi-Window Sync**: Implement BroadcastChannel sync in `oracle.svelte.ts`. <!-- id: 3.3 -->

- [x] **Core: RAG Integration** <!-- id: 4 -->
    - [x] Implement `retrieveContext` with keyword fallback and redundancy filtering. <!-- id: 4.1 -->
    - [x] Prioritize currently selected entity in context. <!-- id: 4.2 -->

- [x] **UI: Oracle Interface** <!-- id: 5 -->
    - [x] Create `OracleChat.svelte` as a shared component. <!-- id: 5.1 -->
    - [x] Update `OracleWindow.svelte` with modal/pop-out toggles. <!-- id: 5.2 -->
    - [x] Create standalone Oracle page at `/oracle`. <!-- id: 5.3 -->
    - [x] **Direct Injection**: Add "Copy to Chronicle/Lore" buttons to messages. <!-- id: 5.4 -->

- [x] **Quality Assurance** <!-- id: 6 -->
    - [x] **Privacy Verification**: Verify NO requests are made unless key is present. <!-- id: 6.1 -->
    - [x] **Unit Testing**: Create `oracle.test.ts` for store logic. <!-- id: 6.2 -->
    - [x] Lint & Test. <!-- id: 6.3 -->

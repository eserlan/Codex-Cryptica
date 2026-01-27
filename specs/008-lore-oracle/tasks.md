# Tasks: Lore Oracle (Cloud)

- [ ] **Infrastructure: Dependencies** <!-- id: 1 -->
    - [ ] Uninstall `@mlc-ai/web-llm` (if installed). <!-- id: 1.1 -->
    - [ ] Install `@google/generative-ai` in `apps/web`. <!-- id: 1.2 -->

- [ ] **Core: Settings Management** <!-- id: 2 -->
    - [ ] Update `apps/web/src/lib/utils/idb.ts` (or settings store) to handle `ai_api_key`. <!-- id: 2.1 -->
    - [ ] Create `apps/web/src/lib/components/settings/AISettings.svelte` for key entry. <!-- id: 2.2 -->

- [ ] **Core: AI Service** <!-- id: 3 -->
    - [ ] Create/Update `apps/web/src/lib/services/ai.ts` to use Gemini API. <!-- id: 3.1 -->
    - [ ] Implement `apps/web/src/lib/stores/oracle.svelte.ts` for chat state. <!-- id: 3.2 -->

- [ ] **Core: RAG Integration** <!-- id: 4 -->
    - [ ] Implement `retrieveContext` in `ai.ts` using `searchService`. <!-- id: 4.1 -->

- [ ] **UI: Oracle Interface** <!-- id: 5 -->
    - [ ] Update `OracleWindow.svelte` to show "Configure API Key" if missing. <!-- id: 5.1 -->
    - [ ] Integrate `AISettings` into the main settings modal or Oracle window. <!-- id: 5.2 -->

- [ ] **Quality Assurance** <!-- id: 6 -->
    - [ ] **Privacy Verification**: Verify NO requests are made unless key is present. <!-- id: 6.1 -->
    - [ ] Lint & Test. <!-- id: 6.2 -->
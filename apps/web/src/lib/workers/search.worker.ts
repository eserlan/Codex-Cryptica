/// <reference lib="webworker" />

import { SearchEngine, exposeSearchEngine } from "@codex/search-engine";

const engine = new SearchEngine();
exposeSearchEngine(engine);

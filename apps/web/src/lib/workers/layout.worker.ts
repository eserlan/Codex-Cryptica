/// <reference lib="webworker" />

import { LayoutEngine, exposeLayoutEngine } from "graph-engine";

const engine = new LayoutEngine();
exposeLayoutEngine(engine);

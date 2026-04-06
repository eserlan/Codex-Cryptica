import "fake-indexeddb/auto";

// Fix Worker is not defined in jsdom environment
class MockWorker {
  constructor() {}
  postMessage() {}
  terminate() {}
  addEventListener() {}
  removeEventListener() {}
}

if (typeof window !== "undefined") {
  (window as any).Worker = MockWorker;
}
(global as any).Worker = MockWorker;

export const syncWorker = () => {
  // Ported from previous sync worker
  self.onmessage = (event) => {
    const { type, content } = event.data;
    if (type === 'PARSE_CONTENT') {
      console.log('Parsing content in Svelte worker:', content);
      // Logic would go here
      self.postMessage({ type: 'UPDATE_GRAPH', nodes: [] });
    }
  };
};

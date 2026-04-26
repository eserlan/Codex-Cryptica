const limit = 10000;
const start1 = performance.now();
const event = { newOrChangedIds: Array.from({ length: limit }, (_, i) => String(i)), entities: {} };
for (let i = 0; i < limit; i++) event.entities[i] = i % 2 === 0 ? { id: String(i) } : null;

// old
const chunk1 = event.newOrChangedIds.map((id) => event.entities[id]).filter(Boolean);
const end1 = performance.now();

const start2 = performance.now();
// new
const chunk2 = [];
for (const id of event.newOrChangedIds) {
  const entity = event.entities[id];
  if (entity) chunk2.push(entity);
}
const end2 = performance.now();
console.log(`Old: ${end1 - start1}ms`);
console.log(`New: ${end2 - start2}ms`);

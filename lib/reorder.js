// Moves the item with id `fromId` to sit where the item with id `toId`
// currently is, keeping every other item's relative order. Used by
// drag-and-drop reordering (see handleMilestoneDrop in
// JourneyDetailClient.js) — pulled out as a pure function so the actual
// array logic is testable without a browser/drag simulation.
//
// Returns a new array; the input is never mutated. If either id isn't
// found, or they're the same, returns the original array unchanged.
export function reorderById(items, fromId, toId) {
  if (fromId === toId) return items;

  const result = [...items];
  const fromIndex = result.findIndex((item) => item.id === fromId);
  const toIndex = result.findIndex((item) => item.id === toId);
  if (fromIndex === -1 || toIndex === -1) return items;

  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
}

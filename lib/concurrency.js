// Runs `worker(item)` for every item in `items`, never more than `limit`
// concurrently. A worker that throws is caught and swallowed here (after
// logging) so one bad item can never abort the rest of the batch — every
// caller today already handles its own errors internally, this is
// defense in depth for whatever calls this next.
export async function runWithConcurrencyLimit(items, limit, worker) {
  let index = 0;

  async function runNext() {
    while (index < items.length) {
      const current = index++;
      try {
        await worker(items[current], current);
      } catch (err) {
        console.error("runWithConcurrencyLimit: unexpected worker error", err);
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, runNext);
  await Promise.all(workers);
}

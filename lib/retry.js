// Retries a transient failure with exponential backoff — pulled out as a
// pure function so it's testable without a real network call. Only
// retries when isRetryable(error) says so; a permanent failure (bad
// phone number, invalid recipient) fails immediately instead of wasting
// attempts and delaying the caller for no benefit.
export async function withRetry(fn, { maxAttempts = 3, baseDelayMs = 500, isRetryable = () => true } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts || !isRetryable(err)) {
        throw err;
      }
      const delay = baseDelayMs * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

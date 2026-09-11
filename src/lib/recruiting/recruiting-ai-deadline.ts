export type BoundedProviderFetchOptions = {
  timeoutMs: number;
  maxAttempts?: number;
  isRetryable: (response: Response) => boolean;
  retryDelayMs: (response: Response, attempt: number) => number;
  statusError: (response: Response) => Error;
  timeoutError: () => Error;
  networkError: (error: unknown) => Error;
  fetcher?: typeof fetch;
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function boundedProviderFetch(
  url: string,
  init: RequestInit,
  options: BoundedProviderFetchOptions,
): Promise<Response> {
  const budgetMs = Math.max(50, Math.min(60_000, Math.round(options.timeoutMs)));
  const maxAttempts = Math.max(1, Math.min(3, Math.round(options.maxAttempts || 2)));
  const fetcher = options.fetcher || fetch;
  const deadline = Date.now() + budgetMs;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw options.timeoutError();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);
    let response: Response;
    try {
      response = await fetcher(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted || Date.now() >= deadline)
        throw options.timeoutError();
      if (attempt === maxAttempts - 1) throw options.networkError(error);
      const retryPause = Math.min(250 * (attempt + 1), Math.max(0, deadline - Date.now() - 1));
      if (retryPause > 0) await sleep(retryPause);
      continue;
    } finally {
      clearTimeout(timer);
    }

    if (response.ok) return response;
    if (!options.isRetryable(response) || attempt === maxAttempts - 1)
      throw options.statusError(response);

    const remainingAfterResponse = deadline - Date.now();
    if (remainingAfterResponse <= 0) throw options.timeoutError();
    const requestedDelay = Math.max(0, Math.round(options.retryDelayMs(response, attempt)));
    const boundedDelay = Math.min(requestedDelay, Math.max(0, remainingAfterResponse - 1));
    if (boundedDelay > 0) await sleep(boundedDelay);
  }

  throw options.timeoutError();
}

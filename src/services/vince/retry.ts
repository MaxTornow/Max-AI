/**
 * Submagic-specific HTTP retry helper and error message formatter.
 * Kept env-free so it can be unit-tested without import.meta.env.
 */

const RETRY_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [1000, 3000, 9000];
const isRetryableStatus = (status: number): boolean => status >= 500 || status === 429;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch with bounded exponential-backoff retry for transient failures
 * (5xx, 429, network errors). 4xx responses throw immediately.
 * Returns a Response with `ok === true` or throws.
 */
export const retryableFetch = async (
  input: RequestInfo | URL,
  init: RequestInit,
  errorPrefix: string
): Promise<Response> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_BACKOFF_MS[attempt - 1]);
    }

    let response: Response;
    try {
      response = await fetch(input, init);
    } catch (err) {
      lastError = err;
      console.warn(`${errorPrefix} (attempt ${attempt + 1}/${RETRY_ATTEMPTS}):`, err);
      continue;
    }

    if (response.ok) {
      return response;
    }

    const body = await response.text();
    const error = new Error(`${errorPrefix}: ${response.status} - ${body}`);

    if (!isRetryableStatus(response.status)) {
      throw error;
    }

    lastError = error;
    console.warn(`${errorPrefix} (attempt ${attempt + 1}/${RETRY_ATTEMPTS}):`, response.status);
  }

  throw lastError;
};

/**
 * Translate raw caught errors into user-facing strings.
 * Currently humanizes Submagic's INSUFFICIENT_CREDITS into a contact-support message;
 * everything else passes through unchanged.
 */
export const formatSubmagicErrorMessage = (err: unknown): string => {
  if (!(err instanceof Error)) {
    return 'An error occurred';
  }
  if (err.message.includes('INSUFFICIENT_CREDITS')) {
    return 'Out of processing credits. Please contact support.';
  }
  return err.message;
};

const SUPABASE_FETCH_TIMEOUT_MS = 8_000;

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {}
) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    SUPABASE_FETCH_TIMEOUT_MS
  );

  if (init.signal) {
    if (init.signal.aborted) {
      controller.abort(init.signal.reason);
    } else {
      init.signal.addEventListener(
        "abort",
        () => controller.abort(init.signal?.reason),
        { once: true }
      );
    }
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class RateLimitedError extends Error {
  constructor(message = "Rate limited by upstream provider") {
    super(message);
    this.name = "RateLimitedError";
  }
}

export class UpstreamTimeoutError extends Error {
  constructor(message = "Upstream request timed out") {
    super(message);
    this.name = "UpstreamTimeoutError";
  }
}

export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new UpstreamTimeoutError();
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

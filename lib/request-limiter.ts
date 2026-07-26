// Caps how many requests to the WordPress origin (REST + GraphQL combined)
// are ever in flight at once. During static generation Next.js spins up one
// worker per CPU core (29 on Vercel's build machine) and each worker fetches
// independently - with ~1200 posts that's enough simultaneous traffic to
// overwhelm a modest WP host, causing every in-flight page to hit Next.js's
// 60s per-page timeout at once rather than any single request failing on its
// own. This throttles concurrency at the source instead of at Next.js's
// worker count, so it's effective build-time and at runtime alike.
const MAX_CONCURRENT_REQUESTS = 6;

let active = 0;
const queue: Array<() => void> = [];

function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT_REQUESTS) {
    active++;
    return Promise.resolve();
  }
  return new Promise((resolve) => queue.push(resolve));
}

function release(): void {
  active--;
  const next = queue.shift();
  if (next) {
    active++;
    next();
  }
}

export async function withRequestLimit<T>(fn: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}

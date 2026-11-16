// make.fun's public API: read-only GET requests, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
//
// Every answer is cached in memory by URL together with its ETag. A repeat call within
// the same view is free; a later call revalidates with If-None-Match, and the API's
// minute-bound ETags answer 304 when nothing the client can see has changed, so the
// cached body is served again. Concurrent calls to the same URL share one request.

const API = 'https://make.fun/api';

const cache = new Map(); // url -> { etag, body }
const inflight = new Map(); // url -> Promise<body>

/** Set by the shell: called with the time whenever a fresh (200) body arrives. */
export let onFreshData = () => {};

export function setOnFreshData(fn) {
  onFreshData = fn;
}

async function get(path) {
  const url = API + path;
  const hit = cache.get(url);
  if (hit && hit.fresh) return hit.body;
  if (inflight.has(url)) return inflight.get(url);
  const request = (async () => {
    const headers = {};
    if (hit?.etag) headers['If-None-Match'] = hit.etag;
    const res = await fetch(url, { headers });
    if (res.status === 304 && hit) {
      hit.fresh = true;
      return hit.body;
    }
    if (!res.ok) throw new Error(`make.fun API answered ${res.status} for ${path}`);
    const body = await res.json();
    cache.set(url, { etag: res.headers.get('etag'), body, fresh: true });
    onFreshData(new Date());
    return body;
  })();
  inflight.set(url, request);
  try {
    return await request;
  } finally {
    inflight.delete(url);
  }
}

/** Mark every cached answer stale, so the next get() revalidates it against its ETag. */
export function revalidate() {
  for (const hit of cache.values()) hit.fresh = false;
}

/** Drop one cached answer entirely (the retry button after an error). */
export function forget(path) {
  cache.delete(API + path);
}

/** The competitions list: { items: [...], next_cursor }. activity=times keeps it lean. */
export const getCompetitions = (status = 'open') =>
  get(`/competitions?status=${encodeURIComponent(status)}&activity=times&limit=100`);

/** One competition in full: description, rules, the live payout curve, phases. */
export const getCompetition = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** A competition's leaderboard: { columns: [...], entries: [...], rank_key, phase, ... }. */
export const getLeaderboard = (slug) => get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** An account's public profile: record, linked accounts and its entries ("solutions"). */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);

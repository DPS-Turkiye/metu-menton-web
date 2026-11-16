import "server-only";

type Window = { count: number; endsAt: number };

export type RateLimitAnswer =
  { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * Fixed-window counts kept in this server's memory, at most `maxKeys` of them: when full, ended windows go first,
 * then the oldest, which forgets their spending. Each server instance counts on its own.
 */
export function createRateLimiter(
  limit: number,
  windowMs: number,
  maxKeys = 10_000,
) {
  const windows = new Map<string, Window>();

  function makeRoom(now: number) {
    for (const [key, window] of windows) {
      if (window.endsAt <= now) windows.delete(key);
    }
    for (const key of windows.keys()) {
      if (windows.size < maxKeys) break;
      windows.delete(key);
    }
  }

  return function take(key: string, now = Date.now()): RateLimitAnswer {
    let window = windows.get(key);
    if (!window || window.endsAt <= now) {
      if (!window && windows.size >= maxKeys) makeRoom(now);
      window = { count: 0, endsAt: now + windowMs };
      windows.set(key, window);
    }
    if (window.count >= limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((window.endsAt - now) / 1000)),
      };
    }
    window.count += 1;
    return { allowed: true };
  };
}

/**
 * The caller's address as the proxy in front of this server saw it: the last X-Forwarded-For entry, since the
 * earlier ones are whatever the caller wrote. This trusts exactly one proxy hop, as the backend does; behind more
 * hops, or with none, it has to change with the deployment. An IPv6 caller counts by its /64, which one machine
 * usually holds whole, so walking through its addresses buys no new budget.
 */
export function clientAddress(headers: Headers): string {
  const last = headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  if (last === undefined || last === "") return "unknown";
  return last.includes(":") ? ipv6Network(last) : last;
}

function ipv6Network(address: string) {
  const [head = "", tail] = address.toLowerCase().split("::");
  const front = head === "" ? [] : head.split(":");
  const back = tail === undefined || tail === "" ? [] : tail.split(":");
  const missing = tail === undefined ? 0 : 8 - front.length - back.length;
  const groups = [...front, ...Array<string>(missing).fill("0"), ...back];
  return `${groups
    .slice(0, 4)
    .map((group) => group.replace(/^0+(?=.)/, ""))
    .join(":")}::/64`;
}

interface WindowState {
  count: number;
  resetsAt: number;
  active: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  release: () => void;
}

export class InMemoryRateLimiter {
  private readonly states = new Map<string, WindowState>();

  consume(
    key: string,
    limit: number,
    windowMs: number,
    maxActive: number,
  ): RateLimitDecision {
    const now = Date.now();
    const current = this.states.get(key);
    const state =
      !current || current.resetsAt <= now
        ? { count: 0, resetsAt: now + windowMs, active: current?.active ?? 0 }
        : current;
    const allowed = state.count < limit && state.active < maxActive;

    if (allowed) {
      state.count += 1;
      state.active += 1;
    }
    this.states.set(key, state);

    let released = false;
    return {
      allowed,
      remaining: Math.max(0, limit - state.count),
      retryAfterSeconds: Math.max(1, Math.ceil((state.resetsAt - now) / 1_000)),
      release: () => {
        if (!allowed || released) return;
        released = true;
        state.active = Math.max(0, state.active - 1);
      },
    };
  }
}

export const requestRateLimiter = new InMemoryRateLimiter();
export const providerRateLimiter = new InMemoryRateLimiter();

export function getClientKey(request: Request): string {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

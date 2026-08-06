import { NextResponse } from "next/server";
import { checkUsername } from "@/lib/checker";
import { mapWithConcurrency } from "@/lib/bulk/input";
import { retryTemporaryFailure } from "@/lib/bulk/retry";
import { createBulkRequestSchema } from "@/lib/bulk/schema";
import { env } from "@/lib/env";
import { getClientKey, requestRateLimiter } from "@/lib/rate-limit/memory";
import { normalizeUsername } from "@/lib/validation/username";
import type { CheckResult } from "@/types/check";

const bulkSchema = createBulkRequestSchema(env.bulkMaxNames);

function uniqueNames(usernames: string[]): {
  names: string[];
  duplicatesRemoved: number;
} {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const username of usernames) {
    const key = normalizeUsername(username);
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(username);
  }
  return { names, duplicatesRemoved: usernames.length - names.length };
}

async function checkWithRetry(username: string): Promise<CheckResult> {
  return retryTemporaryFailure(
    (attempt) => checkUsername(username, undefined, { skipCache: attempt > 0 }),
    env.retryLimit,
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  const rate = requestRateLimiter.consume(
    `bulk:${getClientKey(request)}`,
    env.bulkRateLimit,
    60_000,
    1,
  );
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many bulk searches. Please wait before trying again." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "The request body must be valid JSON." },
        { status: 400 },
      );
    }
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Submit between 1 and ${env.bulkMaxNames} usernames.` },
        { status: 400 },
      );
    }

    const { names, duplicatesRemoved } = uniqueNames(parsed.data.usernames);
    const results = await mapWithConcurrency(
      names,
      env.bulkConcurrency,
      async (username) => {
        try {
          return await checkWithRetry(username);
        } catch {
          const now = new Date().toISOString();
          return {
            query: username.trim(),
            normalizedUsername: normalizeUsername(username),
            status: "error",
            confidence: "unknown",
            summary: "An unexpected application error interrupted this check.",
            confidenceExplanation: "No safe provider result was produced.",
            checkedAt: now,
            responseTimeMs: 0,
            sources: [],
            warnings: ["Try this username again later."],
          } satisfies CheckResult;
        }
      },
    );

    return NextResponse.json(
      {
        totalSubmitted: parsed.data.usernames.length,
        totalProcessed: results.length,
        duplicatesRemoved,
        checkedAt: new Date().toISOString(),
        results,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-RateLimit-Remaining": String(rate.remaining),
        },
      },
    );
  } finally {
    rate.release();
  }
}

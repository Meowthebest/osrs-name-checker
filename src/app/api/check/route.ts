import { NextResponse } from "next/server";
import { z } from "zod";
import { checkUsername } from "@/lib/checker";
import { env } from "@/lib/env";
import { getClientKey, requestRateLimiter } from "@/lib/rate-limit/memory";

const querySchema = z.object({
  username: z.string().max(100),
});

export async function GET(request: Request): Promise<NextResponse> {
  const parsed = querySchema.safeParse({
    username: new URL(request.url).searchParams.get("username"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Provide one username in the username query parameter." },
      { status: 400 },
    );
  }

  const rate = requestRateLimiter.consume(
    `single:${getClientKey(request)}`,
    env.singleRateLimit,
    60_000,
    3,
  );
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many searches. Please wait and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  try {
    const result = await checkUsername(parsed.data.username);
    const status =
      result.status === "invalid"
        ? 422
        : result.status === "rate_limited"
          ? 429
          : 200;
    return NextResponse.json(result, {
      status,
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate",
        "X-RateLimit-Remaining": String(rate.remaining),
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "The search could not be completed because of an unexpected application error.",
      },
      { status: 500 },
    );
  } finally {
    rate.release();
  }
}

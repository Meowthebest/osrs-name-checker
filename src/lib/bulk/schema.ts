import { z } from "zod";

export function createBulkRequestSchema(maxNames: number) {
  return z.object({
    usernames: z.array(z.string().max(100)).min(1).max(maxNames),
  });
}

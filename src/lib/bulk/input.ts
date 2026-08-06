import { validateUsername } from "@/lib/validation/username";
import type { ValidationResult } from "@/types/check";

export interface ProcessedBulkInput {
  entered: number;
  duplicatesRemoved: number;
  valid: ValidationResult[];
  invalid: ValidationResult[];
  all: ValidationResult[];
}

export function splitBulkInput(input: string): string[] {
  return input
    .replace(/^\uFEFF/, "")
    .split(/[\r\n,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function processBulkInput(input: string): ProcessedBulkInput {
  const values = splitBulkInput(input);
  const seen = new Set<string>();
  const all: ValidationResult[] = [];
  let duplicatesRemoved = 0;

  for (const value of values) {
    const validation = validateUsername(value);
    if (seen.has(validation.normalized)) {
      duplicatesRemoved += 1;
      continue;
    }
    seen.add(validation.normalized);
    all.push(validation);
  }

  return {
    entered: values.length,
    duplicatesRemoved,
    valid: all.filter((entry) => entry.valid),
    invalid: all.filter((entry) => !entry.valid),
    all,
  };
}

export async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    async () => {
      while (nextIndex < values.length) {
        const index = nextIndex++;
        results[index] = await mapper(values[index] as T, index);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

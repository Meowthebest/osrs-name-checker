import type { ProviderResult } from "@/types/check";

export interface UsernameProvider {
  readonly id: string;
  readonly name: string;
  readonly official: boolean;
  check(username: string): Promise<ProviderResult>;
}

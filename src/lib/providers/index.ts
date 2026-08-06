import { OsrsHiscoresProvider } from "./osrs-hiscores";
import { TempleOsrsProvider } from "./temple-osrs";
import type { UsernameProvider } from "./types";
import { WiseOldManProvider } from "./wise-old-man";

export const providers: UsernameProvider[] = [
  new OsrsHiscoresProvider(),
  new WiseOldManProvider(),
  new TempleOsrsProvider(),
];

export type { UsernameProvider } from "./types";

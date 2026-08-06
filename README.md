# OSRS Name Checker

A transparent, unofficial web app for checking whether an Old School RuneScape username has public evidence of being taken. It supports single checks, bulk imports, a controlled search queue, local shortlists, safe exports, and an optional name generator.

The app never reports a guaranteed **Available** result. A name absent from Hiscores or public trackers may still be unranked, inactive, reserved, recently changed, filtered, inappropriate, or otherwise unavailable.

## Screenshots

| Single checker                    | Bulk workspace                    | Generator                         |
| --------------------------------- | --------------------------------- | --------------------------------- |
| _Add screenshot after deployment_ | _Add screenshot after deployment_ | _Add screenshot after deployment_ |

## Features

- Single search with source-by-source evidence and confidence labels
- Bulk import from pasted text, `.txt`, or `.csv` (100 names by default)
- Case-insensitive duplicate removal with repeated-whitespace normalization
- Controlled provider concurrency, timeouts, one temporary-failure retry, and abortable client batches
- Pause, resume, and stop controls that preserve completed results
- Filters, sorting, username search, responsive cards, and expandable evidence
- Browser-local search history, bulk restoration, and a 100-name shortlist
- CSV/JSON exports with correct escaping and CSV-formula-injection protection
- Selective OSRS name generator; generated ideas are never checked automatically
- Server-side provider calls, response cache, per-IP request limits, and safe errors
- No login, database, browser-exposed secret, IP storage, or continuous monitoring

## Status model

| Status                 | Meaning                                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Taken**              | One reliable exact-match source found the player. Official or multiple-source matches are high confidence.                 |
| **Possibly available** | At least two sources returned no match and no source found the name. This is low confidence and not proof of claimability. |
| **Invalid**            | The input violates the validated syntax rules. No provider is called.                                                      |
| **Unknown**            | Too few sources responded, providers failed, or the evidence cannot be interpreted safely.                                 |
| **Rate limited**       | Rate limiting left too little evidence for a safe classification.                                                          |
| **Error**              | An unexpected application-level failure occurred.                                                                          |

## Verified username rules

The validator follows Jagex's current account-support form: character names are **1–12 characters** and may contain **letters, numbers, hyphens, spaces, and underscores**. It also requires at least one letter or number so separator-only input is not sent to providers.

- Leading/trailing whitespace is trimmed.
- Repeated whitespace is collapsed for display.
- Repeated whitespace is normalized for case-insensitive comparison and duplicate detection; permitted hyphens and underscores remain distinct.
- The trimmed display spelling is preserved in results.

Sources: [Jagex character-name support](https://support.runescape.com/hc/en-gb/articles/206519409-Character-names) and [Jagex account-support form](https://support.runescape.com/hc/en-gb/requests/new?ticket_form_id=360000062689).

Jagex does not expose a public, unauthenticated endpoint that guarantees a name can be claimed. Its support page states that an unavailable desired name may be inappropriate or already in use and that previous names can remain reserved. The official in-game name-change interface is the final check.

## Providers

The provider audit is documented in detail in [PROVIDERS.md](./docs/PROVIDERS.md).

| Provider                        | Type           | Used | What a match confirms                                           |
| ------------------------------- | -------------- | ---- | --------------------------------------------------------------- |
| OSRS Hiscores `index_lite.ws`   | Official Jagex | Yes  | The queried name has a ranked OSRS Hiscores record.             |
| Wise Old Man v2 player endpoint | Third party    | Yes  | Wise Old Man returned an exact normalized tracked-player match. |
| TempleOSRS player information   | Third party    | Yes  | TempleOSRS returned an exact normalized tracked-player match.   |

No HTML scraping, authenticated Jagex account endpoints, undocumented endpoints, Cloudflare bypass, bot-protection bypass, or rate-limit evasion is used.

## Technology

- Next.js 16 App Router and React 19
- TypeScript 6
- Tailwind CSS 4
- Zod 4
- Vitest 4
- ESLint 9 and Prettier 3
- GitHub Actions
- Vercel-compatible server routes

## Local setup

Requirements: Node.js 20.9 or newer and npm.

```bash
git clone https://github.com/your-username/osrs-name-checker.git
cd osrs-name-checker
cp .env.example .env.local
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Set `APP_USER_AGENT` to an identifiable value containing a project or contact URL before public deployment.

## Environment variables

| Variable                   |                 Default | Purpose                                                         |
| -------------------------- | ----------------------: | --------------------------------------------------------------- |
| `SEARCH_CACHE_TTL_SECONDS` |                    `60` | In-process response cache duration (clamped to 10–300 seconds). |
| `SINGLE_SEARCH_RATE_LIMIT` |                    `20` | Single-search requests allowed per IP per 60-second window.     |
| `BULK_SEARCH_RATE_LIMIT`   |                     `5` | Bulk requests allowed per IP per 60-second window.              |
| `BULK_SEARCH_MAX_NAMES`    |                   `100` | Maximum usernames accepted by one bulk request (1–250).         |
| `BULK_SEARCH_CONCURRENCY`  |                     `4` | Concurrent username checks inside a bulk request (1–8).         |
| `BULK_SEARCH_RETRY_LIMIT`  |                     `1` | Retry count for all-provider temporary network failure (0–1).   |
| `PROVIDER_TIMEOUT_MS`      |                  `5000` | Per-provider timeout (1–15 seconds).                            |
| `APP_USER_AGENT`           |      Example project UA | Identifies server-side provider requests.                       |
| `NEXT_PUBLIC_SITE_URL`     | `http://localhost:3000` | Canonical origin used by metadata, robots, and sitemap.         |

Only the public site URL is exposed to the browser. There are no provider API keys in v1.

## Commands

```bash
npm run dev           # local development
npm run lint          # ESLint
npm run format:check  # Prettier verification
npm run typecheck     # TypeScript without emit
npm test              # mocked automated tests
npm run build         # production build
npm start             # serve the production build
```

Tests mock every provider and do not depend on live external services.

## API

### Single check

```http
GET /api/check?username=Zezima
```

```bash
curl "http://localhost:3000/api/check?username=Zezima"
```

Successful and conclusive responses use HTTP `200`. Invalid names use `422`, request-level limits use `429`, malformed input uses `400`, and unexpected application failures use `500`.

### Bulk check

```http
POST /api/check/bulk
Content-Type: application/json
```

```json
{
  "usernames": ["Zezima", "Rune Player", "Iron Example"]
}
```

```bash
curl -X POST "http://localhost:3000/api/check/bulk" \
  -H "Content-Type: application/json" \
  -d '{"usernames":["Zezima","Rune Player","Iron Example"]}'
```

The endpoint validates with Zod, removes normalized duplicates, enforces the configured maximum, uses the same shared checker as the single route, and processes names with bounded concurrency. Every unique submitted name receives a result, including invalid or application-error entries.

The browser splits larger work into batches of 10 and cools down for 31 seconds between batches. This keeps pause/stop practical, stays below the default five-bulk-request window, and caps Wise Old Man traffic at no more than 20 names per minute from this workflow.

## Reliability and privacy

- Provider calls use `Promise.allSettled()` so one outage does not break a search.
- Each provider request has an `AbortController` timeout.
- Provider-level fixed windows cap anonymous Wise Old Man and TempleOSRS traffic at 20 requests per minute per app instance; direct oversized API calls receive partial rate-limited evidence instead of bypassing the cap.
- The server caches normalized results briefly and never converts errors to availability.
- In-memory per-IP windows limit request rate and active requests without persisting IP addresses.
- Recent checks, the latest bulk workspace, and shortlist are stored only in browser `localStorage`.
- Browser-storage failures are handled without crashing the app.

For a high-traffic multi-instance deployment, replace the in-memory limiter/cache with a privacy-reviewed distributed implementation or enforce equivalent limits at the edge. Vercel instances do not share process memory.

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import it in Vercel as a Next.js project.
3. Add the variables from `.env.example`; set `NEXT_PUBLIC_SITE_URL` to the production HTTPS origin and use an identifiable `APP_USER_AGENT`.
4. Deploy. No database, scheduled job, or background worker is required.
5. Verify `/`, `/bulk`, `/generator`, `/robots.txt`, `/sitemap.xml`, and both API routes.

## Publish to GitHub

```bash
git init
git checkout -b main
git add -- <confirmed project files>
git commit -m "Initialize OSRS Name Checker"
git remote add origin git@github.com:YOUR_USERNAME/osrs-name-checker.git
git push -u origin main
```

For a real contribution history, use focused commits for the validation/provider engine, single UI, bulk workflow, generator, tests, and repository documentation. Do not commit `.env.local`.

## Known limitations

- Public sources cannot guarantee claimability; only the in-game flow can.
- Hiscores excludes unranked and removed-name characters.
- Third-party profiles may be absent or stale.
- Jagex and TempleOSRS do not publish a numeric rate limit for the read-only endpoints used here.
- In-memory cache and rate-limit state are isolated per server instance.
- Stopping a browser request aborts delivery to the browser; an already-started serverless invocation may finish its current provider requests.
- Combat level is available only when a provider returns it.
- Generated names are ideas, not reservations.

## Future improvements

- Optional distributed rate limiting and cache for multi-instance deployments
- End-to-end accessibility tests with Playwright
- Provider health telemetry without IP or username retention
- Config endpoint so a non-default server bulk maximum is reflected dynamically in the UI
- Locale-aware interface copy

## Contributing and security

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [SECURITY.md](./SECURITY.md). By contributing, you agree that your contribution is licensed under the MIT License.

## Trademark disclaimer

OSRS Name Checker is an unofficial community tool and is not endorsed by or affiliated with Jagex. RuneScape and Old School RuneScape are trademarks of Jagex Ltd.

## License

[MIT](./LICENSE)

# Provider audit

Reviewed on **2026-08-06**. This document records why each source is or is not used. Re-review providers before materially increasing traffic.

## OSRS Hiscores

- **Owner:** Jagex (official)
- **Endpoint:** `GET https://secure.runescape.com/m=hiscore_oldschool/index_lite.ws?player={USERNAME}`
- **Authentication:** None
- **Published numeric rate limit:** Not found
- **Used:** Yes
- **Confirms:** A successful, parseable response is official evidence that the queried name has a ranked OSRS Hiscores record.
- **Cannot confirm:** A `404` does not mean the name is claimable. The character can be unranked, have a missing/removed name, be reserved, or be unavailable for another reason. The response does not contain the queried display spelling or combat level.
- **Reliability controls:** Server-side only, identifiable User-Agent, five-second default timeout, short cache, four-request active cap, 60-request local safety window, and no automatic continuous checks.
- **Restrictions:** Read-only public endpoint. Review [Jagex Terms](https://www.jagex.com/en-GB/terms) and [Rules of RuneScape](https://www.jagex.com/en-GB/terms/rules-of-runescape) for your deployment.

## Wise Old Man

- **Owner:** Wise Old Man (third party, open source)
- **Endpoint:** `GET https://api.wiseoldman.net/v2/players/{USERNAME}`
- **Authentication:** None at the default tier; optional API keys can raise limits.
- **Published rate limit:** 20 requests per 60 seconds without an API key; documentation says registration can raise this to 100.
- **Used:** Yes
- **Confirms:** An exact normalized `displayName`/`username` match confirms that Wise Old Man tracks a profile under that name.
- **Cannot confirm:** A `404` does not prove availability. A tracked profile may be stale, and Wise Old Man is not Jagex.
- **Reliability controls:** Exact-match comparison, no partial search endpoint, server timeout, four-request active cap, hard 20-request local window, cache, and a 31-second client cooldown between 10-name bulk batches to stay within 20 requests per minute.
- **Documentation:** [Introduction and limits](https://docs.wiseoldman.net/) and [player endpoint](https://docs.wiseoldman.net/api/players/player-endpoints).

## TempleOSRS

- **Owner:** TempleOSRS (third party)
- **Endpoint:** `GET https://templeosrs.com/api/player_info.php?player={USERNAME}&formattedrsn=1`
- **Authentication:** None documented for this endpoint
- **Published numeric rate limit:** Not found in the API documentation
- **Used:** Yes, conservatively
- **Confirms:** An exact normalized response name confirms that TempleOSRS tracks a profile under that name.
- **Cannot confirm:** A missing profile does not prove availability. Data is tracker-owned and may be absent or stale.
- **Reliability controls:** Exact-match comparison, strict response parsing, local timeouts, four-request active cap, conservative 20-request local window, controlled concurrency, and no retries after `429`.
- **Documentation:** [TempleOSRS API](https://templeosrs.com/api_doc.php) and [FAQ](https://templeosrs.com/faq.php).

## Considered but not used

### Wise Old Man partial search

Rejected because the exact player endpoint is safer. Partial results create avoidable ambiguity and would require additional exact-match handling.

### TempleOSRS update endpoints

Rejected because this app should not mutate or refresh third-party tracker data merely to check a name.

### RuneProfile

The documented read-only API was considered, but adding a fourth tracker would increase request volume without changing the core limitation. It can be reviewed later if provider diversity becomes necessary.

### HTML scraping and account-management flows

Rejected. The app does not scrape profile pages when documented APIs exist, access authenticated Jagex name-change/account endpoints, reverse-engineer account creation, use private or undocumented endpoints, bypass Cloudflare or bot protections, or evade rate limits.

## Classification policy

- Any exact match can produce **Taken**.
- Official Hiscores or multiple exact tracker matches produce **High** confidence.
- One exact third-party match produces **Medium** confidence.
- At least two successful no-match responses with no match and at most one failed source produce **Possibly available / Low**.
- Provider errors, timeouts, and rate limits never count as no-match evidence.
- Too little evidence produces **Unknown** or **Rate limited**.

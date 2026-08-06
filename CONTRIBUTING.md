# Contributing

Thanks for improving OSRS Name Checker.

1. Open an issue for behavior changes, provider additions, or changes that increase external traffic.
2. Create a focused branch from `main`.
3. Keep provider calls documented, read-only, exact-match based, and rate conscious.
4. Add or update mocked tests. Tests must not call live external services.
5. Run the complete local gate:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

6. Open a pull request using the template.

Do not add scraping, protection bypasses, private endpoints, secrets, continuous monitoring, or logic that treats missing public data as guaranteed availability.

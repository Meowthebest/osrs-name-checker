# Security policy

## Supported version

Security fixes are applied to the latest release on `main`.

## Reporting a vulnerability

Please do not open a public issue for exploitable vulnerabilities. Use GitHub's private vulnerability-reporting feature for this repository. Include impact, reproduction steps, affected routes, and any suggested mitigation.

Do not include real credentials, authentication tokens, IP addresses, or other sensitive user data. This project should not require provider credentials in v1.

## Security expectations

- Keep all provider traffic server-side.
- Never commit `.env.local` or secrets.
- Preserve Zod validation, timeouts, concurrency limits, request limits, and safe error messages.
- Treat provider output as untrusted data.
- Do not weaken CSV-formula-injection protection.
- Do not add authenticated Jagex account-management access or protection bypasses.

# Security Policy

## Supported Versions

The project is under initial development. Once `1.0.0` is published, the latest
release line receives security fixes:

| Version | Supported |
|---------|-----------|
| 0.x (pre-release, unpublished) | ✅ latest only |
| 1.x | ✅ latest minor |

## Reporting a Vulnerability

Please **do not open public issues** for security problems.

Report vulnerabilities privately through GitHub's
[security advisory](https://github.com/byteforce-cn/workbook/security/advisories/new)
form (repository **Security** tab → *Report a vulnerability*).

Please include:

- affected version(s) and environment,
- a description of the issue and its impact,
- a minimal reproduction (schema JSON / config / code),
- any suggested mitigation you can share.

What to expect:

- **Acknowledgement** within 72 hours.
- An assessment and remediation plan within 7 days.
- A fix shipped as soon as practical (typically ≤ 30 days for high severity),
  with credit in the release notes unless you prefer to stay anonymous.

We follow coordinated disclosure: we will agree on a publication date with you
once a fix is available, and publish a GitHub Security Advisory describing the
issue.

## Scope notes

- The library performs client-side rendering only; there is no server component.
- Known hardening features you can rely on: HTML sanitization for rich text
  (`sanitizeHtml`), strict TypeScript, and no `eval`/dynamic code execution.
- Remote option sources and asset loading fetch URLs you configure — treat
  those endpoints as part of your own trust boundary.

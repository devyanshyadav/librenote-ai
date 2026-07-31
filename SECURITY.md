# Security Policy

## Supported versions

Security fixes are provided for the latest release on the `main` branch.

| Version | Supported |
|---------|-----------|
| Latest `main` | Yes |
| Older tags / forks | Best effort |

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues privately by emailing:

**[hello@devyanshyadav.com](mailto:hello@devyanshyadav.com)**

Include:

- A description of the issue and potential impact
- Steps to reproduce (proof of concept if available)
- Affected version or commit hash

You should receive a response within **72 hours**. If the issue is confirmed, we will work on a fix and coordinate disclosure before any public details are shared.

## Scope

This policy covers the LibreNote AI application repository (self-hosted Next.js app, API routes, setup scripts, and database schema).

Out of scope:

- Vulnerabilities in third-party services you configure (Supabase, OpenRouter, Docker, etc.)
- Deployments misconfigured by operators (exposed `.env` files, open database ports, weak passwords)
- Social engineering or phishing targeting your instance

## For self-hosted operators

If you deploy LibreNote AI for others:

- Keep dependencies updated (`bun install` / lockfile refresh)
- Never commit `.env` or `.env.local` to version control
- Use HTTPS in production and restrict database access
- Rotate `OPENROUTER_API_KEY` and database credentials if compromised

## Preferred languages

English.

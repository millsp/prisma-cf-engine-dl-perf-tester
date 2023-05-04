# Cloudflare Download Performance Tester for Prisma Engines

Tests the download performance of Prisma Engines using Cloudflare or AWS.

## Usage

```bash
pnpm run test
```

## setup

1. Ensure to be using Node 18
1. Install [pnpm](https://pnpm.io/installation)
1. Install dependencies: `pnpm i`
1. Deploy the Worker `pnpm wrangler publish`
1. Install `expressvpn` and login
1. Inspect `config.json` and adjust as needed
1. Run `pnpm run test`
# Pinboard (v1 source overlay)

Built from the Pinboard PRD v1.1. This is the app code laid over a standard T3 scaffold, so you get the exact versions your tooling expects.

## Setup
This is a complete project (package.json, configs, tRPC client included).
```bash
bun install            # or npm install
cp .env.example .env   # then fill it in (see comments inside)
bun run db:push        # creates the tables in your Prisma Postgres database
bun run dev
```
Moderate at `/moderate`. Schedule `bun run cleanup` nightly.

To make `MOD_PASSPHRASE_HASH`:
`bun -e 'import {randomBytes,scryptSync} from "crypto";const s=randomBytes(16).toString("hex");console.log(s+":"+scryptSync(process.argv[1],s,32).toString("hex"))' "your passphrase"`

Stack: Next.js 15 (App Router), React 19, tRPC 11, Prisma 6, Tailwind 4, Leaflet.

## Not in this first build
Shareable post links (P-7), the edit-by-secret screen (the `kindness.editByToken` API is done), the 4 unit-test files and Playwright flows, and the 3 leftover accessibility items (focus trap in the sheet, keyboard pin drop, screen-reader live map summary beyond the basic label).

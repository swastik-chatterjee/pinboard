# Pinboard (v1 source overlay)

Built from the Pinboard PRD v1.1. This is the app code laid over a standard T3 scaffold.

## Setup

This is a complete project (package.json, configs, tRPC client included).

```bash
bun install
cp .env.example .env
# Fill in DATABASE_URL and other values described in .env.example
bun run db:push
bun run dev
```

Moderate at `/moderate`. Schedule `bun run cleanup` nightly.

To make `MOD_PASSPHRASE_HASH`:

```bash
bun -e 'import {randomBytes,scryptSync} from "crypto";const s=randomBytes(16).toString("hex");console.log(s+":"+scryptSync(process.argv[1],s,32).toString("hex"))' "your passphrase"
```

Stack: Next.js 16, React 19, tRPC 11, Prisma 7, Tailwind 4, Leaflet.

## Development

```bash
bun run typecheck
bun run build
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

Pinboard is licensed under the Mozilla Public License 2.0. See [LICENSE](LICENSE). Third-party dependencies are documented in [THIRD_PARTY.md](THIRD_PARTY.md).

## Not in this first build

Shareable post links, the edit-by-secret screen, unit and Playwright test suites, and several remaining accessibility improvements.

# Contributing to Pinboard

Thanks for your interest in improving Pinboard! Contributions of bug reports, documentation, accessibility improvements, and code are welcome.

## Before you start

- For significant changes, open an issue first to discuss the proposed approach.
- Check existing issues and pull requests to avoid duplicating work.
- Be respectful and follow the [Code of Conduct](CODE%20OF%20CONDUCT.md).

## Development setup

1. Install [Bun](https://bun.sh/) and PostgreSQL.
2. Clone the repository and install dependencies:

   ```bash
   bun install
   ```

3. Copy `.env.example` to `.env` and set `DATABASE_URL` and the other required environment values.
4. Apply the Prisma schema to your development database and start the app:

   ```bash
   bun run db:push
   bun run dev
   ```

Prisma Client is generated during install and before production builds. After changing `prisma/schema.prisma`, regenerate it with `bunx prisma generate` (or run `bun run build`).

## Making changes

- Create a focused branch for your change.
- Keep changes small and consistent with the existing TypeScript style.
- Do not commit credentials, `.env` files, generated Prisma Client output, or unrelated formatting changes.
- Update documentation when setup, behavior, or configuration changes.
- For database changes, update `prisma/schema.prisma` and explain any data migration or compatibility concerns in your pull request.

## Checks

Run these before submitting a pull request:

```bash
bun run typecheck
bun run build
```

The build generates Prisma Client and requires the environment to be configured. Run `bun run db:push` only against a local or disposable development database; never use it to apply unreviewed schema changes to production.

## Pull requests

- Describe the problem and the solution, and link related issues.
- Include screenshots or steps to verify user-facing changes when useful.
- Call out database, security, accessibility, or configuration impacts.
- Confirm that the checks above pass, or explain any checks you could not run.

## Reporting security issues

Do not include sensitive vulnerability details in a public issue. Contact the project maintainers privately through GitHub instead.

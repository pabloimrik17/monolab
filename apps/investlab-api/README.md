# investlab-api

Hono API behind the InvestLab SSR web app.

## Environment

Env is declared in `.env.schema` and loaded by [Varlock](https://varlock.dev) (`varlock/auto-load` in `src/index.ts`; `db:migrate`/`db:generate` use `varlock run`). Secrets resolve from 1Password (desktop app auth, `op` CLI required): vault `monolab-dev`, item `investlab`, fields `finnhub-api-key` and `api-token` (shared with `apps/investlab`). Check with `pnpm exec varlock load`. Override locally with a gitignored `.env.local`.

CI needs no 1Password: `APP_ENV` resolves to `ci` and `.env.ci` supplies placeholders.

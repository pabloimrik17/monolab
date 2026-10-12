# InvestLab

React Router v8 investment tracker (SSR). All data comes from `apps/investlab-api`: loaders, actions and the
`/api/quotes` resource route call it with a bearer token; the browser only talks to this app.

## Environment Setup

Env is declared in `.env.schema` and loaded with [Varlock](https://varlock.dev); secrets resolve from 1Password.

1. Install the 1Password desktop app, sign in, and enable Settings > Developer > "Integrate with 1Password CLI".
2. Install the [1Password CLI](https://developer.1password.com/docs/cli/get-started/) (`op`).
3. Create a vault `monolab-dev` with an item `investlab` with fields `api-token` (any random string; shared with `apps/investlab-api`) and `finnhub-api-key` ([get one](https://finnhub.io/register); read only by the API).
4. Check: `pnpm exec varlock load` (from `apps/investlab`).

Non-secret defaults (API URL) live in the schema. Override locally with a gitignored `.env.local`.

CI needs no 1Password: `APP_ENV` resolves to `ci` and `.env.ci` supplies placeholders.

## Development

```bash
nx run @m0n0lab/investlab:dev
```

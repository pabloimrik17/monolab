# Design: fix-qup-web-wiring

## Context

`src/middleware.ts` exists and is correct (redirects unauthenticated `/admin/*` to `/admin`), but SolidStart only loads middleware declared in `app.config.ts` — the key is absent, so the guard never ran. `src/global.css` holds the Tailwind entry; PostCSS is wired (`postcss.config.cjs` + `@tailwindcss/postcss`) but nothing imports the file, so no CSS is generated. Both were masked in knip by entry-listing `src/middleware.ts`.

## Goals / Non-Goals

**Goals:** wire existing code; verify against built output.

**Non-Goals:** auth redesign, logout flow (tracked in add-fallow debt cleanup), securing "use server" mutations beyond the middleware guard, styling changes.

## Decisions

- **Register middleware, don't delete it**: knip config shows it was always intended active; deleting would leave `/admin/*` open. `middleware: "./src/middleware.ts"` in `defineConfig()`.
- **Import CSS in `src/app.tsx`** (app root), not per-route: single load point, standard SolidStart pattern.
- **Verification = build + bundle inspection** (grep guard string in `.output`, CSS asset present) since qup-web has no test suite yet.

## Risks / Trade-offs

- [Admin pages previously reachable unauthenticated now redirect] → intended fix; verify the login flow (`login` in `server/auth.ts`) still lands on dashboard after auth.
- [Tailwind styles apply for the first time → visual shift] → pages were authored with these classes; eyeball key routes after build.

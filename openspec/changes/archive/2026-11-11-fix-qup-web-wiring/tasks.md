# Tasks: fix-qup-web-wiring

## 1. Wiring

- [x] 1.1 Add `middleware: "./src/middleware.ts"` to `defineConfig()` in `apps/qup-web/app.config.ts`
- [x] 1.2 Add `import "./global.css";` at top of `apps/qup-web/src/app.tsx`

## 2. Verification

- [x] 2.1 Build: `pnpm nx build @m0n0lab/qup-web`; confirm middleware guard string present in `.output` server bundle
- [x] 2.2 Confirm CSS asset with Tailwind utilities emitted in build output
- [x] 2.3 Run app locally: unauthenticated `/admin/dashboard` redirects to `/admin`; login flow still works; pages render styled

# Big Box Exchange Developer Guidelines

A mandate-first commercial real estate platform built with Next.js 16, React 19, TypeScript, and Supabase.

## Build & Test

```bash
npm run dev        # Start dev server (Webpack, http://localhost:3000)
npm run build      # Production build
npm run start      # Run production server
npm run lint       # Run ESLint
```

**Key Config Files:**
- `next.config.ts` — Server Actions body size: 10MB (for uploads)
- `tsconfig.json` — Strict mode, ES2017 target, `@/*` path alias
- `proxy.ts` — Middleware that refreshes session on **every request** (intentional for SSR/multi-tenant)

**Supabase Setup:**
- `.env.local` required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Session managed via cookies; `proxy.ts` calls `getUser()` to keep session fresh

## Architecture

**Route Groups** (Next.js App Router):
- `(auth)/` — Public auth flows (login, create-company)
  - Centered card layout via `(auth)/layout.tsx`
- `(dashboard)/` — Protected company-scoped routes
  - **Subdomains:** assets, companies, deal-rooms (asset-to-mandate links), mandates, portfolio, insights
  - All require active company context via `getActiveCompanyId()` from `lib/app-context.ts`
- `api/` — API routes (e.g., `/api/whoami/` for auth status)

**Component Patterns:**
1. **Server components** (default) — Fetch data, verify auth, redirect if unauthorized
2. **Client components** ("use client") — Forms, state, navigation (`usePathname()`)
3. **Actions** — Export `async function actionName(formData: FormData)` from server files

**Data Layer:**
- `lib/supabase/server.ts` — Creates Supabase client with cookie-based SSR
- `lib/app-context.ts` — Multi-tenant helpers:
  - `getActiveCompanyId()` — Resolves active company (user_settings → profiles → first membership)
  - `getActiveCompanyRecord()` — Loads company data (name, logo_url)
  - Uses React `cache()` to deduplicate DB queries per request

**Styling:**
- TailwindCSS v4 with PostCSS
- Utility-first approach (`space-y-8`, `rounded-xl`, responsive prefixes like `md:`)
- No CSS modules; inline classes preferred

## Code Conventions

**TypeScript:**
- Strict mode enforced
- Path alias `@/*` for imports from project root
- UUID validation: Manual regex (see `portfolio/actions.ts` line 9–10) — consider schema validation library for robustness

**Server Actions:**
- Accept `FormData` parameter
- Validate input (currently manual; recommend Zod/Yup for schemas)
- Return `{ success: boolean, error?: string, data?: T }`
- Always verify `getActiveCompanyId()` matches request context (security)

**Component Naming:**
- Components live in `/components/{feature}/`
- Export named; avoid default exports
- Prefix client components with "use client" directive at top

**API Routes:**
- Use Supabase SSR client: `const supabase = await supabaseServer()`
- Always verify user via `getUser()` before returning sensitive data
- Return `NextResponse.json()`

## Database & Migrations

**Migrations:** SQL files in `supabase/migrations/` applied in order
- Format: `YYYYMMDDHHMMSS_description.sql`
- Key tables: `mandates`, `deals`, `deal_rooms`, `assets`, `companies`, `profiles`, `memberships`, `user_settings`

**RLS (Row-Level Security):**
- Supabase RLS policies protect multi-tenant data
- Verify company ownership in server actions before modifying records

## Known Gotchas & Recommendations

1. **Company Context Resolution** — Multi-tenant context has fallback chain (user_settings → profiles → first membership). Ensure migrations create tables in dependency order.

2. **Session Refresh Overhead** — `proxy.ts` calls `getUser()` on every request. This is intentional for SSR auth state but could impact latency under high load.

3. **Form Validation** — Currently manual UUID regex validation in actions. **Recommend:** Adopt Zod/Yup for schema validation across server actions.

4. **Supabase Type Safety** — Queries return `any` by default (cast with `as SomeType[]`). TypeScript views available for known tables.

5. **Asset Upload Handling** — File uploads separate from form submission (see `NewAssetForm.tsx`). Handle images independently from form data.

6. **Input Sanitization** — Validate UUIDs and company ownership in all server actions; use `getActiveCompanyId()` to prevent cross-company access.

## File Examples

- **[proxy.ts](proxy.ts)** — SSR middleware pattern: cookie refresh on every request
- **[lib/supabase/server.ts](lib/supabase/server.ts)** — Supabase SSR client factory
- **[app/(dashboard)/portfolio/actions.ts](app/(dashboard)/portfolio/actions.ts)** — Typed server actions with validation
- **[components/dashboard/DashboardNav.tsx](components/dashboard/DashboardNav.tsx)** — Client component with `usePathname()` + Tailwind
- **[lib/app-context.ts](lib/app-context.ts)** — Multi-tenant context resolution with `React.cache()`

## Further Reading

See [README.md](README.md) for project vision and local dev setup steps.

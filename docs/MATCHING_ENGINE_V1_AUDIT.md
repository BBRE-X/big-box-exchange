# Matching Engine v1 — Codebase Audit

**Date:** 2026-05-01
**Branch:** `asset-save-images-c0822`
**Status:** Audit only — no code changed

---

## 1. RELEVANT FILES

### Matching logic
| File | Role |
|---|---|
| `lib/matching.ts` | Pure TS scoring engine — the only matching implementation |
| `app/(dashboard)/portfolio/page.tsx` | Calls `computePortfolioMatches()`, renders results |
| `app/(dashboard)/portfolio/actions.ts` | `createDealRoomFromPortfolio()` — creates deal room from a match |
| `app/(dashboard)/portfolio/OpenDealRoomForm.tsx` | Client form that triggers the action above |

### Supply side (assets)
| File | Role |
|---|---|
| `app/(dashboard)/assets/page.tsx` | Asset list with image, price, area fields |
| `app/(dashboard)/assets/new/page.tsx` | Create/edit asset server action |
| `app/(dashboard)/assets/[id]/page.tsx` | Asset detail |
| `components/assets/NewAssetForm.tsx` | Asset form component |

### Demand side (mandates)
| File | Role |
|---|---|
| `app/(dashboard)/mandates/page.tsx` | Mandate list |
| `app/(dashboard)/mandates/new/page.tsx` | Create/edit mandate server action |
| `app/(dashboard)/mandates/[id]/page.tsx` | Mandate detail — renders all rich fields |

### Execution layer (deal rooms / deals)
| File | Role |
|---|---|
| `app/(dashboard)/deal-rooms/page.tsx` | Pipeline overview — all deals by company |
| `app/(dashboard)/deal-rooms/[id]/page.tsx` | Deal room detail |
| `app/(dashboard)/deal-rooms/[id]/actions.ts` | Stage update, notes |
| `lib/deal-room-stage.ts` | Stage enum + labels + badge classes |
| `lib/deal-source.ts` | Deal source types |

### Infrastructure
| File | Role |
|---|---|
| `lib/app-context.ts` | `getActiveCompanyId()`, `getActiveCompanyRecord()` |
| `lib/supabase/server.ts` | `supabaseServer()` — server-side Supabase client |
| `lib/supabase/client.ts` | Browser-side Supabase client |

---

## 2. RELEVANT DATABASE TABLES & FIELDS

### `mandates`
```sql
id uuid, company_id uuid, title text,
asset_type text,          -- used in matching (type score)
location text,            -- LEGACY, used in matching (geo score)
status text,              -- 'active' | 'matched' | 'engaged' | 'closed'
description text,
budget_min numeric,       -- NOT yet used in matching
budget_max numeric,       -- NOT yet used in matching
building_area_min_sqm numeric,  -- NOT yet used in matching
building_area_max_sqm numeric,  -- NOT yet used in matching
land_area_min_sqm numeric,      -- NOT yet used in matching
land_area_max_sqm numeric,      -- NOT yet used in matching
search_areas jsonb,       -- [{label, state, suburb, radius_km, lat, lng}] — NOT used in matching
deal_intent text,         -- 'buy' | 'lease' | 'buy_or_lease'
intended_use text,
zoning_notes text,
created_at timestamptz
-- MISSING: created_by, RLS policies
```

### `assets`
```sql
id uuid, company_id uuid, created_by uuid,
title text,
asset_type text,          -- used in matching (type score)
suburb text,              -- used in matching (suburb score)
state text,               -- used in matching (state score)
country text,
price_min numeric,        -- NOT yet used in matching
price_max numeric,        -- NOT yet used in matching
price_display text,
building_area_sqm numeric,  -- NOT yet used in matching
land_area_sqm numeric,      -- NOT yet used in matching
listing_type text, is_public boolean, open_for_offers boolean,
created_at timestamptz
```

### `deal_rooms`
```sql
id uuid, company_id uuid, asset_id uuid, mandate_id uuid,
stage text default 'lead',  -- same enum as deals
created_at timestamptz
-- UNIQUE: (company_id, asset_id, mandate_id)
```

### `deals`
```sql
id uuid, deal_room_id uuid, company_id uuid,
title text, summary text,
stage text,   -- lead | qualified | under_review | negotiation | under_contract | closed
source text,  -- manual | match | mandate_response
updated_at timestamptz, created_at timestamptz
```

### `deal_notes`
```sql
id uuid, deal_id uuid, company_id uuid, created_by uuid,
body text, created_at timestamptz
```

---

## 3. CURRENT GAPS

### G1 — Scoring only uses 3 of 8+ available match signals
Current weights: type (40) + suburb (35) + state (15) = 90 max.
Unused signals already in DB: budget/price overlap, building area range, land area range, search_areas geo.

### G2 — `search_areas` JSONB not used in geo scoring
Mandate form saves structured geography to `search_areas`. The matcher reads `location` (old text field).
Mandates created via the current form may have `location = null` but populated `search_areas`,
causing zero geo score even when location is actually specified.

### G3 — Intra-company only
Matching runs on the active company's own assets vs its own mandates.
No cross-company marketplace matching exists yet.

### G4 — No match persistence
Matches computed on every page load (N×M). No table, no cache, no history, no notifications.

### G5 — `mandates` missing `created_by`
Architecture rules require `created_by` on every table. Missing from the mandates migration.

### G6 — `mandates` missing RLS
No RLS policies in the mandates migration. Status of actual DB RLS is unconfirmed.

### G7 — `memberships` dual-field inconsistency
Two different active membership checks in use across the codebase:
- `is_active = true` — used in `mandates/new`, `mandates/[id]`
- `status = 'active'` — used in `app-context`, RLS policies on deal_rooms/deals/deal_notes

This is a bug risk for any query that uses the wrong field.

### G8 — No mandate visibility control
Assets have `is_public`. Mandates have no visibility flag.
Cross-company matching requires knowing which mandates are visible to whom.

---

## 4. SAFEST IMPLEMENTATION PLAN

### Phase 1 — Schema integrity (no UI changes, prerequisite for everything else)

**1a. Add `created_by` to mandates**
```sql
alter table public.mandates add column if not exists created_by uuid;
```

**1b. Add RLS policies to mandates**
```sql
alter table public.mandates enable row level security;
create policy "mandates_select_for_company_members" ...
create policy "mandates_insert_for_company_members" ...
create policy "mandates_update_for_company_members" ...
```

**1c. Resolve `is_active` vs `status` in memberships**
- Confirm which column is authoritative (check existing data in Supabase dashboard)
- Update all code to use one field
- Add DB constraint to prevent drift

---

### Phase 2 — Richer intra-company scoring (lib/matching.ts only)

No new DB tables. No migration required.

**2a. Expand `MandateForMatch` type:**
```ts
budget_min: number | null;
budget_max: number | null;
building_area_min_sqm: number | null;
building_area_max_sqm: number | null;
search_areas: { state?: string | null; label?: string | null }[] | null;
```

**2b. Expand `AssetForMatch` type:**
```ts
price_min: number | null;
price_max: number | null;
building_area_sqm: number | null;
```

**2c. New scoring functions in `lib/matching.ts`:**
- `priceInBudget()` — +25 pts if asset price range overlaps mandate budget
- `buildingAreaInRange()` — +20 pts if asset sqm within mandate min/max
- `searchAreasStateMatch()` — supplement legacy `location` with `search_areas[].state`

**2d. Update `MATCH_SCORE_MAX` in portfolio page to reflect new max**

**2e. Update portfolio queries to select new fields**

---

### Phase 3 — Match persistence (new table, optional for v1)

```sql
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  asset_id uuid not null references public.assets(id) on delete cascade,
  mandate_id uuid not null references public.mandates(id) on delete cascade,
  score integer not null,
  reasons jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique(company_id, asset_id, mandate_id)
);
```

Upsert on portfolio load or via background trigger.

---

### Phase 4 — Cross-company matching (future, not v1)

Requires:
- `mandate_visibility` column on mandates ('private' | 'public' | 'restricted')
- Separate "Market" page or mandate feed for asset owners
- Multi-party deal rooms (currently only single company_id)
- Participant model on deal_rooms

**Do not attempt Phase 4 before Phases 1–2 are solid.**

---

## 5. VERDICT

The existing `lib/matching.ts` is clean and correct for what it does.
The safest next step is **Phase 2 only** — enhance the scorer using fields already in the DB,
with no schema changes and no cross-company risk.

**Phase 1 (schema integrity) should run in parallel** as a separate migration PR
to fix the `created_by` and RLS gaps.

**Phase 3 and 4 are post-v1.**

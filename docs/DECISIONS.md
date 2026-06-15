# Build Decisions

Recorded decisions from product/architecture review (May 2026). Update this file when scope or stack changes.

## North star

The **client scope email** (Brittany) is the product definition. Internal MVP phasing splits **core pitch workflow** (MVP) from **automatic competitor lookup** (~15h, committed separately).

## Stack

| Layer | Choice | Notes |
| --- | --- | --- |
| App | Next.js on **Render** | Same deployment pattern as `lookerStudioDashboard` |
| Database + auth + uploads | **Supabase** | Postgres, RLS, Auth, Storage |
| ZCTA boundaries | **MapLibre** + **PMTiles** on **DO Spaces** (or Supabase Storage) | Avoid Census-on-demand memory issues on Render |
| Boundary fallback | Census TIGER chunk API | Port pattern from `lookerStudioDashboard/dashboard/src/app/api/zcta-boundaries/route.ts` |
| PDF export | Port `usePdfExport`, `PdfHeader`, `brands.ts` | From existing dashboard |
| Geocoding | On upload when lat/lng missing | Census or Mapbox/Google via env; optional pre-upload CLI script |

## Audience

- **Primary users:** Client’s sales team presenting to *their* clients (public-facing polish required).
- **Not** the internal-only reporting dashboard.

## MVP scope (core pitch)

Includes everything needed for a live pitch with **uploaded** audience and dealership data:

- Projects + historical uploads + drag-and-drop CSV/XLSX
- ZIP map: visible borders (vector tiles), heat scale, hover (ZIP + type + count), audience type filter
- Dealership layer: client vs competitor pins, brand filter, **focus client dealership** (center map + summaries)
- Radius rings: 10 / 25 / 50 miles from focused dealership
- Competitive storytelling (no Places API):
  - Audience total inside selected radius (ZIP centroid approximation; label as radius not drive-time)
  - **White-space (MVP-lite):** high-audience ZIPs with no competitor within configurable miles (e.g. 25)
- Layer toggles, branded PDF export
- Supabase Auth (minimum: team login before client demos)

## Phase 2 — Automatic competitor lookup (~15 hours)

**Committed estimate to client:** ~15 additional hours after MVP sign-off.

| Block | ~Hours | Deliverable |
| --- | --- | --- |
| API + env | 2–3h | Search by brand + lat/lng + radius (Places or Mapbox) |
| Backend + dedupe | 3–4h | Candidate list; dedupe by name + distance |
| Review UI | 4–5h | Search → checklist → save as competitor pins on project |
| Manual corrections | 2–3h | Edit/remove bad API results |
| Smoke QA | 2–3h | One real market demo; rate limits |

**In scope for 15h:** Single-provider search from **focused client dealership**, review-and-save, basic dedupe, manual fixes.

**Out of scope for 15h (unless hours added):** Drive-time trade areas, territory compare, bulk multi-market automation, perfect chain dedupe, public share links.

**Dependency:** MVP must ship **focus dealership** + geocoded client location before lookup is useful.

## Explicitly later (Phase 3+)

- Drive-time overlays
- Territory comparisons
- Expiring read-only presentation links for end clients
- Advanced roles/admin
- Flexible column mapping UI
- Extra audience metrics columns

## Reference codebase

Existing CTV ZIP map and PDF patterns:

- `/Users/spensercourville-taylor/htmlfiles/lookerStudioDashboard/dashboard/src/components/ZipHeatmap.tsx`
- `.../src/app/api/zcta-boundaries/route.ts`
- `.../src/lib/usePdfExport.ts`
- `.../src/lib/brands.ts`

# Implementation Checklist

Track build progress against [ROADMAP.md](./ROADMAP.md) and [DECISIONS.md](./DECISIONS.md).

## Phase 0 — Foundation (start here)

- [x] Next.js app scaffold (App Router, TypeScript, Tailwind)
- [x] Repo structure: `app/`, `components/`, `lib/`, `supabase/`
- [x] `.env.example` (Supabase URL/keys, PMTiles URL, geocoder optional)
- [x] Supabase project: Postgres schema + RLS
- [x] Supabase Auth: magic link login (optional until redirect URLs configured)
- [x] Protected app routes (redirect if not signed in)
- [ ] Port `brands.ts`, `usePdfExport`, `PdfHeader` from lookerStudioDashboard
- [ ] Render service created (can deploy hello-world first)

## Phase 1 — Projects + audience uploads

- [x] Project home: list, create, rename
- [x] Project detail / setup page shell
- [x] Audience CSV/XLSX parser + validation ([DATA_FORMATS.md](./DATA_FORMATS.md))
- [x] Import summary UI (imported / skipped / types / ZIP count)
- [x] Store rows in `audience_zip_counts`
- [x] Upload originals to Supabase Storage
- [x] Dataset versioning + mark active dataset
- [x] Drag-and-drop file upload

## Phase 2 — ZIP map

- [ ] Script: Census ZCTA → Tippecanoe → PMTiles (deferred — on-demand boundaries for MVP)
- [ ] Host PMTiles on DO Spaces (or Supabase Storage)
- [x] MapLibre map component + basemap (Carto Positron)
- [x] Join audience counts to ZIP polygons
- [x] Choropleth legend + quantile scale
- [x] Hover tooltip: ZIP, type, count
- [x] Audience type multi-filter
- [ ] ZIP layer toggle (always on for MVP)
- [x] Port `/api/zcta-boundaries` from dashboard
- [x] Presentation map route `/projects/[id]/map`

## Phase 3 — Dealerships + pitch UX + MVP ship

- [ ] Dealership CSV/XLSX parser + validation
- [ ] Geocode queue for address-only rows
- [ ] Client vs competitor pin styles
- [ ] Brand filter + dealership layer toggle
- [ ] Focus client dealership (select, center map)
- [ ] Radius rings: 10 / 15 / 20 / 25 miles
- [ ] Summary: total audience, top ZIPs, audience in radius
- [ ] White-space-lite highlights + list
- [ ] Map workspace layout (sidebar + full map)
- [ ] Branded PDF export
- [ ] QA: large files, bad ZIPs, geocode failures, performance
- [ ] Render production deploy + Supabase env vars

## Phase 4 — Competitor lookup (~15h, after MVP sign-off)

- [ ] Location API configured (Places or Mapbox)
- [ ] Search: brand + radius from focus dealership
- [ ] Dedupe candidates
- [ ] Review modal: select → save to project
- [ ] Manual edit/remove competitors
- [ ] Smoke test one real market

## Phase 5 — Backlog

- [ ] Drive-time overlays
- [ ] Territory comparisons
- [ ] Expiring read-only presentation links
- [ ] Advanced admin roles

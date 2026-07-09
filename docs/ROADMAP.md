# Roadmap

Assumption: uploads use standardized columns (see [DATA_FORMATS.md](./DATA_FORMATS.md)). Client scope email is the product north star; phasing below reflects delayed start (late May 2026).

## Delivery overview

| Milestone | Scope | Estimate |
| --- | --- | --- |
| **MVP** | Full pitch workflow with uploaded audience + dealerships | ~4 weeks from build start |
| **Phase 2** | Automatic competitor lookup by brand + radius | **~15 hours** (committed to client) |
| **Phase 3+** | Drive-time, territory compare, share links | TBD |

Original calendar targets (June 6–9 MVP) are superseded by actual start date; use milestone rows above for planning.

---

## MVP — Core platform + uploads (week 1)

- Scaffold Next.js app; deploy to Render
- Supabase: schema, RLS, Auth
- Project create / rename / list / load
- Audience CSV/XLSX upload (drag-and-drop)
- Validate ZIP, audience type, count; import summary
- Dataset versioning + set active version
- Store originals in Supabase Storage

## MVP — ZIP opportunity map (week 2)

- Build/host ZCTA **PMTiles** (MapLibre); static asset on DO Spaces or Supabase Storage
- Choropleth by audience count for selected type(s)
- ZIP borders clearly visible; zoom/pan
- Hover: ZIP, audience type, audience count
- Audience type filter; layer toggle for ZIP heatmap
- Census TIGER API fallback for edge ZIPs (port from CTV dashboard)
- Performance: no full national GeoJSON per request on Render

## MVP — Dealerships + competitive story + export (week 3)

- Dealership CSV/XLSX upload; client vs competitor pins
- Geocode rows missing lat/lng (on upload queue + import summary)
- Brand filter; dealership layer toggle
- **Focus client dealership** (center map, drive summaries)
- Radius rings: 10 / 15 / 20 / 25 miles
- Summary cards: total audience, top ZIPs, audience inside radius
- **White-space (MVP-lite):** highlight/list high-audience ZIPs with no competitor within X mi
- Presentation UI polish (live pitch: simple controls, layer toggles)
- Branded PDF export (port `usePdfExport` / `PdfHeader` / `brands`)
- QA: large files, bad ZIPs, geocode failures, map performance

## MVP sign-off

- Client can run ideal workflow: upload audience → map → upload/select dealerships → toggle types → present → export PDF
- Competitor **files** work in MVP; automatic API lookup does not

---

## Phase 2 — Automatic competitor lookup (~15 hours)

Scheduled **immediately after MVP sign-off**. Fixed scope to stay within ~15h:

1. Configure location API (Google Places or Mapbox) on Render
2. Search competitors by **brand** + **radius** from **focused client dealership**
3. Dedupe candidates (name + distance)
4. Review UI: select results → save to project as competitor pins
5. Manual edit/remove incorrect listings
6. Smoke test on one real market

**Not in the 15h block:** drive-time, territory scoring, public share URLs, bulk automation across many markets.

See [DECISIONS.md](./DECISIONS.md) for hour breakdown and out-of-scope list.

---

## Phase 3+ (backlog)

- Drive-time overlays
- Territory comparisons
- Expiring read-only presentation links
- Advanced admin/roles
- Non-standard column mapping UI

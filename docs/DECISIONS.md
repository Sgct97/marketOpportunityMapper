# Build Decisions

Recorded decisions from product/architecture review (May 2026). Update this file when scope or stack changes.

## North star

The **client scope email** (Brittany) is the product definition.

## Stack

| Layer | Choice | Notes |
| --- | --- | --- |
| App | Next.js on **Render** | Same deployment pattern as `lookerStudioDashboard` |
| Database + auth + uploads | **Supabase** | Postgres, RLS, Auth, Storage |
| ZCTA boundaries | **MapLibre** + Census on-demand (PMTiles later) | Regional pitches; typical ~50 ZIPs |
| Client + competitor locations | **Google Places API** | Website + name lookup; competitor search by brand + radius |
| PDF export | Port `usePdfExport`, `PdfHeader`, `brands.ts` | From existing dashboard |

## MVP inputs (revised June 2026)

Brittany confirmed pitches use **audience files only** plus **dealer website** for pinpointing the client store.

| Input | Required |
| --- | --- |
| Audience CSV/XLSX | Yes |
| Client dealer website | Yes (recommended; disambiguates non-unique names) |
| Separate dealership spreadsheet | No — optional admin fallback only |

## MVP workflow

1. Upload audience file (ZIP counts by segment)
2. System suggests client dealer name from **filename**
3. User enters **dealer website** + confirms resolved location (human verification)
4. System searches **competitors by brand + radius** from client pin → user reviews and saves
5. Map: ZIP heatmap, radius rings, audience-in-radius, white-space, presentation
6. Branded PDF export

## MVP scope

- Projects + audience uploads + versioning
- ZIP map (MapLibre, segment filters, tooltips)
- **Client dealer:** website lookup + confirm UI
- **Competitors:** Places search + review checklist + save to map
- Dealership layer: client vs competitor pins, brand filter, focus client, radius 10/25/50 mi
- Competitive summaries (audience in radius, top ZIPs, white-space)
- Layer toggles; settings persist on project
- Supabase Auth before client-facing deploy

## Explicitly later

- Drive-time overlays
- Territory comparisons
- Expiring read-only presentation links
- Advanced roles/admin
- Flexible column mapping UI

## Reference codebase

- `/Users/spensercourville-taylor/htmlfiles/lookerStudioDashboard/dashboard`

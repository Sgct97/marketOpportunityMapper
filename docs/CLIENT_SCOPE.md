# Client Scope Traceability

Source: client scope email. Maps each ask to MVP, Phase 2 (~15h), or later.

## Project goal

| Client ask | Status | Notes |
| --- | --- | --- |
| Addressable market by ZIP for automotive (and other verticals) | MVP | Audience upload + map |
| Sales pitches: opportunity, competitive position, targeting | MVP | Map + dealers + export |
| Foundation from CTV ZIP map | MVP | Patterns from `lookerStudioDashboard`; MapLibre + tiles upgrade |

## Interactive ZIP code map

| Client ask | Status | Notes |
| --- | --- | --- |
| ZIP polygons clearly visible | MVP | PMTiles + MapLibre |
| Zoom and pan | MVP | |
| Hover: ZIP, count, audience type | MVP | |
| Color scaling / heat by count | MVP | |
| Filter by audience type | MVP | |
| Optional extra metrics later | Later | Schema/extensible imports |

## Data upload / ingestion

| Client ask | Status | Notes |
| --- | --- | --- |
| CSV + XLSX | MVP | |
| ZIP, Audience Type, Audience Count columns | MVP | [DATA_FORMATS.md](./DATA_FORMATS.md) |
| Auto ingest and map | MVP | |
| Multiple audience datasets | MVP | Types in file + versioned uploads |
| Replace/update datasets | MVP | Active dataset versioning |
| Drag-and-drop upload | MVP | |
| Save historical uploads/projects | MVP | Supabase |

## Dealership mapping layer

| Client ask | Status | Notes |
| --- | --- | --- |
| Plot dealership pins | MVP | Client via website lookup; competitors via Places search |
| Client vs competitor | MVP | |
| Filter/display by brand | MVP | |
| **Select brand → map pulls competitors** | **MVP** | Places API + human review (was Phase 2) |
| Centralize dealership we’re pitching | MVP | Website + confirm UI |
| See audience vs competitor locations | MVP | Map + rings + summaries |

## Client communication — dealership data

**MVP inputs:** audience file + **client dealer website** (June 2026). Filename suggests client name; website pinpoints the store when names are ambiguous. Separate dealership spreadsheet is optional fallback only.

## Competitive visualization

| Client ask | Status | Notes |
| --- | --- | --- |
| Audience concentration near competitors | MVP | Audience in radius; competitors on map |
| White space opportunities | MVP-lite | High-audience ZIPs, no nearby competitor |
| Radius overlap between dealerships | MVP | 10 / 15 / 20 / 25 mi rings |
| High-density opportunity zones | MVP | Heatmap + top ZIPs + white-space list |
| Drive-time overlays | Later | |
| Radius rings 10 / 15 / 20 / 25 mi | MVP | |
| Territory comparisons | Later | |

## Presentation / sales UI

| Client ask | Status | Notes |
| --- | --- | --- |
| Clean modern UI | MVP | |
| Fast loading | MVP | Tiles + no huge GeoJSON on server |
| Simple controls | MVP | |
| Strong visual storytelling | MVP | Legend, summaries, focus mode |
| Toggle layers | MVP | |
| Switch datasets quickly | MVP | Active version + filters |
| Export screenshot/PDF | MVP | PDF primary; port dashboard hook |
| Branded client reports | MVP | `brands.ts` pattern |

## Ideal workflow steps

| Step | Status |
| --- | --- |
| 1. Upload audience file | MVP |
| 2. System maps ZIPs | MVP |
| 3. Enter/select dealerships | MVP | Website lookup + confirm; competitor search + review |
| 4. Visualize concentration | MVP |
| 5. Toggle audience types | MVP |
| 6. Present live | MVP |

## Client communication — competitor lookup

**MVP (revised June 2026):** automatic competitor lookup by brand + radius is **in MVP**, with human review before saving pins. The client supplies audience files + dealer website; no separate dealer file required for typical pitches.

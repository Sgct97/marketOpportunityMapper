# Project Specification

## Product Goal

Create a standalone, sales-friendly platform for visualizing addressable market opportunity by ZIP code. The tool helps sales teams present audience density, competitive positioning, and targeting opportunities during pitches—built on the foundation of the CTV ZIP map in `lookerStudioDashboard`, but as its own product with projects, uploads, dealerships, and exports.

**Client scope alignment:** See [CLIENT_SCOPE.md](./CLIENT_SCOPE.md) for requirement traceability to this spec.

## Primary Users

- Sales team preparing or presenting market opportunity decks **to their clients** (polished, client-facing UI)
- Internal operators uploading audience/dealership files
- Future: read-only presentation links for end clients (Phase 3+)

## Ideal User Workflow (client)

1. User uploads CSV/XLSX audience file.
2. System maps ZIP data automatically.
3. User uploads dealership file and/or selects **focus client dealership** on the map.
4. System visualizes audience concentration (heatmap + summaries).
5. User toggles audience types and map layers.
6. User presents live; exports branded PDF for proposals.

## MVP Workflow (implementation)

1. User signs in; creates or opens a project.
2. User uploads standardized audience file (drag-and-drop).
3. System validates ZIP codes and audience counts; shows import summary.
4. User uploads standardized dealership file (or geocodes addresses on import).
5. User selects **focus client dealership**; optional radius rings (10 / 25 / 50 mi).
6. User filters by audience type and dealership brand; toggles layers.
7. User reviews competitive summaries (audience in radius, white-space highlights).
8. User exports branded PDF.

## Core Requirements

### Projects

- Create, rename, load project
- Save historical uploads per project
- Replace/update datasets (versioning + active dataset)
- Store map settings (filters, center, focus dealership, brand config id)

### Audience Uploads

- Support CSV and XLSX; drag-and-drop
- Standardized columns (see [DATA_FORMATS.md](./DATA_FORMATS.md))
- Validate rows before saving
- Normalize ZIP codes to five digits
- Aggregate duplicate ZIP + audience type rows
- Multiple audience types per project (rows in file + multiple dataset versions)

### ZIP Map

- ZIP code polygons/borders **clearly visible** (MapLibre + vector tiles; see [ARCHITECTURE.md](./ARCHITECTURE.md))
- Color/heat scale by audience count
- Zoom and pan
- Hover tooltip: ZIP code, audience type, audience count
- Filter by audience type
- Style only ZIPs with data for selected filters; neutral/outline elsewhere

### Dealership Layer

- Upload standardized dealership file
- Plot pins; differentiate **client** vs **competitor**
- Filter by brand (supports multi-brand display when data includes multiple brands)
- Toggle dealership layer
- Dealership tooltip/card (name, brand, role)
- **Focus client dealership:** center map, enable radius/summaries

### Competitive Visualization (MVP)

Client called this “one of the most important” areas. MVP delivers visual story **without** drive-time or auto API lookup:

- Radius rings: 10, 25, 50 miles from focus dealership
- Layer toggles (ZIP heatmap, dealerships, rings)
- Summary cards:
  - Total selected audience
  - Top ZIPs by count
  - Audience inside selected radius (ZIP centroid approximation; UI labels as radius not drive-time)
- **White-space (MVP-lite):** ZIPs with high audience for selected type(s) and **no competitor pin** within configurable distance (e.g. 25 mi)—map highlight + list
- Map makes relative position of competitors vs audience concentration obvious

### Competitive Visualization (Phase 2 — ~15h)

- Automatic competitor lookup: brand + radius from focus dealership via location API
- Dedupe; review UI; save selected to project
- Manual corrections to API results

See [DECISIONS.md](./DECISIONS.md).

### Competitive Visualization (later)

- Drive-time overlays
- Territory comparisons
- Richer white-space scoring

### Presentation + Export

- Clean modern UI; fast-loading map; simple controls
- Toggle layers; switch active audience dataset/version quickly
- Branded PDF (and optional screenshot) for proposals
- Reuse dashboard patterns: `usePdfExport`, `PdfHeader`, `brands.ts`

## Explicit MVP Exclusions

Excluded from **MVP** (not from full product):

- **Automatic competitor lookup** (Phase 2, ~15h—committed separately)
- Drive-time polygons
- Full territory scoring / compare
- Shareable public anonymous links (team auth in MVP)
- Advanced user roles/admin permissions
- Non-standard upload column mapping

## Phase 2 Exclusions (~15h cap)

Excluded unless additional hours approved:

- Drive-time trade areas
- Territory comparison mode
- Public presentation URLs
- Fully automated multi-market competitor harvesting without review UI

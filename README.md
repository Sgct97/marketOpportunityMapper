# Market Opportunity Mapper

Standalone platform for visualizing addressable market opportunity by ZIP code—built for sales pitches to automotive (and other) clients.

## Purpose

Upload audience and dealership data, visualize opportunity on a ZIP boundary map, overlay client and competitor locations, tell a competitive story (radius, white-space highlights), and export branded PDFs.

Separate from the internal `lookerStudioDashboard` reporting product. Reuses CTV ZIP and PDF patterns; adds projects, persistence, dealership workflow, and client-facing polish.

## Development

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Documentation

| Doc | Description |
| --- | --- |
| [IMPLEMENTATION_CHECKLIST.md](./docs/IMPLEMENTATION_CHECKLIST.md) | **Build checklist** (checkboxes) |
| [PROJECT_SPEC.md](./docs/PROJECT_SPEC.md) | Functional requirements and phasing |
| [CLIENT_SCOPE.md](./docs/CLIENT_SCOPE.md) | Client email → MVP / Phase 2 traceability |
| [DECISIONS.md](./docs/DECISIONS.md) | Stack, MVP vs Phase 2, **~15h competitor lookup** |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System design and map strategy |
| [DATA_FORMATS.md](./docs/DATA_FORMATS.md) | Standardized upload columns |
| [ROADMAP.md](./docs/ROADMAP.md) | Build milestones |

## Core MVP

- Projects + historical uploads (CSV/XLSX, drag-and-drop)
- ZIP boundary heatmap (MapLibre + vector tiles)
- Audience type filters and tooltips
- Dealership pins (client vs competitor), brand filter, **focus dealership**
- Radius rings (10 / 15 / 20 / 25 mi), competitive summaries, white-space (MVP-lite)
- Layer toggles, branded PDF export
- Supabase (auth, DB, storage) + Render hosting

## Phase 2 — Competitor lookup (~15 hours)

Committed estimate to client; scheduled after MVP sign-off. See [DECISIONS.md](./docs/DECISIONS.md).

## Stack

- Next.js on Render
- Supabase (Postgres, Auth, Storage)
- MapLibre + PMTiles on DO Spaces
- PDF export ported from `lookerStudioDashboard`

## Reference dashboard

`/Users/spensercourville-taylor/htmlfiles/lookerStudioDashboard/dashboard`

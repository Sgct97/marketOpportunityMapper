# Market Opportunity Mapper

Standalone product plan for a sales-facing ZIP code opportunity mapping platform.

## Purpose

Build an interactive mapping tool that lets the team upload standardized audience and dealership data, visualize addressable market opportunity by ZIP code, overlay client/competitor dealership locations, and export polished sales materials.

This is intentionally separate from the existing reporting dashboard. The current CTV ZIP map proves the visual concept, but this product needs project storage, uploads, dealership layers, reusable sales workflows, and export/reporting features.

## Core MVP

- Create and save projects
- Upload standardized CSV/XLSX audience files
- Upload standardized CSV/XLSX dealership files
- Validate and normalize ZIP-level audience counts
- Display ZIP boundary heatmap by audience count
- Filter by audience type
- Plot client and competitor dealerships
- Filter dealerships by brand
- Toggle map layers
- Show radius rings around selected dealerships
- Export screenshots/PDFs for proposals

## Optional Phase 2

- Automatic competitor lookup by brand/location/radius using a location API
- Deduplicate competitor results
- Save selected competitors into projects
- Allow manual corrections to API-sourced dealership results

## Target Delivery

Assuming build starts the week of May 18, 2026:

- MVP target: June 6-9, 2026
- Automatic competitor lookup target: June 13-18, 2026

## Recommended Stack

- App: Next.js
- Database: Supabase Postgres or Neon Postgres
- File storage: Supabase Storage or S3
- Auth: Supabase Auth or Clerk
- Map engine: MapLibre GL preferred; Leaflet acceptable for a lean MVP
- ZIP boundaries: pre-optimized/vector-tile approach preferred
- Upload parsing: CSV parser plus `xlsx`
- Export: screenshot/PDF export similar to the existing dashboard pattern

## Key Engineering Warning

Do not load thousands of full ZIP polygons into memory in one request. The existing dashboard already hit Render memory issues with large ZIP polygon payloads. This new product should use one of:

- Vector tiles
- Pre-simplified ZIP boundary assets
- Viewport-based polygon loading
- Top-N/filtered polygon rendering with clear UI labels


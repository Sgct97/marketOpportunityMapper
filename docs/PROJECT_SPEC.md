# Project Specification

## Product Goal

Create a standalone, sales-friendly platform for visualizing addressable market opportunity by ZIP code. The tool should help sales teams present audience density, competitive positioning, and targeting opportunities during pitches.

## Primary Users

- Sales team members preparing or presenting market opportunity decks
- Internal operators uploading audience/dealership files
- Future: managers/admins reviewing saved projects and reports

## MVP Workflow

1. User creates a project for a market/client.
2. User uploads a standardized audience file.
3. System validates ZIP codes and audience counts.
4. User uploads a standardized dealership file.
5. System maps ZIP audience counts and dealership pins.
6. User filters by audience type and dealership brand.
7. User toggles layers/radius rings during presentation.
8. User exports a screenshot/PDF for proposal use.

## Core Requirements

### Projects

- Create project
- Rename project
- Load project
- Save historical uploads
- Replace/update datasets
- Store map settings where useful

### Audience Uploads

- Support CSV and XLSX
- Standardized columns required
- Validate rows before saving
- Normalize ZIP codes to five digits
- Aggregate duplicate ZIP + audience type rows
- Support multiple audience types per project

### ZIP Map

- Display ZIP boundaries
- Color/heat scale ZIPs by audience count
- Support zoom and pan
- Hover tooltip:
  - ZIP code
  - Audience type
  - Audience count
- Filter by audience type
- Hide ZIPs with no selected audience data

### Dealership Layer

- Upload standardized dealership file
- Plot dealership pins
- Differentiate:
  - Client dealership
  - Competitor dealerships
- Filter dealerships by brand
- Toggle dealership layer on/off
- Show dealership detail tooltip/card

### Competitive Visualization

- Radius rings: 10, 25, 50 miles
- Layer toggles
- Summary cards:
  - Total selected audience
  - Top ZIPs
  - Audience near selected dealership
- Future:
  - Drive-time overlays
  - White-space scoring
  - Territory comparisons

### Presentation + Export

- Clean modern UI
- Fast-loading map
- Simple controls
- Export screenshot/PDF
- Branded report header
- Sales-friendly summary cards

## Explicit MVP Exclusions

To keep the MVP on the June 6-9 target, exclude:

- Automatic competitor lookup
- Drive-time polygons
- Territory scoring
- Shareable public links
- Advanced user roles/admin permissions
- Non-standard upload column mapping

These can be Phase 2/3 work.


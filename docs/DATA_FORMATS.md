# Standardized Upload Formats

The estimate assumes uploads are standardized. Avoid building flexible column mapping in MVP.

## Audience Upload

Supported file types:

- `.csv`
- `.xlsx`

Required columns:

| Column | Required | Example | Notes |
| --- | --- | --- | --- |
| ZIP Code | Yes | 75067 | Normalize to five digits |
| Audience Type | Yes | Nissan Owners | Used for filters |
| Audience Count | Yes | 4512 | Numeric, aggregate duplicates |

Example:

```csv
ZIP Code,Audience Type,Audience Count
75067,Nissan Owners,4512
75067,Nissan Intenders,1203
75068,EV Shoppers,880
```

Validation rules:

- ZIP must contain a valid five-digit ZIP/ZCTA.
- Audience Type cannot be blank.
- Audience Count must be numeric and non-negative.
- Duplicate rows with same ZIP + Audience Type should be summed.
- Invalid rows should be reported in an import summary.

### Wide format (Brittany exports — Hyundai / Toyota)

One row per ZIP; each **segment is its own column** (counts in cells).

| Column | Required | Example |
| --- | --- | --- |
| ZIP or ZIPS | Yes | `90632` |
| STATE, COUNTY, CITY, RADIUS | Ignored | metadata only |
| Segment columns | Yes (1+) | `•Hispanic HYUNDAI Intenders`, `•Hispanic TOYOTA Owners`, etc. |

The importer unpivots wide → long automatically. Zero counts are skipped. Bullet prefixes (`•`) on column names are stripped.

Sample files for local testing live in `fixtures/*.xlsx` (gitignored).

## Dealership Upload

Supported file types:

- `.csv`
- `.xlsx`

Required MVP columns:

| Column | Required | Example | Notes |
| --- | --- | --- | --- |
| Dealership Name | Yes | ABC Hyundai | Display label |
| Brand | Yes | Hyundai | Used for brand filter |
| Role | Yes | client | `client` or `competitor` |
| Latitude | Preferred | 32.984 | Use directly if present |
| Longitude | Preferred | -96.994 | Use directly if present |
| Address | Optional if lat/lng present | 123 Main St | Needed for geocoding if lat/lng missing |

Example:

```csv
Dealership Name,Brand,Role,Latitude,Longitude,Address
ABC Hyundai,Hyundai,client,32.984,-96.994,123 Main St
XYZ Hyundai,Hyundai,competitor,33.021,-96.891,987 Market Rd
```

Validation rules:

- Role must be `client` or `competitor`.
- Brand cannot be blank.
- Must have either lat/lng or a geocodable address.
- If geocoding is not included in MVP, lat/lng should be required.

## Replacement/Update Behavior

MVP recommendation:

- Each upload creates a new dataset version.
- User can mark one dataset version as active.
- User can delete old versions.
- Keep original files stored for audit/debugging.

## Import Summary

After each upload, show:

- File name
- Rows processed
- Rows imported
- Invalid rows
- Total audience count
- Audience types found
- ZIPs found


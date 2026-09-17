# Parish Finder — Data

This folder powers **Find your local parish** (ZIP search).

**Status:** Pilot only. Not linked from the homepage until the first diocese is complete.

## Schema (`parishes.json`)

Array of objects:

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| `id` | string | yes | Stable slug, e.g. `chicago-st-peter-loop` |
| `name` | string | yes | Parish name |
| `address` | string | yes | Street address |
| `city` | string | yes | |
| `state` | string | yes | 2-letter |
| `zip` | string | yes | 5-digit ZIP |
| `diocese` | string | yes | e.g. `Archdiocese of Chicago` |
| `diocese_id` | string | yes | e.g. `chicago` |
| `phone` | string | no | |
| `website` | string | no | Full URL |
| `lat` | number | no | For future distance sort |
| `lng` | number | no | |

## Pilot diocese

- **Archdiocese of Chicago** (`diocese_id: chicago`)
- Source of truth for expansion: official diocesan parish finder / directory (public pages)
- Do **not** scrape third-party aggregators (e.g. Discover Mass) for production data

## Build plan

1. Fill `parishes.json` for Chicago (complete pilot)
2. Optional: generate static `/parish/zip/XXXXX.html` pages later for SEO
3. Link from homepage only after pilot feels solid

## Privacy / accuracy

- Public parish contact info only
- Include a “Suggest a correction” note on the UI when live

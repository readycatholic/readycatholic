# Parish Finder — Data

This folder powers **Find your local parish** (ZIP search).

**Status:** Pilot only. Not linked from the homepage until coverage is solid.

## Schema (`parishes.json`)

Array of objects:

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| `id` | string | yes | Stable slug, e.g. `pb-cathedral-st-ignatius` |
| `name` | string | yes | Parish name |
| `address` | string | yes | Street address |
| `city` | string | yes | |
| `state` | string | yes | 2-letter |
| `zip` | string | yes | 5-digit ZIP |
| `diocese` | string | yes | e.g. `Diocese of Palm Beach` |
| `diocese_id` | string | yes | e.g. `palm-beach`, `orlando` |
| `phone` | string | no | |
| `website` | string | no | Full URL |
| `lat` | number | no | For future distance sort |
| `lng` | number | no | |

## Pilot dioceses

1. **Diocese of Palm Beach** (`palm-beach`) — official list: [diocesepb.org/parishes](https://www.diocesepb.org/parishes/parishes.html)
2. **Diocese of Orlando** (`orlando`) — official finder: [orlandodiocese.org/find-a-parish](https://www.orlandodiocese.org/find-a-parish/)

Current `parishes.json` is a **small sample** for testing ZIP search, not full coverage.

Do **not** scrape third-party aggregators (e.g. Discover Mass) for production data.

## Build plan

1. Expand samples → full Palm Beach + Orlando parish lists from official sources
2. Optional: static `/parish/zip/XXXXX.html` pages for SEO
3. Link from homepage only when pilot feels complete

## Privacy / accuracy

- Public parish contact info only
- Add “Suggest a correction” on the UI when public

# Impact Report — Where Numbers Come From

## 1. Data loading and caching

- **CSV location:** `data/Transportation_Active_Construction_Point.csv` (York Region projects) and `data/Bus_Routes_from_GTFS.csv` (YRT bus routes).
- **Parsing and cache:** `lib/impactReportData.ts`
  - `getProjects()` reads and parses the projects CSV on first use, then caches in memory (`projectsCache`). Same for `getRoutes()` and `routesCache`.
  - Parsing is **server-side only** (uses `fs`); no parsing on every request.
- **Coordinate system:** Project X,Y in the CSV are **NAD83 UTM Zone 17N (EPSG:26917)**. Converted to WGS84 (lat/lng) via `proj4` in `projectXYToLngLat()` for distance matching with the map.

---

## 2. Prompt assembly and Gemini call

- **File:** `app/api/environmental-report/route.ts`
- **Flow:**
  1. Request body: `{ buildings: PlacedBuilding[], snapshot?: MetricsSnapshot }`.
  2. **Computed locally (before Gemini):** Site centroid (avg lat/lng of buildings), nearby projects within 2 km (`findProjectsNear`), active routes on report date filtered by corridor keywords (`filterRoutesActiveOn` + `matchRoutesByCorridor`), **Transit Accessibility Score** (0–100), **Construction Constraint** (Low/Medium/High + summary).
  3. `buildingDetails` is built from each building’s `id`, `lat`, `lng`, `scale`, `timeline.zoneType`, `modelPath` (footprint and height derived from scale).
  4. Snapshot context (timeline date, active count, total footprint, material complexity) is included when provided.
  5. The prompt includes **only** the computed metrics and the **lists** of nearby projects and nearby routes. Gemini is instructed to reference **only** those projects and routes and not to invent any.
  6. Gemini returns JSON (summary, buildings, overallImpact, trafficScore, transitLoadScore, infrastructureIndex, financialScore, transportationImpact, transitImpact, infrastructureStrain, financialImpact, relevantYorkRegionProjects, recommendations). `relevantYorkRegionProjects` is server-filtered to only include names from the supplied nearby-projects list.

---

## 3. Computed locally vs from Gemini

| Data | Source |
|------|--------|
| Building list, coordinates, scale, zoning, type | **Client → API** (from map/editor). |
| Footprint (sq m), height (m) | **Computed in API** from `scale`. |
| Snapshot (date, active count, footprint, material complexity) | **Client**. |
| **Transit Accessibility Score** (0–100) | **Computed in API** from number of active matched routes + key corridors (`lib/impactReportData.ts`). |
| **Construction Constraint** (level + summary) | **Computed in API** from count and distance of nearby projects. |
| **Nearby York Region projects** (name, distance, status, subtype, link) | **From CSV** via `findProjectsNear()`; top 5 by distance. |
| **Nearby YRT routes** (route name, schedule) | **From CSV** via `getRoutes()` → `filterRoutesActiveOn()` → `matchRoutesByCorridor()`. |
| trafficScore, transitLoadScore, infrastructureIndex, financialScore | **From Gemini** (0–100) based on prompt and scoring instructions. |
| environmentalScore, societalScore, sustainabilityRating | **From Gemini**. |
| Summary, transportation/transit/infrastructure/financial narrative, recommendations | **From Gemini**, grounded on the supplied lists and numbers. |

---

## 4. Which building attributes change the report?

- **Location (`lat`, `lng`):** Drives site centroid → which projects are within 2 km and thus appear in “Nearby York Region Projects” and in the construction constraint. Transit route matching is by corridor keywords (not by building position), so location does not change the **list** of routes, but Gemini may tailor narrative to the area.
- **Scale (footprint, height):** In the prompt; affects Gemini’s traffic, transit load, infrastructure, and financial narrative and scores.
- **Zoning (`timeline.zoneType`):** In the prompt; influences use type and thus narrative.
- **Type (`modelPath`):** In the prompt; influences building-type description.
- **Snapshot (timeline date, active count, footprint, material complexity):** Timeline date is used to filter **routes** (schedule start/end). Other snapshot fields align narrative with current state.

---

## 5. York Region projects and bus routes

- **Projects:** Source of truth is `data/Transportation_Active_Construction_Point.csv`. Parsed by `parseProjectsCSV()`; cached by `getProjects()`. Matching: `findProjectsNear(siteLat, siteLng, 2)` (configurable radius in `DEFAULT_PROJECT_RADIUS_KM`).
- **Routes:** Source of truth is `data/Bus_Routes_from_GTFS.csv`. Parsed by `parseRoutesCSV()`; cached by `getRoutes()`. Matching: filter by report date (from snapshot or today), then `matchRoutesByCorridor()` using keywords (e.g. HIGHWAY 7, MAJOR MACKENZIE, KENNEDY, 16TH AVENUE).
- **In the report:** The UI shows “Nearby York Region Projects” from the **computed** list (CSV-based). “Transit Accessibility” shows the computed score and the list of matched routes. Gemini’s narrative is grounded on these lists only.

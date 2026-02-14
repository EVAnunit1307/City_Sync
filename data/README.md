# Impact Report data

This folder holds the CSV files used by the **Impact Report** feature:

- **`Transportation_Active_Construction_Point.csv`** — York Region construction/infrastructure projects (ArcGIS-style: X, Y, OBJECTID, PROJECTNAME, LOCATION, etc.).
- **`Bus_Routes_from_GTFS.csv`** — YRT bus routes (OBJECTID, ROUTE_ID, ROUTE_SHORT_NAME, ROUTE_LONG_NAME, SCHEDULE_START, SCHEDULE_END, SHAPE_Length).

If these files are missing (e.g. after cloning the repo without them), the Impact Report will still open but will show no nearby projects or routes. You can also place the same CSV files in the **project root** as a fallback; the app will look in both `data/` and the root.

Files are read with UTF-8. BOM and different line endings (CRLF/CR) are handled automatically.

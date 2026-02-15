/**
 * Impact Report data: parse York Region projects and YRT bus routes from CSVs.
 * Projects X,Y are assumed to be NAD83 UTM Zone 17N (EPSG:26917) — Ontario standard for ArcGIS.
 * Converted to WGS84 (lat/lng) for distance matching with map.
 */

import * as fs from 'fs';
import * as path from 'path';
import proj4 from 'proj4';

// NAD83 UTM Zone 17N (Ontario) — typical for York Region ArcGIS exports
const NAD83_UTM17 = '+proj=utm +zone=17 +ellps=GRS80 +datum=NAD83 +units=m +no_defs';
const WGS84 = 'EPSG:4326';

let projectsCache: Project[] | null = null;
let routesCache: Route[] | null = null;

export interface Project {
  objectId: number;
  projectName: string;
  location: string;
  webLink: string;
  projectType: string;
  projectCategory: string;
  projectSubtype: string;
  status: string;
  /** WGS84 */
  lat: number;
  lng: number;
  /** Distance from site (set by matching logic) */
  distanceKm?: number;
}

export interface Route {
  objectId: number;
  routeId: number;
  routeShortName: string;
  routeLongName: string;
  scheduleStart: string;
  scheduleEnd: string;
  shapeLength: number;
}

/**
 * Convert project X,Y (NAD83 UTM 17N meters) to WGS84 [lng, lat].
 * CRS: EPSG:26917 (NAD83 / UTM zone 17N) — document if your export uses something else.
 */
export function projectXYToLngLat(x: number, y: number): [number, number] {
  const [lng, lat] = proj4(NAD83_UTM17, WGS84, [x, y]);
  return [lng, lat];
}

/**
 * Parse the York Region projects CSV (ArcGIS export style).
 * Columns: X,Y,OBJECTID,PROJECTNAME,LOCATION,WEBLINK,PROJECTTYPE,PROJECTCATEGORY,PROJECTSUBTYPE,STATUS
 */
export function parseProjectsCSV(csvContent: string): Project[] {
  const normalized = normalizeCSVContent(csvContent);
  const lines = normalized.split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim());
  const xIdx = header.indexOf('X');
  const yIdx = header.indexOf('Y');
  const idIdx = header.indexOf('OBJECTID');
  const nameIdx = header.indexOf('PROJECTNAME');
  const locIdx = header.indexOf('LOCATION');
  const linkIdx = header.indexOf('WEBLINK');
  const typeIdx = header.indexOf('PROJECTTYPE');
  const catIdx = header.indexOf('PROJECTCATEGORY');
  const subIdx = header.indexOf('PROJECTSUBTYPE');
  const statusIdx = header.indexOf('STATUS');

  const projects: Project[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = parseCSVLine(line);
    if (parts.length < header.length) continue;

    const get = (idx: number) => (idx >= 0 ? (parts[idx] ?? '').trim() : '');
    const x = parseFloat(get(xIdx));
    const y = parseFloat(get(yIdx));
    if (Number.isNaN(x) || Number.isNaN(y)) continue;

    let lng: number;
    let lat: number;
    try {
      [lng, lat] = projectXYToLngLat(x, y);
    } catch {
      continue;
    }

    projects.push({
      objectId: parseInt(get(idIdx), 10) || i,
      projectName: get(nameIdx),
      location: get(locIdx),
      webLink: get(linkIdx),
      projectType: get(typeIdx),
      projectCategory: get(catIdx),
      projectSubtype: get(subIdx),
      status: get(statusIdx),
      lat,
      lng,
    });
  }

  return projects;
}

/**
 * Parse the bus routes CSV (GTFS-style).
 * Columns: OBJECTID,ROUTE_ID,ROUTE_SHORT_NAME,ROUTE_LONG_NAME,SCHEDULE_START,SCHEDULE_END,SHAPE_Length
 */
export function parseRoutesCSV(csvContent: string): Route[] {
  const lines = csvContent.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim());
  const idIdx = header.indexOf('OBJECTID');
  const routeIdIdx = header.indexOf('ROUTE_ID');
  const shortIdx = header.indexOf('ROUTE_SHORT_NAME');
  const longIdx = header.indexOf('ROUTE_LONG_NAME');
  const startIdx = header.indexOf('SCHEDULE_START');
  const endIdx = header.indexOf('SCHEDULE_END');
  const lengthIdx = header.indexOf('SHAPE_Length');

  const routes: Route[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]);
    if (parts.length < 5) continue;

    const get = (idx: number) => (idx >= 0 ? (parts[idx] ?? '').trim() : '');

    routes.push({
      objectId: parseInt(get(idIdx), 10) || i,
      routeId: parseInt(get(routeIdIdx), 10) || i,
      routeShortName: get(shortIdx),
      routeLongName: get(longIdx),
      scheduleStart: get(startIdx),
      scheduleEnd: get(endIdx),
      shapeLength: parseFloat(get(lengthIdx)) || 0,
    });
  }

  return routes;
}

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === ',' && !inQuotes) || c === '\n') {
      out.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  out.push(current);
  return out;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const PROJECTS_FILENAME = 'Transportation_Active_Construction_Point.csv';
const ROUTES_FILENAME = 'Bus_Routes_from_GTFS.csv';

/** Strip BOM and normalize line endings so CSV parses correctly across OS/editors. */
function normalizeCSVContent(content: string): string {
  return content.replace(/^\uFEFF/, '').trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** Resolve path: prefer data/ then project root (for clones that only have CSVs at root). */
function resolveDataPath(filename: string): string | null {
  const inData = path.join(DATA_DIR, filename);
  if (fs.existsSync(inData)) return inData;
  const inRoot = path.join(process.cwd(), filename);
  if (fs.existsSync(inRoot)) return inRoot;
  return null;
}

function readProjectsFromDisk(): Project[] {
  const filePath = resolveDataPath(PROJECTS_FILENAME);
  if (!filePath) {
    console.warn(`Impact report: ${PROJECTS_FILENAME} not found in data/ or project root. Using empty list.`);
    return [];
  }
  const content = normalizeCSVContent(fs.readFileSync(filePath, 'utf-8'));
  return parseProjectsCSV(content);
}

function readRoutesFromDisk(): Route[] {
  const filePath = resolveDataPath(ROUTES_FILENAME);
  if (!filePath) {
    console.warn(`Impact report: ${ROUTES_FILENAME} not found in data/ or project root. Using empty list.`);
    return [];
  }
  const content = normalizeCSVContent(fs.readFileSync(filePath, 'utf-8'));
  return parseRoutesCSV(content);
}

/**
 * Get projects (cached). Call from API route only (server-side).
 * Returns [] if file is missing or parse fails.
 */
export function getProjects(): Project[] {
  if (projectsCache === null) {
    try {
      projectsCache = readProjectsFromDisk();
    } catch (e) {
      console.error('Failed to load projects CSV:', e);
      projectsCache = [];
    }
  }
  return projectsCache;
}

/**
 * Get routes (cached). Call from API route only (server-side).
 * Returns [] if file is missing or parse fails.
 */
export function getRoutes(): Route[] {
  if (routesCache === null) {
    try {
      routesCache = readRoutesFromDisk();
    } catch (e) {
      console.error('Failed to load routes CSV:', e);
      routesCache = [];
    }
  }
  return routesCache;
}

/**
 * Haversine distance in km between two WGS84 points.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Default radius (km) for "nearby" projects */
export const DEFAULT_PROJECT_RADIUS_KM = 2;

/** Hard cap (km) for Impact Report: only projects within this radius are shown or used for constraint. */
export const REPORT_PROJECT_RADIUS_KM = 5;

/**
 * Find projects within radius of a site (lat/lng). Attach distanceKm to each.
 * Used when CRS conversion is trusted; otherwise prefer getProjectsForReport (keyword match).
 */
export function findProjectsNear(
  siteLat: number,
  siteLng: number,
  radiusKm: number = DEFAULT_PROJECT_RADIUS_KM
): Project[] {
  const projects = getProjects();
  const withDist = projects.map((p) => ({
    ...p,
    distanceKm: haversineKm(siteLat, siteLng, p.lat, p.lng),
  }));
  const nearby = withDist.filter((p) => p.distanceKm <= radiusKm);
  nearby.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  return nearby;
}

/**
 * Match projects by corridor keywords: PROJECTNAME + LOCATION (case-insensitive) must
 * contain one of the keywords. Attaches distanceKm when site is provided. Sorted by
 * distance (asc, undefined last). Returns top PROJECTS_CAP (8).
 * Use this when radius filtering fails (e.g. CRS mismatch) or to ensure corridor-relevant projects.
 */
export function findProjectsByCorridorKeyword(
  siteLat: number,
  siteLng: number,
  corridorKeywords: string[]
): Project[] {
  const projects = getProjects();
  if (!corridorKeywords || corridorKeywords.length === 0) return [];
  const upper = corridorKeywords.map((k) => k.toUpperCase());
  const combined = (p: Project) =>
    `${p.projectName || ''} ${p.location || ''}`.toUpperCase();
  const matched = projects.filter((p) =>
    upper.some((k) => combined(p).includes(k))
  );
  const withDist = matched.map((p) => ({
    ...p,
    distanceKm: haversineKm(siteLat, siteLng, p.lat, p.lng),
  }));
  withDist.sort((a, b) => {
    const da = a.distanceKm ?? 9999;
    const db = b.distanceKm ?? 9999;
    return da - db;
  });
  return withDist.slice(0, PROJECTS_CAP);
}

/**
 * Filter to projects within radius (distanceKm <= radiusKm). Sorted by distance ascending.
 * Use for report so only projects within REPORT_PROJECT_RADIUS_KM are shown or passed to Gemini.
 */
export function filterProjectsWithinRadius(
  projects: Project[],
  radiusKm: number = REPORT_PROJECT_RADIUS_KM
): Project[] {
  const within = projects.filter(
    (p) => p.distanceKm != null && p.distanceKm <= radiusKm
  );
  within.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  return within;
}

/** Max number of routes to show in Transit Accessibility (cap). */
export const TRANSIT_ROUTES_CAP = 8;

/** Max number of projects to show in report (cap). */
export const PROJECTS_CAP = 8;

/**
 * Strict corridor list for Markham / York Region. Routes: ROUTE_LONG_NAME must contain
 * one of these. Projects: PROJECTNAME or LOCATION must contain one (for keyword matching).
 */
export const MARKHAM_CORRIDORS = [
  'HIGHWAY 7',
  'MAJOR MACKENZIE',
  'KENNEDY',
  'MCCOWAN',
  'WARDEN',
  '16TH AVENUE',
  'NINTH LINE',
  '14TH AVENUE',
  '14TH',
  '16TH',
  'LESLIE',
  'DENISON',
] as const;

/** Legacy export for callers that still reference KEY_CORRIDORS; prefer getCorridorsNearSite. */
export const KEY_CORRIDORS = [...MARKHAM_CORRIDORS];

/**
 * Curated bounding boxes (lat/lng) for Markham-area corridors. Used for spatial filtering:
 * only routes whose corridor name matches a bbox that contains the site are "nearby".
 * Format: minLat, maxLat, minLng, maxLng (WGS84).
 */
const CORRIDOR_BBOXES: Array<{ name: string; minLat: number; maxLat: number; minLng: number; maxLng: number }> = [
  { name: 'HIGHWAY 7', minLat: 43.84, maxLat: 43.88, minLng: -79.38, maxLng: -79.22 },
  { name: 'MAJOR MACKENZIE', minLat: 43.83, maxLat: 43.92, minLng: -79.38, maxLng: -79.32 },
  { name: 'KENNEDY', minLat: 43.84, maxLat: 43.90, minLng: -79.30, maxLng: -79.22 },
  { name: 'MCCOWAN', minLat: 43.84, maxLat: 43.90, minLng: -79.32, maxLng: -79.24 },
  { name: 'WARDEN', minLat: 43.84, maxLat: 43.90, minLng: -79.34, maxLng: -79.26 },
  { name: '16TH AVENUE', minLat: 43.86, maxLat: 43.90, minLng: -79.36, maxLng: -79.24 },
  { name: '14TH AVENUE', minLat: 43.86, maxLat: 43.90, minLng: -79.36, maxLng: -79.24 },
  { name: '14TH', minLat: 43.86, maxLat: 43.90, minLng: -79.36, maxLng: -79.24 },
  { name: '16TH', minLat: 43.86, maxLat: 43.90, minLng: -79.36, maxLng: -79.24 },
  { name: 'NINTH LINE', minLat: 43.86, maxLat: 43.90, minLng: -79.28, maxLng: -79.22 },
  { name: 'LESLIE', minLat: 43.84, maxLat: 43.90, minLng: -79.32, maxLng: -79.26 },
  { name: 'DENISON', minLat: 43.85, maxLat: 43.88, minLng: -79.28, maxLng: -79.24 },
];

/**
 * Return corridor keywords for route matching only for corridors whose curated bbox contains the site.
 * This makes "nearby routes" spatial: only routes on corridors that are actually near the point.
 */
export function getCorridorsNearSite(lat: number, lng: number): string[] {
  const names = new Set<string>();
  for (const box of CORRIDOR_BBOXES) {
    if (lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng) {
      names.add(box.name);
    }
  }
  return names.size > 0 ? [...names] : [...MARKHAM_CORRIDORS];
}

/**
 * Return corridor keywords used for route matching at this site.
 * Uses spatial bbox when available; otherwise full Markham preset.
 */
export function getCorridorsForSite(lat: number, lng: number): string[] {
  return getCorridorsNearSite(lat, lng);
}

/**
 * De-duplicate routes by ROUTE_ID (keep first occurrence). Removes duplicate entries.
 */
export function dedupeByRouteId(routes: Route[]): Route[] {
  const seen = new Set<number>();
  return routes.filter((r) => {
    if (seen.has(r.routeId)) return false;
    seen.add(r.routeId);
    return true;
  });
}

/**
 * Parse schedule date string (e.g. "2025/01/05 00:00:00+00") to Date.
 */
export function parseScheduleDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s.replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Filter to ACTIVE routes only: current date must be within [SCHEDULE_START, SCHEDULE_END].
 * Routes with missing or unparseable dates are excluded.
 */
export function filterRoutesActiveOn(routes: Route[], date: Date): Route[] {
  return routes.filter((r) => {
    const start = parseScheduleDate(r.scheduleStart);
    const end = parseScheduleDate(r.scheduleEnd);
    if (!start || !end) return false;
    const t = date.getTime();
    return t >= start.getTime() && t <= end.getTime();
  });
}

/**
 * Match routes by corridor keywords: include only if ROUTE_LONG_NAME contains one of the
 * keywords (case-insensitive). Strict: if keywords is empty, returns [].
 * Capped at TRANSIT_ROUTES_CAP (8).
 */
export function matchRoutesByCorridor(routes: Route[], keywords: string[]): Route[] {
  if (!keywords || keywords.length === 0) return [];
  const upper = keywords.map((k) => k.toUpperCase());
  const matched = routes.filter((r) => {
    const name = (r.routeLongName || r.routeShortName || '').toUpperCase();
    return upper.some((k) => name.includes(k));
  });
  return matched.slice(0, TRANSIT_ROUTES_CAP);
}

/**
 * Return the list of corridor keywords that actually matched at least one route
 * (for UI: "Matched corridors: X, Y").
 */
export function getMatchedCorridorNames(
  matchedRoutes: Route[],
  corridorKeywords: string[]
): string[] {
  const upper = corridorKeywords.map((k) => k.toUpperCase());
  const matched = new Set<string>();
  for (const r of matchedRoutes) {
    const name = (r.routeLongName || r.routeShortName || '').toUpperCase();
    for (const k of upper) {
      if (name.includes(k)) matched.add(k);
    }
  }
  return [...matched];
}

/**
 * Transit Accessibility Score 0–100 based only on matched ACTIVE routes (after filtering):
 * - Base: count of matched routes (capped contribution)
 * - Bonus if any matched route is VIVA
 * - Bonus if any matched route includes HIGHWAY 7 or MAJOR MACKENZIE (arterials)
 * Does not use total CSV route count.
 */
export function computeTransitAccessibilityScore(matchedRoutes: Route[]): number {
  let score = 0;
  score += Math.min(matchedRoutes.length * 8, 55);
  const nameUpper = (r: Route) => (r.routeLongName || r.routeShortName || '').toUpperCase();
  const hasViva = matchedRoutes.some((r) => nameUpper(r).includes('VIVA'));
  const hasArterial = matchedRoutes.some(
    (r) => nameUpper(r).includes('HIGHWAY 7') || nameUpper(r).includes('MAJOR MACKENZIE')
  );
  if (hasViva) score += 20;
  if (hasArterial) score += 15;
  return Math.min(100, Math.round(score));
}

export type ConstructionConstraintLevel = 'Low' | 'Medium' | 'High';

/** Distance band weight: <1 km => 1.0, 1–3 km => 0.6, 3–5 km => 0.3. >5 km ignored by caller. */
function distanceWeight(km: number): number {
  if (km < 1) return 1.0;
  if (km < 3) return 0.6;
  return 0.3;
}

/** Severity multiplier from subtype/category (deterministic, no AI). */
function severityMultiplier(p: Project): number {
  const sub = (p.projectSubtype || '').toUpperCase();
  const cat = (p.projectCategory || '').toUpperCase();
  const type = (p.projectType || '').toUpperCase();
  const combined = `${sub} ${cat} ${type}`;
  if (/\b(WIDENING|INTERSECTION|BRIDGE)\b/.test(combined)) return 0.2;
  if (/\b(PUMPING|RESERVOIR|VALVE|SERVICING)\b/.test(combined)) return 0.15;
  if (/\b(CULVERT|RESURFACING|PRESERVATION)\b/.test(combined)) return 0.1;
  return 0;
}

/**
 * Classify construction constraint from projects within 5 km only.
 * Weighted score: distance bands (<1 km: 1.0, 1–3: 0.6, 3–5: 0.3) + subtype severity.
 * Label: score < 0.6 => Low, 0.6–1.4 => Medium, >= 1.4 => High.
 */
export function classifyConstructionConstraint(
  nearbyProjects: Project[]
): { level: ConstructionConstraintLevel; summary: string } {
  const n = nearbyProjects.length;
  if (n === 0) {
    return { level: 'Low', summary: 'No active construction projects within 5 km.' };
  }
  const closest = nearbyProjects[0]?.distanceKm ?? 999;
  let score = 0;
  for (const p of nearbyProjects) {
    const km = p.distanceKm ?? 5;
    if (km > 5) continue;
    score += distanceWeight(km) + severityMultiplier(p);
  }
  let level: ConstructionConstraintLevel;
  if (score < 0.6) level = 'Low';
  else if (score < 1.4) level = 'Medium';
  else level = 'High';
  const summary =
    `${n} project(s) within 5 km; closest ${closest.toFixed(1)} km. ` +
    (level === 'High'
      ? 'Significant construction constraint.'
      : level === 'Medium'
        ? 'Moderate construction constraint.'
        : 'Low construction constraint.');
  return { level, summary };
}

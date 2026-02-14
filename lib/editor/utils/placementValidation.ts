/**
 * Central placement validator: parcels, roads, existing buildings.
 * All coordinates in world (x, z); y is ignored for containment.
 */

import type { BuildingType } from '@/lib/editor/types/buildingSpec';

export interface Parcel {
  id: string;
  /** Polygon vertices [x, z] in world space (closed: first === last optional). */
  polygon: [number, number][];
  /** Optional: allowed building types for zoning. */
  allowedTypes?: BuildingType[];
}

export interface RoadSegment {
  /** Segment from A to B. */
  from: [number, number];
  to: [number, number];
  width: number;
}

export interface Road {
  id: string;
  segments: RoadSegment[];
  /** Default width if segment has none. */
  width: number;
}

export interface ValidatePlacementOptions {
  parcels: Parcel[];
  roads: Road[];
  /** Existing building positions with radius (footprint radius). */
  existing: { x: number; z: number; radius: number }[];
  /** Buffer added to road width (distance from road center). */
  roadBuffer?: number;
}

export interface ValidatePlacementResult {
  ok: boolean;
  reason?: string;
  parcelId?: string;
}

/** Point-in-polygon (ray casting). Polygon in [x,z]. */
function pointInPolygon(px: number, pz: number, polygon: [number, number][]): boolean {
  const n = polygon.length;
  if (n < 3) return false;
  let inside = false;
  let j = n - 1;
  for (let i = 0; i < n; i++) {
    const xi = polygon[i][0];
    const zi = polygon[i][1];
    const xj = polygon[j][0];
    const zj = polygon[j][1];
    if (((zi > pz) !== (zj > pz)) && (px < (xj - xi) * (pz - zi) / (zj - zi) + xi)) {
      inside = !inside;
    }
    j = i;
  }
  return inside;
}

/** Squared distance from point (px,pz) to segment (ax,az)-(bx,bz). */
function distToSegmentSq(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const abx = bx - ax;
  const abz = bz - az;
  const apx = px - ax;
  const apz = pz - az;
  const t = Math.max(0, Math.min(1, (apx * abx + apz * abz) / (abx * abx + abz * abz || 1)));
  const qx = ax + t * abx;
  const qz = az + t * abz;
  return (px - qx) ** 2 + (pz - qz) ** 2;
}

/** Minimum distance from (px,pz) to any road segment. */
function minDistToRoads(px: number, pz: number, roads: Road[], buffer: number): { minDist: number; onRoad: boolean } {
  let minDist = Infinity;
  for (const road of roads) {
    for (const seg of road.segments) {
      const w = (seg.width ?? road.width) / 2 + buffer;
      const dSq = distToSegmentSq(px, pz, seg.from[0], seg.from[1], seg.to[0], seg.to[1]);
      const d = Math.sqrt(dSq);
      if (d < w) return { minDist: 0, onRoad: true };
      minDist = Math.min(minDist, d);
    }
  }
  return { minDist: minDist === Infinity ? 1e9 : minDist, onRoad: false };
}

/**
 * Validate a single placement.
 * buildingFootprint: { width, depth } or radius (half of max dimension).
 */
export function validatePlacement(
  position: { x: number; y: number; z: number },
  buildingFootprint: { width: number; depth: number } | { radius: number },
  _type: BuildingType,
  options: ValidatePlacementOptions
): ValidatePlacementResult {
  const { parcels, roads, existing, roadBuffer = 1 } = options;
  const px = position.x;
  const pz = position.z;

  const radius = 'radius' in buildingFootprint
    ? buildingFootprint.radius
    : Math.max(buildingFootprint.width, buildingFootprint.depth) / 2;

  if (parcels.length > 0) {
    const inside = parcels.some((parcel) => pointInPolygon(px, pz, parcel.polygon));
    if (!inside) {
      return { ok: false, reason: 'Outside parcels' };
    }
    const parcel = parcels.find((p) => pointInPolygon(px, pz, p.polygon));
    if (parcel?.allowedTypes && parcel.allowedTypes.length > 0 && !parcel.allowedTypes.includes(_type)) {
      return { ok: false, reason: 'Zoning does not allow this building type', parcelId: parcel.id };
    }
  }

  const { onRoad } = minDistToRoads(px, pz, roads, roadBuffer);
  if (onRoad) {
    return { ok: false, reason: 'On road' };
  }

  for (const ex of existing) {
    if (Math.hypot(px - ex.x, pz - ex.z) < radius + ex.radius) {
      return { ok: false, reason: 'Overlaps existing building' };
    }
  }

  return { ok: true, parcelId: parcels.find((p) => pointInPolygon(px, pz, p.polygon))?.id };
}

/** Default road width (meters) when not specified. */
export const DEFAULT_ROAD_WIDTH = 8;

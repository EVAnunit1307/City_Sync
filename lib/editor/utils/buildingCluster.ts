import type { BuildingInstance, BuildingSpecification, BuildingType } from '@/lib/editor/types/buildingSpec';
import { DEFAULT_BUILDING_SPEC } from '@/lib/editor/types/buildingSpec';

/** Optional units per building by type (for display/export; cluster uses totalBuildings + mix). */
export const UNITS_PER_BUILDING: Record<BuildingType, number> = {
  detached: 1,
  townhouse: 8,
  midrise: 60,
};

/** Housing mix in percentages (0–100); must sum to 100. */
export interface BatchMix {
  detachedPct: number;
  townhousePct: number;
  midrisePct: number;
}

export interface BatchConfig {
  /** Number of buildings to place. */
  totalBuildings: number;
  /** Spacing between building centers (meters). */
  spacing: number;
  /** Scales the overall spread (compact vs spread). */
  footprintScale: number;
  /** Housing mix percentages; must sum to 100. */
  mix: BatchMix;
  /** Optional units per building type (defaults: detached=1, townhouse=8, midrise=60). */
  unitsPerBuilding?: Record<BuildingType, number>;
}

/** Ground plane half-extent for clamping (matches Scene grid plane). */
const GROUND_BOUNDS = 500;

/** Minimum spacing per type (world units) to avoid overlap / z-fighting. */
export const DETACHED_MIN_SPACING = 10;
export const TOWNHOUSE_MIN_SPACING = 14;
export const MIDRISE_MIN_SPACING = 22;

const MIN_SPACING: Record<BuildingType, number> = {
  detached: DETACHED_MIN_SPACING,
  townhouse: TOWNHOUSE_MIN_SPACING,
  midrise: MIDRISE_MIN_SPACING,
};

/** Approximate footprint radius per type (half of max width,depth from preset). */
export const FOOTPRINT_RADIUS: Record<BuildingType, number> = {
  detached: 7,
  townhouse: 7,
  midrise: 11,
};

/** Footprint width/depth for placement validation. */
export function getFootprintForType(type: BuildingType): { width: number; depth: number } {
  const spec = getSpecForType(type);
  return {
    width: spec.width ?? DEFAULT_BUILDING_SPEC.width,
    depth: spec.depth ?? DEFAULT_BUILDING_SPEC.depth,
  };
}

const DEFAULT_MIX: BatchMix = {
  detachedPct: 60,
  townhousePct: 30,
  midrisePct: 10,
};

export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  totalBuildings: 20,
  spacing: 8,
  footprintScale: 1.0,
  mix: DEFAULT_MIX,
  unitsPerBuilding: { ...UNITS_PER_BUILDING },
};

/** Plan entry for subdivision library / custom builder. */
export interface SubdivisionPlanEntry {
  type: BuildingType;
  count: number;
}

/** Convert a plan (list of type + count) to BatchConfig. Mix is derived from counts. */
export function planToBatchConfig(
  plan: SubdivisionPlanEntry[],
  spacing: number = 8,
  footprintScale: number = 1.0
): BatchConfig {
  const total = plan.reduce((s, e) => s + e.count, 0);
  if (total === 0) {
    return { ...DEFAULT_BATCH_CONFIG, totalBuildings: 0, mix: DEFAULT_MIX };
  }
  const detached = plan.filter((e) => e.type === 'detached').reduce((s, e) => s + e.count, 0);
  const townhouse = plan.filter((e) => e.type === 'townhouse').reduce((s, e) => s + e.count, 0);
  const midrise = plan.filter((e) => e.type === 'midrise').reduce((s, e) => s + e.count, 0);
  let d = Math.round((100 * detached) / total);
  let t = Math.round((100 * townhouse) / total);
  let m = Math.round((100 * midrise) / total);
  if (d + t + m !== 100) {
    const diff = 100 - (d + t + m);
    if (d >= t && d >= m) d += diff;
    else if (t >= m) t += diff;
    else m += diff;
  }
  return {
    totalBuildings: total,
    spacing,
    footprintScale,
    mix: { detachedPct: d, townhousePct: t, midrisePct: m },
    unitsPerBuilding: { ...UNITS_PER_BUILDING },
  };
}

/** Preset spec overrides per building type (dimensions, floors). */
function getSpecForType(type: BuildingType): Partial<BuildingSpecification> {
  const base = { ...DEFAULT_BUILDING_SPEC };
  switch (type) {
    case 'detached':
      return {
        ...base,
        width: 14,
        depth: 12,
        numberOfFloors: 2,
        floorHeight: 3.2,
        roofType: 'gabled',
        roofHeight: 2.5,
      };
    case 'townhouse':
      return {
        ...base,
        width: 10,
        depth: 14,
        numberOfFloors: 3,
        floorHeight: 3,
        roofType: 'flat',
        roofHeight: 0.3,
      };
    case 'midrise':
      return {
        ...base,
        width: 22,
        depth: 18,
        numberOfFloors: 6,
        floorHeight: 3.2,
        roofType: 'flat',
        roofHeight: 0.3,
      };
    default:
      return base;
  }
}

/** Small yaw variation (radians) for slight rotation variety. */
function smallYaw(): number {
  return (Math.random() - 0.5) * 0.15;
}

/**
 * Compute building counts per type from totalBuildings and mix percentages.
 * Ensures sum === totalBuildings by adjusting the largest bucket.
 */
function distributeCounts(totalBuildings: number, mix: BatchMix): { detached: number; townhouse: number; midrise: number } {
  const scale = totalBuildings / 100;
  let detached = Math.round(mix.detachedPct * scale);
  let townhouse = Math.round(mix.townhousePct * scale);
  let midrise = Math.round(mix.midrisePct * scale);
  const sum = detached + townhouse + midrise;
  if (sum !== totalBuildings) {
    const diff = totalBuildings - sum;
    const byCount: [string, number][] = [
      ['detached', detached],
      ['townhouse', townhouse],
      ['midrise', midrise],
    ].sort((a, b) => b[1] - a[1]);
    const largestKey = byCount[0][0];
    if (largestKey === 'detached') detached += diff;
    else if (largestKey === 'townhouse') townhouse += diff;
    else midrise += diff;
  }
  detached = Math.max(0, detached);
  townhouse = Math.max(0, townhouse);
  midrise = Math.max(0, midrise);
  const total = detached + townhouse + midrise;
  if (total === 0) {
    detached = totalBuildings;
  } else if (total !== totalBuildings) {
    detached += totalBuildings - total;
    detached = Math.max(0, detached);
  }
  return { detached, townhouse, midrise };
}

/**
 * Build a flat list of building types in placement order (row-major grid).
 */
function buildPlacementList(config: BatchConfig): BuildingType[] {
  const { totalBuildings, mix } = config;
  const counts = distributeCounts(totalBuildings, mix);
  const list: BuildingType[] = [];
  const push = (type: BuildingType, n: number) => {
    for (let i = 0; i < n; i++) list.push(type);
  };
  push('detached', counts.detached);
  push('townhouse', counts.townhouse);
  push('midrise', counts.midrise);
  return list;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Slightly above ground to prevent z-fighting with ground plane. */
const GROUND_OFFSET_Y = 0.02;

/**
 * Grid step = max(userSpacing * footprintScale, max(MIN_SPACING)) so placements never overlap.
 * Then place buildings in row-major order with collision check; if a cell overlaps, try next cell.
 */
export function generateBuildingCluster(
  originPosition: { x: number; y: number; z: number },
  config: BatchConfig
): BuildingInstance[] {
  const { totalBuildings, spacing, footprintScale, unitsPerBuilding = UNITS_PER_BUILDING } = config;
  const placementList = buildPlacementList(config);
  if (placementList.length === 0) return [];

  const baseStep = Math.max(spacing * footprintScale, Math.max(DETACHED_MIN_SPACING, TOWNHOUSE_MIN_SPACING, MIDRISE_MIN_SPACING));
  const cols = Math.ceil(Math.sqrt(totalBuildings));
  const rows = Math.ceil(totalBuildings / cols);
  const result: BuildingInstance[] = [];
  const placed: { x: number; z: number; radius: number }[] = [];

  let cellIndex = 0;
  for (let i = 0; i < placementList.length; i++) {
    const type = placementList[i];
    const radius = FOOTPRINT_RADIUS[type];

    let row = Math.floor(cellIndex / cols);
    let col = cellIndex % cols;
    let x = originPosition.x + (col - (cols - 1) / 2) * baseStep;
    let z = originPosition.z + (row - (rows - 1) / 2) * baseStep;

    while (true) {
      const overlaps = placed.some(
        (p) => Math.hypot(x - p.x, z - p.z) < radius + p.radius
      );
      if (!overlaps) break;
      cellIndex += 1;
      row = Math.floor(cellIndex / cols);
      col = cellIndex % cols;
      x = originPosition.x + (col - (cols - 1) / 2) * baseStep;
      z = originPosition.z + (row - (rows - 1) / 2) * baseStep;
    }

    const finalX = clamp(x, -GROUND_BOUNDS, GROUND_BOUNDS);
    const finalZ = clamp(z, -GROUND_BOUNDS, GROUND_BOUNDS);
    const y = originPosition.y + GROUND_OFFSET_Y;

    placed.push({ x: finalX, z: finalZ, radius });
    cellIndex += 1;

    const specOverride = getSpecForType(type);
    const spec: BuildingSpecification = { ...DEFAULT_BUILDING_SPEC, ...specOverride };
    const units = unitsPerBuilding[type];

    const id = `building-${Date.now()}-${i}`;
    const building: BuildingInstance = {
      id,
      name: `Building ${type}-${i + 1}`,
      position: { x: finalX, y, z: finalZ },
      rotation: smallYaw(),
      spec,
      buildingType: type,
      units,
    };
    result.push(building);
  }

  return result;
}

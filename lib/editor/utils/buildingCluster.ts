import type { BuildingInstance, BuildingSpecification, BuildingType } from '@/lib/editor/types/buildingSpec';
import { DEFAULT_BUILDING_SPEC } from '@/lib/editor/types/buildingSpec';
import { generateRandomRotation } from './buildingRandomizer';

/** Default units per building by type (used for counting how many buildings to place). */
export const UNITS_PER_BUILDING: Record<BuildingType, number> = {
  detached: 2,
  townhouse: 4,
  midrise: 12,
};

/** Mix percentages: detached, townhouse, midrise (0–1). */
export interface ClusterMix {
  detached: number;
  townhouse: number;
  midrise: number;
}

export interface ClusterConfig {
  /** Total residential units to distribute across the cluster. */
  totalUnits: number;
  /** Mix of building types (percentages 0–1; should sum to 1). */
  mix: ClusterMix;
  /** Grid spacing between building centers (meters). */
  spacing: number;
  /** Max grid rows (z direction). */
  maxRows: number;
  /** Max grid columns (x direction). */
  maxCols: number;
}

const DEFAULT_MIX: ClusterMix = {
  detached: 0.6,
  townhouse: 0.3,
  midrise: 0.1,
};

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

/**
 * Compute how many buildings of each type to place to approximate totalUnits
 * given the mix and units per building.
 */
function distributeUnits(config: ClusterConfig): { detached: number; townhouse: number; midrise: number } {
  const { totalUnits, mix } = config;
  const u = UNITS_PER_BUILDING;

  let detachedCount = Math.max(0, Math.round((totalUnits * mix.detached) / u.detached));
  let townhouseCount = Math.max(0, Math.round((totalUnits * mix.townhouse) / u.townhouse));
  let midriseCount = Math.max(0, Math.round((totalUnits * mix.midrise) / u.midrise));

  // If rounding left us with zero buildings, ensure at least one of the dominant type
  const totalBuildings = detachedCount + townhouseCount + midriseCount;
  if (totalBuildings === 0) {
    detachedCount = 1;
  }

  return { detached: detachedCount, townhouse: townhouseCount, midrise: midriseCount };
}

/**
 * Build a flat list of building types in placement order (row-major grid).
 * Each item is { type, width, depth } for layout.
 */
function buildPlacementList(config: ClusterConfig): { type: BuildingType; width: number; depth: number }[] {
  const counts = distributeUnits(config);
  const list: { type: BuildingType; width: number; depth: number }[] = [];

  const push = (type: BuildingType, n: number) => {
    const spec = getSpecForType(type);
    const width = spec.width ?? DEFAULT_BUILDING_SPEC.width;
    const depth = spec.depth ?? DEFAULT_BUILDING_SPEC.depth;
    for (let i = 0; i < n; i++) list.push({ type, width, depth });
  };

  push('detached', counts.detached);
  push('townhouse', counts.townhouse);
  push('midrise', counts.midrise);

  return list;
}

// Max dimensions across presets for a fixed grid cell (avoids overlap).
const MAX_PRESET_WIDTH = 22;
const MAX_PRESET_DEPTH = 18;

/**
 * Place buildings in a compact grid around the origin. Uses spacing to avoid overlap.
 * Y is kept at ground level (origin.y). Returns array of BuildingInstance with unique ids.
 */
export function generateBuildingCluster(
  originPosition: { x: number; y: number; z: number },
  config: ClusterConfig
): BuildingInstance[] {
  const { spacing, maxRows, maxCols } = config;
  const placementList = buildPlacementList(config);
  if (placementList.length === 0) return [];

  const stepX = MAX_PRESET_WIDTH + spacing;
  const stepZ = MAX_PRESET_DEPTH + spacing;
  const result: BuildingInstance[] = [];
  let row = 0;
  let col = 0;

  for (let i = 0; i < placementList.length; i++) {
    if (row >= maxRows) break;

    const { type } = placementList[i];
    const specOverride = getSpecForType(type);
    const spec: BuildingSpecification = { ...DEFAULT_BUILDING_SPEC, ...specOverride };
    const units = UNITS_PER_BUILDING[type];

    const x = originPosition.x + col * stepX;
    const z = originPosition.z + row * stepZ;
    const y = originPosition.y;

    const id = `building-${Date.now()}-${i}`;
    const building: BuildingInstance = {
      id,
      name: `Building ${type}-${i + 1}`,
      position: { x, y, z },
      rotation: generateRandomRotation(),
      spec,
      buildingType: type,
      units,
    };

    result.push(building);

    col += 1;
    if (col >= maxCols) {
      col = 0;
      row += 1;
    }
  }

  return result;
}

/** Default config for "Place Subdivision (Batch)" button. */
export const DEFAULT_CLUSTER_CONFIG: ClusterConfig = {
  totalUnits: 200,
  mix: DEFAULT_MIX,
  spacing: 4,
  maxRows: 8,
  maxCols: 8,
};

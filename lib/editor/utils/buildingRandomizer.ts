import type { BuildingSpecification, RoofType, WindowPattern, WindowShape } from '@/lib/editor/types/buildingSpec';
import { DEFAULT_BUILDING_SPEC, DEFAULT_TREE_CONFIG } from '@/lib/editor/types/buildingSpec';

/**
 * Generates a randomized BuildingSpecification for visual variety.
 * Each call produces a unique building with varied height, dimensions,
 * orientation, roof style, textures, and window patterns.
 */

const ROOF_TYPES: RoofType[] = ['flat', 'gabled', 'hipped', 'pyramid'];
const WINDOW_SHAPES: WindowShape[] = ['rectangular', 'arched', 'circular', 'triangular'];
const WALL_TEXTURES = ['brick', 'concrete', 'wood', 'glass', 'stucco'];
const ROOF_TEXTURES = ['shingle', 'concrete', 'wood'];
const WALL_COLORS = [
  '#d4a373', // warm tan
  '#b8956a', // beige
  '#8b7355', // brown
  '#a0522d', // sienna
  '#cd853f', // peru
  '#deb887', // burlywood
  '#c2b280', // sandstone
  '#808080', // gray
  '#b0c4de', // light steel blue
  '#f5deb3', // wheat
  '#e8d5b7', // light sand
  '#c9c0bb', // silver pink
  '#a9a9a9', // dark gray
  '#cc6633', // burnt orange
  '#7a8a9a', // blue gray
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRandomBuildingSpec(): Partial<BuildingSpecification> {
  const numberOfFloors = randInt(1, 8);
  const floorHeight = randFloat(2.8, 4.5);
  const width = randFloat(8, 30);
  const depth = randFloat(8, 25);
  const roofType = pick(ROOF_TYPES);
  const windowShape = pick(WINDOW_SHAPES);
  const wallTexture = pick(WALL_TEXTURES);

  // More windows for wider buildings
  const windowRows = Math.max(2, Math.min(8, Math.floor(width / 3.5)));

  // Scale window size slightly with floor height
  const windowWidth = randFloat(0.8, 1.6);
  const windowHeight = randFloat(1.2, Math.min(2.2, floorHeight * 0.55));

  // Occasionally apply a wall color override (50% chance)
  const wallColor = Math.random() > 0.5 ? pick(WALL_COLORS) : undefined;

  // Roof height proportional to building width for non-flat roofs
  const roofHeight = roofType === 'flat' ? 0.3 : randFloat(1.5, Math.min(5, width * 0.25));

  return {
    width,
    depth,
    floorHeight,
    numberOfFloors,
    roofType,
    roofHeight,
    wallTexture,
    roofTexture: pick(ROOF_TEXTURES),
    windowPattern: 'grid' as WindowPattern,
    windowShape,
    windowRows,
    windowWidth,
    windowHeight,
    wallColor,
    doorWidth: randFloat(1.2, 2.0),
    doorHeight: randFloat(2.2, 3.0),
    doorPosition: randFloat(0.3, 0.7),
    treeConfig: {
      ...DEFAULT_TREE_CONFIG,
      enabled: Math.random() > 0.4, // 60% chance of trees
      density: randInt(2, 7),
      seed: Math.floor(Math.random() * 100000),
    },
  };
}

/**
 * Generates a random rotation angle in radians for building orientation.
 * Uses common angles (0, 45, 90, etc.) with some jitter for realism.
 */
export function generateRandomRotation(): number {
  const baseAngles = [0, Math.PI / 6, Math.PI / 4, Math.PI / 3, Math.PI / 2, Math.PI];
  const base = pick(baseAngles);
  // Add slight jitter (±10 degrees) for natural feel
  const jitter = randFloat(-Math.PI / 18, Math.PI / 18);
  return base + jitter;
}

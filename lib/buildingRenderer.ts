/**
 * Building Renderer for 3D City Visualization
 * Renders buildings as extruded 3D meshes in Three.js
 */

import * as THREE from "three";
import { Building } from "./buildingData";
import { CityProjection } from "./projection";

// ==================== BUILDING HEIGHT CONFIGURATION ====================
// Adjust this multiplier to make buildings taller or shorter
// Examples:
//   1.0 = Real-world proportions (with scale factor applied)
//   2.0 = Buildings appear twice as tall (more dramatic)
//   0.5 = Buildings appear half as tall (more subtle)
export const HEIGHT_MULTIPLIER = 8.0;
// ======================================================================

/**
 * Render buildings as 3D meshes and add them to the scene
 *
 * @param buildings - Array of buildings to render
 * @param projection - CityProjection instance for coordinate conversion
 * @param scene - Three.js scene to add meshes to
 * @returns Map of building IDs to their meshes
 */
export function renderBuildings(
  buildings: Building[],
  projection: typeof CityProjection,
  scene: THREE.Object3D,
): Map<string, THREE.Mesh> {
  console.log(`Rendering ${buildings.length} buildings...`);

  let rendered = 0;
  const meshMap = new Map<string, THREE.Mesh>();

  buildings.forEach((building) => {
    try {
      // Create the building mesh
      const mesh = createBuildingMesh(building, projection);

      if (mesh) {
        // Add to scene
        scene.add(mesh);
        meshMap.set(building.id, mesh);
        rendered++;
      }
    } catch (error) {
      console.warn(`Failed to render building ${building.id}:`, error);
    }
  });

  console.log(`✅ Rendered ${rendered} buildings`);
  return meshMap;
}

/**
 * Seeded random number generator for deterministic per-building variation.
 * Same building ID always produces the same "random" values.
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

// Palette of building facade colors for visual variety
const FACADE_COLORS = [
  0xf5f0e8, // warm white
  0xe8ddd0, // cream
  0xd4c5b0, // sandstone
  0xc9b99a, // tan
  0xb8a88a, // khaki
  0xd6cfc4, // light stone
  0xc2bab0, // warm gray
  0xa89e94, // medium taupe
  0x9a8e82, // brown gray
  0xbfb8ae, // silver sand
  0xccc0b0, // pale beige
  0xe0d5c5, // off white
  0xb0a898, // driftwood
  0x8b8178, // dark taupe
  0xc4b8a8, // wheat
  0xd8cec0, // bone
];

/**
 * Create a 3D mesh for a single building with per-building variation
 */
function createBuildingMesh(
  building: Building,
  projection: typeof CityProjection,
): THREE.Mesh | null {
  // Need at least 3 points for a valid polygon
  if (building.footprint.length < 3) {
    return null;
  }

  // Deterministic random based on building ID
  const rand = seededRandom(hashString(building.id));

  // Create shape from footprint polygon
  const shape = new THREE.Shape();
  const projectedPoints: THREE.Vector3[] = [];

  building.footprint.forEach((coord, index) => {
    const worldPos = projection.projectToWorld(coord);
    projectedPoints.push(worldPos);

    if (index === 0) {
      shape.moveTo(worldPos.x, worldPos.z);
    } else {
      shape.lineTo(worldPos.x, worldPos.z);
    }
  });

  if (projectedPoints.length > 0) {
    const firstPoint = projectedPoints[0];
    shape.lineTo(firstPoint.x, firstPoint.z);
  }

  // Randomize height: vary between 0.5x and 1.8x the base height
  const heightVariation = 0.5 + rand() * 1.3;
  const SCALE_FACTOR = 10 / 1.4;
  const effectiveHeight = building.height * heightVariation;

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: effectiveHeight * SCALE_FACTOR * HEIGHT_MULTIPLIER,
    bevelEnabled: false,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.rotateX(Math.PI / 2);

  // Pick color: use type-based color if available, otherwise pick from palette
  const typeColor = getBuildingColor(building.type);
  const useTypeColor = building.type && building.type !== "yes";
  const paletteColor = FACADE_COLORS[Math.floor(rand() * FACADE_COLORS.length)];
  const baseColor = useTypeColor ? typeColor : paletteColor;

  const material = new THREE.MeshLambertMaterial({
    color: baseColor,
    flatShading: false,
  });

  const mesh = new THREE.Mesh(geometry, material);

  const scaledHeight = effectiveHeight * SCALE_FACTOR * HEIGHT_MULTIPLIER;
  mesh.position.y = scaledHeight / 2;

  // Add slight random rotation (0-5 degrees) for organic feel
  const rotationJitter = (rand() - 0.5) * 0.087; // ±2.5 degrees in radians
  mesh.rotation.y = rotationJitter;

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  mesh.name = building.id;
  mesh.userData = {
    buildingId: building.id,
    isOsmBuilding: true,
    type: building.type,
    height: building.height,
  };

  return mesh;
}

/**
 * Get building color based on type
 */
function getBuildingColor(type?: string): number {
  if (!type || type === "yes") {
    return 0x888888; // Default gray
  }

  // Vary colors by building type
  switch (type) {
    case "residential":
    case "house":
    case "apartments":
      return 0xb8956a; // Tan/beige

    case "commercial":
    case "retail":
    case "shop":
      return 0x7a9bc4; // Light blue

    case "industrial":
    case "warehouse":
      return 0x8b7a6a; // Brown

    case "school":
    case "university":
    case "college":
      return 0xa47d5c; // Academic brown

    case "hospital":
    case "clinic":
      return 0xc47d7d; // Reddish

    case "church":
    case "cathedral":
    case "chapel":
      return 0x9a8a7a; // Stone gray

    case "civic":
    case "public":
    case "government":
      return 0x7a8a9a; // Blue gray

    default:
      return 0x888888; // Default gray
  }
}

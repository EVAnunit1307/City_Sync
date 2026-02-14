/**
 * Shared placement pipeline: ground hit via mathematical plane, then eligibility (bounds).
 * - Ground hit: ray.intersectPlane(plane) — no mesh/scene raycast.
 * - placementPoint.y is always GROUND_Y + GROUND_OFFSET_Y.
 * - Eligibility: temporary bounds check (min/max X/Z).
 */

import * as THREE from "three";
import {
  validatePlacement as validatePlacementImpl,
  getRoadBoxesFromScene,
  type ValidatePlacementOptions,
  type ValidatePlacementResult,
} from "@/lib/editor/utils/placementValidation";
import type { BuildingType } from "@/lib/editor/types/buildingSpec";

/** Fixed ground level for placement (y coordinate). */
export const GROUND_Y = 0;
export const GROUND_OFFSET_Y = 0.02;

/** Temporary buildable bounds (relaxed eligibility). */
export const BUILDABLE_BOUNDS = {
  minX: -200,
  maxX: 200,
  minZ: -200,
  maxZ: 200,
} as const;

export interface GetPlacementPointResultOk {
  ok: true;
  point: THREE.Vector3;
  hitObjectName?: string;
}

export interface GetPlacementPointResultFail {
  ok: false;
  reason: string;
  point?: undefined;
  hitObjectName?: undefined;
}

export type GetPlacementPointResult =
  | GetPlacementPointResultOk
  | GetPlacementPointResultFail;

/** Horizontal plane at y=0 (normal up). */
const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _groundHit = new THREE.Vector3();

/**
 * Guaranteed ground hit using a mathematical plane (no mesh raycast).
 * Ray from camera through mouse is intersected with the y=0 plane.
 * If the ray is parallel to the plane (e.g. looking at horizon), use a fallback point
 * so we always return a ground position.
 * Returned point.y is always GROUND_Y + GROUND_OFFSET_Y.
 */
export function getGroundHitFromPlane(
  raycaster: THREE.Raycaster,
  mouse: THREE.Vector2,
  camera: THREE.Camera
): GetPlacementPointResult {
  raycaster.setFromCamera(mouse, camera);
  const hit = raycaster.ray.intersectPlane(GROUND_PLANE, _groundHit);
  let point: THREE.Vector3;
  if (hit === null) {
    // Ray parallel to ground (e.g. looking at horizon): use point in front of camera at ground level
    const dir = raycaster.ray.direction.clone().normalize();
    const dist = 200;
    point = raycaster.ray.origin.clone().add(dir.multiplyScalar(dist));
    point.y = GROUND_Y + GROUND_OFFSET_Y;
  } else {
    point = hit.clone();
    point.y = GROUND_Y + GROUND_OFFSET_Y;
  }
  return { ok: true, point, hitObjectName: "ground" };
}

/** Temporary eligibility: point inside buildable bounds. */
export function isEligible(point: { x: number; z: number }): boolean {
  return (
    point.x >= BUILDABLE_BOUNDS.minX &&
    point.x <= BUILDABLE_BOUNDS.maxX &&
    point.z >= BUILDABLE_BOUNDS.minZ &&
    point.z <= BUILDABLE_BOUNDS.maxZ
  );
}

/** Re-export for shared use */
export { validatePlacementImpl as validatePlacement, getRoadBoxesFromScene };
export type { ValidatePlacementOptions, ValidatePlacementResult };

/** Default footprint for map single building */
export const DEFAULT_MAP_FOOTPRINT = { width: 12, depth: 12 };

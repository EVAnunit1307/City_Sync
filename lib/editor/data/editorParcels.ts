import type { Parcel, Road } from '@/lib/editor/utils/placementValidation';

/** Default parcel covering the editor grid (full playable area). */
const EDITOR_GRID_HALF = 500;

export const DEFAULT_EDITOR_PARCELS: Parcel[] = [
  {
    id: 'parcel-default',
    polygon: [
      [-EDITOR_GRID_HALF, -EDITOR_GRID_HALF],
      [EDITOR_GRID_HALF, -EDITOR_GRID_HALF],
      [EDITOR_GRID_HALF, EDITOR_GRID_HALF],
      [-EDITOR_GRID_HALF, EDITOR_GRID_HALF],
      [-EDITOR_GRID_HALF, -EDITOR_GRID_HALF],
    ],
  },
];

/** Road width in meters (same as rendered). Exclusion = width/2 + roadBuffer (e.g. 4 + 2 = 6m from centerline). */
export const EDITOR_ROAD_WIDTH = 8;

/** Road segments in editor world coords. Same data is used for validation AND rendering (single source of truth). */
export const DEFAULT_EDITOR_ROADS: Road[] = [
  {
    id: 'road-h1',
    width: EDITOR_ROAD_WIDTH,
    segments: [{ from: [-200, -80], to: [200, -80], width: EDITOR_ROAD_WIDTH }],
  },
  {
    id: 'road-h2',
    width: EDITOR_ROAD_WIDTH,
    segments: [{ from: [-200, 0], to: [200, 0], width: EDITOR_ROAD_WIDTH }],
  },
  {
    id: 'road-h3',
    width: EDITOR_ROAD_WIDTH,
    segments: [{ from: [-200, 80], to: [200, 80], width: EDITOR_ROAD_WIDTH }],
  },
  {
    id: 'road-v1',
    width: EDITOR_ROAD_WIDTH,
    segments: [{ from: [-80, -200], to: [-80, 200], width: EDITOR_ROAD_WIDTH }],
  },
  {
    id: 'road-v2',
    width: EDITOR_ROAD_WIDTH,
    segments: [{ from: [0, -200], to: [0, 200], width: EDITOR_ROAD_WIDTH }],
  },
  {
    id: 'road-v3',
    width: EDITOR_ROAD_WIDTH,
    segments: [{ from: [80, -200], to: [80, 200], width: EDITOR_ROAD_WIDTH }],
  },
];

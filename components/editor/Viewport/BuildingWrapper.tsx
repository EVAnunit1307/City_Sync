import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { Building } from './Building';
import { SelectionIndicator } from './SelectionIndicator';
import { BuildingTrees } from './Trees';
import type { BuildingInstance } from '@/lib/editor/types/buildingSpec';
import { DEFAULT_TREE_CONFIG } from '@/lib/editor/types/buildingSpec';
import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';
import { useBuildingSound } from '@/lib/editor/hooks/useBuildingSound';
import { validatePlacement, getRoadBoxesFromScene } from '@/lib/editor/utils/placementValidation';
import { DEFAULT_EDITOR_PARCELS } from '@/lib/editor/data/editorParcels';
import { FOOTPRINT_RADIUS } from '@/lib/editor/utils/buildingCluster';

const ROAD_BUFFER = 2;

interface BuildingWrapperProps {
  building: BuildingInstance;
  isSelected: boolean;
  onSelect: () => void;
}

export function BuildingWrapper({ building, isSelected, onSelect }: BuildingWrapperProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { buildings, placementMode, addBuilding, setPlacementMessage, mergeMode, toggleBuildingSelection, selectedBuildingIds } = useBuildings();
  const { play: playSound } = useBuildingSound();

  const { scene } = useThree();
  const validationOptions = useMemo(() => {
    const existing = buildings
      .filter((b) => b.id !== building.id)
      .map((b) => ({
        x: b.position.x,
        z: b.position.z,
        radius: b.buildingType ? FOOTPRINT_RADIUS[b.buildingType] : Math.max(b.spec.width, b.spec.depth) / 2,
      }));
    return {
      parcels: DEFAULT_EDITOR_PARCELS,
      roads: [],
      existing,
      roadBoxes: getRoadBoxesFromScene(scene, ROAD_BUFFER),
    };
  }, [buildings, building.id, building.buildingType, building.spec.width, building.spec.depth, scene]);

  const isMergeSelected = mergeMode && selectedBuildingIds.includes(building.id);

  const handleClick = (e: any) => {
    e.stopPropagation();

    if (placementMode) {
      const buildingHeight = building.spec.floorHeight * building.spec.numberOfFloors;
      const newY = building.position.y + buildingHeight;
      const position = { x: building.position.x, y: newY, z: building.position.z };
      const footprint = { width: building.spec.width, depth: building.spec.depth };
      const result = validatePlacement(position, footprint, building.buildingType ?? 'detached', validationOptions);
      if (!result.ok) {
        setPlacementMessage(result.reason ?? 'Invalid placement');
        return;
      }
      addBuilding({ x: position.x, y: position.y, z: position.z });
      playSound('add_floor');
    } else if (mergeMode) {
      // In merge mode, toggle selection
      toggleBuildingSelection(building.id);
    } else {
      onSelect();
    }
  };

  const treeConfig = building.spec.treeConfig || DEFAULT_TREE_CONFIG;

  return (
    <>
      <group
        ref={groupRef}
        name={`building-${building.id}`}
        userData={{ isBuilding: true, buildingId: building.id }}
        position={[building.position.x, building.position.y, building.position.z]}
        rotation={[0, building.rotation, 0]}
        onClick={handleClick}
      >
        <Building spec={building.spec} />
        {(isSelected || isMergeSelected) && <SelectionIndicator spec={building.spec} isMergeMode={isMergeSelected} />}
      </group>
      {/* Trees rendered outside rotation group so they stay upright */}
      {treeConfig.enabled && (
        <BuildingTrees
          buildingPosition={building.position}
          buildingWidth={building.spec.width}
          buildingDepth={building.spec.depth}
          config={treeConfig}
        />
      )}
    </>
  );
}

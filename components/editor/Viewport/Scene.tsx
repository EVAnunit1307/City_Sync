import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { BuildingWrapper } from './BuildingWrapper';
import { GoldEffects, GoldBurst } from './GoldParticles';
import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';
import { DEFAULT_BUILDING_SPEC } from '@/lib/editor/types/buildingSpec';
import type { BuildingType } from '@/lib/editor/types/buildingSpec';
import { useBuildingSound } from '@/lib/editor/hooks/useBuildingSound';
import { generateBuildingCluster, getFootprintForType, FOOTPRINT_RADIUS } from '@/lib/editor/utils/buildingCluster';
import { validatePlacement } from '@/lib/editor/utils/placementValidation';
import { DEFAULT_EDITOR_PARCELS, DEFAULT_EDITOR_ROADS, EDITOR_ROAD_WIDTH } from '@/lib/editor/data/editorParcels';

const SNAP_THRESHOLD = 5; // Units within which snapping activates

interface SceneContentProps {
  sceneRef?: React.MutableRefObject<THREE.Scene | null>;
}

function SceneContent({ sceneRef }: SceneContentProps) {
  const {
    buildings,
    selectedBuildingId,
    selectBuilding,
    addBuilding,
    addBuildings,
    placementMode,
    batchPlacementConfig,
    setBatchPlacementConfig,
    setPlacementMessage,
    clearSelection,
  } = useBuildings();
  const { scene } = useThree();
  const { play: playSound } = useBuildingSound();
  const gridPlaneRef = useRef<THREE.Mesh>(null);
  const [ghostPosition, setGhostPosition] = useState<{ x: number; y: number; z: number } | null>(null);
  const [isSnapped, setIsSnapped] = useState(false);
  const [placementValid, setPlacementValid] = useState<boolean | null>(null);
  const [burstEffects, setBurstEffects] = useState<Array<{ id: number; position: [number, number, number] }>>([]);

  const existingForValidation = React.useMemo(
    () =>
      buildings.map((b) => ({
        x: b.position.x,
        z: b.position.z,
        radius: b.buildingType ? FOOTPRINT_RADIUS[b.buildingType] : Math.max(b.spec.width, b.spec.depth) / 2,
      })),
    [buildings]
  );

  const validationOptions = React.useMemo(
    () => ({
      parcels: DEFAULT_EDITOR_PARCELS,
      roads: DEFAULT_EDITOR_ROADS,
      existing: existingForValidation,
      roadBuffer: 2,
    }),
    [existingForValidation]
  );

  // Sync scene ref
  useEffect(() => {
    if (sceneRef) {
      sceneRef.current = scene;
    }
  }, [scene, sceneRef]);

  // Handle space key to deselect all buildings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearSelection]);

  // Calculate snapped position based on existing buildings (including vertical stacking)
  const getSnappedPosition = useCallback((rawX: number, rawZ: number): { x: number; y: number; z: number; snapped: boolean } => {
    if (buildings.length === 0) {
      return { x: Math.round(rawX), y: 0, z: Math.round(rawZ), snapped: false };
    }

    const newWidth = DEFAULT_BUILDING_SPEC.width;
    const newDepth = DEFAULT_BUILDING_SPEC.depth;

    let bestSnapX = rawX;
    let bestSnapZ = rawZ;
    let bestSnapY = 0;
    let minDistX = SNAP_THRESHOLD;
    let minDistZ = SNAP_THRESHOLD;
    let snappedX = false;
    let snappedZ = false;
    let snappedY = false;

    for (const building of buildings) {
      const bx = building.position.x;
      const by = building.position.y;
      const bz = building.position.z;
      const bWidth = building.spec.width;
      const bDepth = building.spec.depth;
      const bHeight = building.spec.floorHeight * building.spec.numberOfFloors;

      // Snap points for X axis (left and right of existing building)
      const snapLeftX = bx - bWidth / 2 - newWidth / 2;
      const snapRightX = bx + bWidth / 2 + newWidth / 2;

      // Snap points for Z axis (front and back of existing building)
      const snapFrontZ = bz - bDepth / 2 - newDepth / 2;
      const snapBackZ = bz + bDepth / 2 + newDepth / 2;

      // Check X snapping
      if (Math.abs(rawX - snapLeftX) < minDistX) {
        minDistX = Math.abs(rawX - snapLeftX);
        bestSnapX = snapLeftX;
        snappedX = true;
      }
      if (Math.abs(rawX - snapRightX) < minDistX) {
        minDistX = Math.abs(rawX - snapRightX);
        bestSnapX = snapRightX;
        snappedX = true;
      }

      // Check Z snapping
      if (Math.abs(rawZ - snapFrontZ) < minDistZ) {
        minDistZ = Math.abs(rawZ - snapFrontZ);
        bestSnapZ = snapFrontZ;
        snappedZ = true;
      }
      if (Math.abs(rawZ - snapBackZ) < minDistZ) {
        minDistZ = Math.abs(rawZ - snapBackZ);
        bestSnapZ = snapBackZ;
        snappedZ = true;
      }

      // Also snap to align with existing building centers (for stacking on top)
      if (Math.abs(rawX - bx) < minDistX) {
        minDistX = Math.abs(rawX - bx);
        bestSnapX = bx;
        snappedX = true;
      }
      if (Math.abs(rawZ - bz) < minDistZ) {
        minDistZ = Math.abs(rawZ - bz);
        bestSnapZ = bz;
        snappedZ = true;
      }

      // Check if we're close enough to stack on top of this building
      const distToCenter = Math.sqrt(Math.pow(rawX - bx, 2) + Math.pow(rawZ - bz, 2));
      if (distToCenter < Math.max(bWidth, bDepth) / 2) {
        // We're over this building, stack on top
        const stackY = by + bHeight;
        if (stackY > bestSnapY) {
          bestSnapY = stackY;
          bestSnapX = bx;
          bestSnapZ = bz;
          snappedX = true;
          snappedZ = true;
          snappedY = true;
        }
      }
    }

    const finalX = snappedX ? bestSnapX : Math.round(rawX);
    const finalZ = snappedZ ? bestSnapZ : Math.round(rawZ);
    const finalY = snappedY ? bestSnapY : 0;

    return { x: finalX, y: finalY, z: finalZ, snapped: snappedX || snappedZ || snappedY };
  }, [buildings]);

  const handlePointerMove = (e: any) => {
    if (!placementMode && !batchPlacementConfig) {
      setGhostPosition(null);
      setIsSnapped(false);
      setPlacementValid(null);
      return;
    }

    const point = e.point;
    const { x, y, z, snapped } = getSnappedPosition(point.x, point.z);
    setGhostPosition({ x, y, z });
    setIsSnapped(snapped);

    const footprint = batchPlacementConfig
      ? getFootprintForType('detached')
      : { width: DEFAULT_BUILDING_SPEC.width, depth: DEFAULT_BUILDING_SPEC.depth };
    const type: BuildingType = batchPlacementConfig ? 'detached' : 'detached';
    const result = validatePlacement(
      { x, y, z },
      footprint,
      type,
      validationOptions
    );
    setPlacementValid(result.ok);
  };

  const handleGridClick = (e: any) => {
    const point = e.point;

    if (batchPlacementConfig) {
      const origin = { x: point.x, y: point.y, z: point.z };
      const cluster = generateBuildingCluster(origin, batchPlacementConfig);
      const validOptions = validationOptions;
      const validBuildings = cluster.filter((b) => {
        const footprint = getFootprintForType(b.buildingType ?? 'detached');
        const result = validatePlacement(
          b.position,
          footprint,
          b.buildingType ?? 'detached',
          validOptions
        );
        return result.ok;
      });
      const skipped = cluster.length - validBuildings.length;
      if (validBuildings.length > 0) {
        addBuildings(validBuildings);
        playSound('brick_place');
      }
      if (skipped > 0) {
        setPlacementMessage(`Placed ${validBuildings.length}/${cluster.length} (${skipped} blocked: roads/parcels/overlap)`);
      }
      setBatchPlacementConfig(null);
      setGhostPosition(null);
      setIsSnapped(false);
      setPlacementValid(null);
      return;
    }

    if (!placementMode) return;

    const { x, y, z } = getSnappedPosition(point.x, point.z);
    const result = validatePlacement(
      { x, y, z },
      { width: DEFAULT_BUILDING_SPEC.width, depth: DEFAULT_BUILDING_SPEC.depth },
      'detached',
      validationOptions
    );
    if (!result.ok) {
      setPlacementMessage(result.reason ?? 'Invalid placement');
      return;
    }

    const buildingHeight = DEFAULT_BUILDING_SPEC.floorHeight * DEFAULT_BUILDING_SPEC.numberOfFloors;
    setBurstEffects(prev => [...prev, {
      id: Date.now(),
      position: [x, y + buildingHeight / 2, z] as [number, number, number]
    }]);

    addBuilding({ x, y, z });
    playSound('brick_place');
    setGhostPosition(null);
    setIsSnapped(false);
    setPlacementValid(null);
  };

  const removeBurstEffect = useCallback((id: number) => {
    setBurstEffects(prev => prev.filter(effect => effect.id !== id));
  }, []);

  return (
    <>
      {/* Even lighting from all directions for consistent illumination */}
      <ambientLight intensity={0.8} />
      <hemisphereLight args={[0xffffff, 0xffffff, 0.5]} />

      {/* Subtle fill lights from multiple angles for even coverage */}
      <pointLight position={[50, 50, 50]} intensity={0.3} />
      <pointLight position={[-50, 50, 50]} intensity={0.3} />
      <pointLight position={[50, 50, -50]} intensity={0.3} />
      <pointLight position={[-50, 50, -50]} intensity={0.3} />

      {/* Invisible grid plane for click detection and pointer tracking - excluded from export */}
      <mesh
        ref={gridPlaneRef}
        name="click-detection-plane"
        userData={{ excludeFromExport: true }}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        onClick={handleGridClick}
        onPointerMove={handlePointerMove}
        visible={false}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Grid - marked to exclude from export */}
      <group name="grid-helper" userData={{ excludeFromExport: true }}>
        <Grid
          position={[0, -0.01, 0]}
          args={[100, 100]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#a0a0a0"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#707070"
          fadeDistance={100}
          fadeStrength={1}
          infiniteGrid
        />
      </group>

      {/* Roads - same geometry as placement validation (single source of truth) */}
      <group name="editor-roads" userData={{ excludeFromExport: true }}>
        {DEFAULT_EDITOR_ROADS.flatMap((road) =>
          road.segments.map((seg, idx) => {
            const [x0, z0] = seg.from;
            const [x1, z1] = seg.to;
            const length = Math.hypot(x1 - x0, z1 - z0) || 1;
            const midX = (x0 + x1) / 2;
            const midZ = (z0 + z1) / 2;
            const rotY = Math.atan2(z1 - z0, x1 - x0);
            const w = seg.width ?? road.width ?? EDITOR_ROAD_WIDTH;
            return (
              <mesh
                key={`${road.id}-${idx}`}
                position={[midX, 0.02, midZ]}
                rotation={[0, rotY, 0]}
                receiveShadow
              >
                <boxGeometry args={[length, 0.05, w]} />
                <meshStandardMaterial color="#374151" roughness={0.9} metalness={0} />
              </mesh>
            );
          })
        )}
      </group>

      {/* Ghost building preview when in placement or batch placement mode */}
      {(placementMode || batchPlacementConfig) && ghostPosition && (
        <group position={[ghostPosition.x, ghostPosition.y + 5, ghostPosition.z]}>
          <mesh>
            <boxGeometry args={[12, 10, 12]} />
            <meshStandardMaterial
              color={placementValid === false ? '#ef4444' : placementValid === true ? '#22c55e' : isSnapped ? '#22c55e' : '#f59e0b'}
              transparent
              opacity={0.35}
            />
          </mesh>
          <GoldEffects
            position={[0, 0, 0]}
            width={12}
            height={10}
            depth={12}
            intensity="high"
          />
        </group>
      )}

      {/* Burst effects when buildings are placed */}
      {burstEffects.map(effect => (
        <GoldBurst
          key={effect.id}
          position={effect.position}
          onComplete={() => removeBurstEffect(effect.id)}
        />
      ))}

      {/* Buildings */}
      {buildings.map((building) => (
        <BuildingWrapper
          key={building.id}
          building={building}
          isSelected={building.id === selectedBuildingId}
          onSelect={() => selectBuilding(building.id)}
        />
      ))}

      {/* Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={200}
      />
    </>
  );
}

interface SceneProps {
  sceneRef?: React.MutableRefObject<THREE.Scene | null>;
}

export function Scene({ sceneRef }: SceneProps) {
  return (
    <div className="w-full h-full bg-sky-100">
      <Canvas
        camera={{ position: [30, 30, 30], fov: 50 }}
        gl={{
          preserveDrawingBuffer: true,
          alpha: false,
          toneMapping: THREE.NoToneMapping,  // Prevent darkening of textures
        }}
        scene={{ background: new THREE.Color('#ffffff') }}
        style={{ background: '#ffffff' }}
      >
        <SceneContent sceneRef={sceneRef} />
      </Canvas>
    </div>
  );
}

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

const PLACEMENT_DEBUG = false; // set true to show sphere at last placement hit
import { BuildingWrapper } from './BuildingWrapper';
import { GoldEffects, GoldBurst } from './GoldParticles';
import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';
import { DEFAULT_BUILDING_SPEC } from '@/lib/editor/types/buildingSpec';
import type { BuildingType } from '@/lib/editor/types/buildingSpec';
import { useBuildingSound } from '@/lib/editor/hooks/useBuildingSound';
import { generateBuildingCluster, getFootprintForType, FOOTPRINT_RADIUS } from '@/lib/editor/utils/buildingCluster';
import { validatePlacement, getRoadBoxesFromScene } from '@/lib/editor/utils/placementValidation';
import { getGroundHitFromPlane, isEligible } from '@/lib/placement/placementPipeline';
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
  const { scene, camera, gl } = useThree();
  const { play: playSound } = useBuildingSound();
  const gridPlaneRef = useRef<THREE.Mesh>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const [debugMarker, setDebugMarker] = useState<THREE.Vector3 | null>(null);
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
      roads: [] as typeof DEFAULT_EDITOR_ROADS,
      existing: existingForValidation,
    }),
    [existingForValidation]
  );

  /** Relaxed: no parcel check; only bounds (isEligible), roads, overlap. */
  const relaxedValidationOptions = React.useMemo(
    () => ({
      parcels: [] as typeof DEFAULT_EDITOR_PARCELS,
      roads: [] as typeof DEFAULT_EDITOR_ROADS,
      existing: existingForValidation,
    }),
    [existingForValidation]
  );

  const ROAD_BUFFER = 2;

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

  const performPlacementAtPoint = useCallback(
    (worldPoint: THREE.Vector3) => {
      const point = { x: worldPoint.x, y: worldPoint.y, z: worldPoint.z };

      if (batchPlacementConfig) {
        const origin = { x: point.x, y: point.y, z: point.z };
        const cluster = generateBuildingCluster(origin, batchPlacementConfig);
        const roadBoxes = getRoadBoxesFromScene(scene, ROAD_BUFFER);
        const validBuildings = cluster.filter((b) => {
          const footprint = getFootprintForType(b.buildingType ?? 'detached');
          const result = validatePlacement(
            b.position,
            footprint,
            b.buildingType ?? 'detached',
            { ...relaxedValidationOptions, roadBoxes }
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

      const { x, y, z } = getSnappedPosition(point.x, point.z);
      const snappedY = y !== 0 ? y : point.y;
      const result = validatePlacement(
        { x, y: snappedY, z },
        { width: DEFAULT_BUILDING_SPEC.width, depth: DEFAULT_BUILDING_SPEC.depth },
        'detached',
        { ...relaxedValidationOptions, roadBoxes: getRoadBoxesFromScene(scene, ROAD_BUFFER) }
      );
      if (!result.ok) {
        setPlacementMessage(result.reason ?? 'Invalid placement');
        return;
      }

      const buildingHeight = DEFAULT_BUILDING_SPEC.floorHeight * DEFAULT_BUILDING_SPEC.numberOfFloors;
      setBurstEffects(prev => [...prev, {
        id: Date.now(),
        position: [x, snappedY + buildingHeight / 2, z] as [number, number, number]
      }]);
      addBuilding({ x, y: snappedY, z });
      playSound('brick_place');
      setGhostPosition(null);
      setIsSnapped(false);
      setPlacementValid(null);
    },
    [
      batchPlacementConfig,
      scene,
      relaxedValidationOptions,
      addBuilding,
      addBuildings,
      setBatchPlacementConfig,
      setPlacementMessage,
      getSnappedPosition,
      playSound,
    ]
  );

  useEffect(() => {
    const canvas = gl.domElement;
    const raycaster = raycasterRef.current;
    const mouse = mouseRef.current;

    function getPlacementHit(clientX: number, clientY: number) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      const result = getGroundHitFromPlane(raycaster, mouse, camera);
      if (!result.ok) return null;
      return { point: result.point };
    }

    function onPointerMove(e: PointerEvent) {
      if (!placementMode && !batchPlacementConfig) {
        setGhostPosition(null);
        setIsSnapped(false);
        setPlacementValid(null);
        return;
      }
      const hit = getPlacementHit(e.clientX, e.clientY);
      if (!hit) {
        setGhostPosition(null);
        setPlacementValid(null);
        return;
      }
      const pt = hit.point;
      if (!isEligible({ x: pt.x, z: pt.z })) {
        setGhostPosition({ x: pt.x, y: pt.y, z: pt.z });
        setIsSnapped(false);
        setPlacementValid(false);
        return;
      }
      const { x, y, z, snapped } = getSnappedPosition(pt.x, pt.z);
      setGhostPosition({ x, y: y !== 0 ? y : pt.y, z });
      setIsSnapped(snapped);
      const footprint = batchPlacementConfig
        ? getFootprintForType('detached')
        : { width: DEFAULT_BUILDING_SPEC.width, depth: DEFAULT_BUILDING_SPEC.depth };
      const result = validatePlacement(
        { x, y: y !== 0 ? y : pt.y, z },
        footprint,
        'detached',
        { ...relaxedValidationOptions, roadBoxes: getRoadBoxesFromScene(scene, ROAD_BUFFER) }
      );
      setPlacementValid(result.ok);
    }

    function onClick(e: MouseEvent) {
      if (!placementMode && !batchPlacementConfig) return;
      const hit = getPlacementHit(e.clientX, e.clientY);
      if (!hit) {
        setPlacementMessage('Click on ground');
        return;
      }
      const pt = hit.point;
      if (PLACEMENT_DEBUG) setDebugMarker(pt.clone());
      if (!isEligible({ x: pt.x, z: pt.z })) {
        setPlacementMessage('Outside buildable area');
        return;
      }
      performPlacementAtPoint(pt);
    }

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('click', onClick);
    return () => {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('click', onClick);
    };
  }, [
    gl.domElement,
    camera,
    placementMode,
    batchPlacementConfig,
    scene,
    relaxedValidationOptions,
    performPlacementAtPoint,
    setPlacementMessage,
    getSnappedPosition,
  ]);

  const removeBurstEffect = useCallback((id: number) => {
    setBurstEffects(prev => prev.filter(effect => effect.id !== id));
  }, []);

  return (
    <>
      <ambientLight intensity={0.65} />
      <hemisphereLight args={[0xffffff, 0xe8ecf0, 0.5]} />

      {/* Soft shadows: one main directional light */}
      <directionalLight
        position={[40, 60, 40]}
        intensity={0.7}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-camera-near={0.5}
        shadow-camera-far={200}
        shadow-bias={-0.0001}
      />

      {/* Fill lights for even coverage */}
      <pointLight position={[50, 50, 50]} intensity={0.2} />
      <pointLight position={[-50, 50, 50]} intensity={0.2} />
      <pointLight position={[50, 50, -50]} intensity={0.2} />
      <pointLight position={[-50, 50, -50]} intensity={0.2} />

      {/* Grid plane (placement uses mathematical plane intersection, not this mesh) */}
      <mesh
        ref={gridPlaneRef}
        name="grid-plane"
        userData={{ excludeFromExport: true }}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
      >
        <planeGeometry args={[2000, 2000]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
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

      {/* Roads - rendered from data; placement validation uses these meshes (getRoadBoxesFromScene) */}
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
                name={`road-${road.id}-${idx}`}
                userData={{ isRoad: true, excludeFromExport: true }}
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

      {/* Debug: sphere at last placement hit (toggle PLACEMENT_DEBUG) */}
      {PLACEMENT_DEBUG && debugMarker && (
        <mesh position={[debugMarker.x, debugMarker.y, debugMarker.z]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color="#ff00ff" transparent opacity={0.8} />
        </mesh>
      )}

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
    <div className="w-full h-full bg-slate-100">
      <Canvas
        camera={{ position: [45, 38, 45], fov: 48 }}
        gl={{
          preserveDrawingBuffer: true,
          alpha: false,
          toneMapping: THREE.NoToneMapping,
          antialias: true,
        }}
        shadows
        scene={{ background: new THREE.Color('#f1f5f9') }}
        style={{ background: '#f1f5f9' }}
      >
        <SceneContent sceneRef={sceneRef} />
      </Canvas>
    </div>
  );
}

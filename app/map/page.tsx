"use client";

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import ThreeMap from "@/components/ThreeMap";
import {
  Landmark,
  SlidersHorizontal,
  MapPin,
  Copy,
  X,
  Upload,
  ClipboardList,
  Map,
  DollarSign,
} from "lucide-react";
import { MinimalToggle } from "@/components/ui/minimal-toggle";
import { prefetchMapData } from "@/lib/prefetchMapData";
import {
  computeHappinessScore,
  isUnderConstruction,
  getConstructionProgress,
} from "@/lib/constructionNoise";
import EnvironmentalReportModal from "@/components/EnvironmentalReportModal";
import {
  BuildingPlacementForm,
  type BuildingPlacementDetails,
} from "@/components/BuildingPlacementForm";
import VoiceCopilot from "@/components/VoiceCopilot";
import { estimateFinanceExecution } from "@/lib/financeExecution";

interface PlacedBuilding {
  id: string;
  modelPath: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  lat: number;
  lng: number;
  timeline?: {
    zoneType?: string;
    startDate?: string;
    durationDays?: number;
  };
}

function MapPageContent() {
  const searchParams = useSearchParams();
  const [clickedCoordinate, setClickedCoordinate] = useState<{
    lat: number;
    lng: number;
    worldX: number;
    worldY: number;
    worldZ: number;
  } | null>(null);

  const [pendingPlacement, setPendingPlacement] = useState<{
    lat: number;
    lng: number;
    worldX: number;
    worldY: number;
    worldZ: number;
    ghostRotationY?: number;
  } | null>(null);

  const [timelineDate, setTimelineDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);

  const [placedBuildings, setPlacedBuildings] = useState<PlacedBuilding[]>([]);
  const [isPlacementMode, setIsPlacementMode] = useState(false);
  // Default scale now matches the calibrated building size (was 1.4, now scaled to 10)
  const [buildingScale, setBuildingScale] = useState({ x: 20, y: 20, z: 10 });
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(
    null,
  );

  // Custom model path from editor export
  const [customModelPath, setCustomModelPath] = useState<string | null>(null);
  const [importedBuildingName, setImportedBuildingName] = useState<
    string | null
  >(null);

  // Available buildings list
  interface AvailableBuilding {
    id: string;
    name: string;
    path: string;
    type: "default" | "custom";
  }
  const [availableBuildings, setAvailableBuildings] = useState<
    AvailableBuilding[]
  >([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [showBuildingSelector, setShowBuildingSelector] = useState(false);
  const [showNoiseRipple, setShowNoiseRipple] = useState(false);
  const [showZoningLayer, setShowZoningLayer] = useState(false);
  // Correct config for Markham / York Region zoning layer (Official Plan)
  const [zoningOffset, setZoningOffset] = useState({ x: 0, z: 0 });
  const [zoningRotationY, setZoningRotationY] = useState(180);
  const [zoningFlipH, setZoningFlipH] = useState(true);
  const [showEnvironmentalReport, setShowEnvironmentalReport] = useState(false);
  /** Override unit count for finance estimate (e.g. when 1 placed building represents a 12‑unit subdivision). */
  const [unitCountOverride, setUnitCountOverride] = useState<number | null>(null);
  /** Mix from editor Export to Map URL (detached/townhouse/midrise counts) for finance estimator. */
  const [scenarioMix, setScenarioMix] = useState<{ detached: number; townhouse: number; midrise: number } | null>(null);
  const [debugOverlayVisible, setDebugOverlayVisible] = useState(false);
  const [dashboardVisible, setDashboardVisible] = useState(false);
  const [placementError, setPlacementError] = useState<string | null>(null);
  const [debugPlacement, setDebugPlacement] = useState(false);
  const panelsPortalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!placementError) return;
    const t = setTimeout(() => setPlacementError(null), 4000);
    return () => clearTimeout(t);
  }, [placementError]);

  // Pre-fetch map data and available buildings on mount
  useEffect(() => {
    prefetchMapData();

    // Fetch available custom buildings
    async function fetchAvailableBuildings() {
      try {
        const response = await fetch("/api/editor/building");
        const data = await response.json();

        // Start with default buildings
        const buildings: AvailableBuilding[] = [
          {
            id: "default-sleep",
            name: "Let Me Sleep Building",
            path: "/let_me_sleeeeeeep/let_me_sleeeeeeep.gltf",
            type: "default",
          },
        ];

        // Add custom buildings from API
        if (data.buildings && Array.isArray(data.buildings)) {
          data.buildings.forEach(
            (b: { id: string; publicPath: string }, index: number) => {
              buildings.push({
                id: b.id,
                name: `Custom Building ${index + 1}`,
                path: b.publicPath,
                type: "custom",
              });
            },
          );
        }

        setAvailableBuildings(buildings);
      } catch (error) {
        console.error("Failed to fetch available buildings:", error);
        // Set default building as fallback
        setAvailableBuildings([
          {
            id: "default-sleep",
            name: "Let Me Sleep Building",
            path: "/let_me_sleeeeeeep/let_me_sleeeeeeep.gltf",
            type: "default",
          },
        ]);
      }
    }

    fetchAvailableBuildings();
  }, []);

  // Check for imported building from editor + optional units/mix from subdivision batch
  useEffect(() => {
    const buildingId = searchParams.get("buildingId");
    const unitsParam = searchParams.get("units");
    const detachedParam = searchParams.get("detached");
    const townhouseParam = searchParams.get("townhouse");
    const midriseParam = searchParams.get("midrise");

    if (buildingId) {
      const modelPath = `/api/editor/building/${buildingId}`;
      setCustomModelPath(modelPath);
      setImportedBuildingName("Custom Building from Editor");
      setIsPlacementMode(true);
      setBuildingScale({ x: 15, y: 15, z: 15 });
      console.log(`✅ Imported building from editor: ${modelPath}`);
    }

    if (unitsParam != null) {
      const u = parseInt(unitsParam, 10);
      if (!Number.isNaN(u) && u >= 1) setUnitCountOverride(u);
    }
    if (detachedParam != null && townhouseParam != null && midriseParam != null) {
      const d = parseInt(detachedParam, 10) || 0;
      const t = parseInt(townhouseParam, 10) || 0;
      const m = parseInt(midriseParam, 10) || 0;
      if (d + t + m > 0) setScenarioMix({ detached: d, townhouse: t, midrise: m });
    } else {
      setScenarioMix(null);
    }
  }, [searchParams]);

  const handleMapClick = (
    coordinate: {
      lat: number;
      lng: number;
      worldX: number;
      worldY: number;
      worldZ: number;
      ghostRotationY?: number;
    } | null,
  ) => {
    if (coordinate) {
      if (isPlacementMode) {
        setPendingPlacement(coordinate);
      } else {
        setClickedCoordinate(coordinate);
      }
    }
  };

  const handlePlacementSubmit = (details: BuildingPlacementDetails) => {
    if (!pendingPlacement) return;

    let modelPath = customModelPath;
    if (!modelPath && availableBuildings.length > 0) {
      modelPath = availableBuildings[0].path;
    }
    if (!modelPath) {
      modelPath = "/let_me_sleeeeeeep/let_me_sleeeeeeep.gltf";
    }

    const newBuilding: PlacedBuilding = {
      id: `building-${Date.now()}`,
      modelPath,
      position: {
        x: pendingPlacement.worldX,
        y: pendingPlacement.worldY,
        z: pendingPlacement.worldZ,
      },
      rotation: { x: 0, y: pendingPlacement.ghostRotationY || 0, z: 0 },
      scale: { x: buildingScale.x, y: buildingScale.y, z: buildingScale.z },
      lat: pendingPlacement.lat,
      lng: pendingPlacement.lng,
      timeline: {
        zoneType: details.zoneType,
        startDate: details.startDate,
        durationDays: details.durationDays,
      },
    };
    setPlacedBuildings((prev) => [...prev, newBuilding]);
    setPendingPlacement(null);
    setIsPlacementMode(false);
    setTimelineDate(details.startDate);
  };

  const clearImportedBuilding = () => {
    setCustomModelPath(null);
    setImportedBuildingName(null);
    setSelectedModelId(null);
    setIsPlacementMode(false);
    setBuildingScale({ x: 10, y: 10, z: 10 });
    // Clear the URL param
    window.history.replaceState({}, "", "/map");
  };

  const removeBuilding = (id: string) => {
    setPlacedBuildings((prev) => prev.filter((b) => b.id !== id));
    if (selectedBuildingId === id) {
      setSelectedBuildingId(null);
    }
  };

  const updateSelectedBuilding = (updates: Partial<PlacedBuilding>) => {
    if (!selectedBuildingId) return;
    setPlacedBuildings((prev) =>
      prev.map((b) =>
        b.id === selectedBuildingId ? { ...b, ...updates } : b,
      ),
    );
  };

  const selectedBuilding = placedBuildings.find(
    (b) => b.id === selectedBuildingId,
  );

  // Buildings that are under construction (active) at the current timeline date
  const buildingsActiveAtTimeline = useMemo(() => {
    return placedBuildings.filter((b) => {
      if (!b.timeline?.startDate || b.timeline.durationDays == null)
        return true; // no timeline = always "active"
      return isUnderConstruction(
        b.timeline.startDate,
        b.timeline.durationDays,
        timelineDate,
      );
    });
  }, [placedBuildings, timelineDate]);

  const { financeExecution, totalUnits, effectiveUnits } = useMemo(() => {
    const totalUnits = placedBuildings.reduce(
      (sum, b) => sum + (("units" in b && typeof (b as PlacedBuilding & { units?: number }).units === "number") ? (b as PlacedBuilding & { units?: number }).units! : 1),
      0
    );
    const effectiveUnits = unitCountOverride != null && unitCountOverride > 0 ? unitCountOverride : totalUnits;
    if (effectiveUnits === 0) return { financeExecution: null as ReturnType<typeof estimateFinanceExecution> | null, totalUnits: 0, effectiveUnits: 0 };
    const input: Parameters<typeof estimateFinanceExecution>[0] = { unitCount: effectiveUnits };
    if (scenarioMix && (scenarioMix.detached + scenarioMix.townhouse + scenarioMix.midrise) > 0) {
      input.detached = scenarioMix.detached;
      input.townhouse = scenarioMix.townhouse;
      input.midrise = scenarioMix.midrise;
    }
    return {
      financeExecution: estimateFinanceExecution(input),
      totalUnits,
      effectiveUnits,
    };
  }, [placedBuildings, unitCountOverride, scenarioMix]);

  // Timeline range from earliest start to latest end across all placed buildings
  const timelineRange = useMemo(() => {
    const now = new Date();
    const defaultMin = new Date(now);
    defaultMin.setMonth(now.getMonth() - 3);
    const defaultMax = new Date(now);
    defaultMax.setMonth(now.getMonth() + 6);
    if (placedBuildings.length === 0) {
      return { minDate: defaultMin, maxDate: defaultMax };
    }
    let minT = Infinity;
    let maxT = -Infinity;
    placedBuildings.forEach((b) => {
      if (b.timeline?.startDate && b.timeline.durationDays != null) {
        const start = new Date(b.timeline.startDate).getTime();
        const end = start + b.timeline.durationDays * 24 * 60 * 60 * 1000;
        minT = Math.min(minT, start);
        maxT = Math.max(maxT, end);
      }
    });
    if (minT === Infinity) minT = defaultMin.getTime();
    if (maxT === -Infinity) maxT = defaultMax.getTime();
    return { minDate: new Date(minT), maxDate: new Date(maxT) };
  }, [placedBuildings]);
  const minDateStr = timelineRange.minDate.toISOString().slice(0, 10);
  const maxDateStr = timelineRange.maxDate.toISOString().slice(0, 10);

  // Clamp timeline to range when range changes (e.g. after placing/removing buildings)
  useEffect(() => {
    setTimelineDate((d) => {
      if (d < minDateStr) return minDateStr;
      if (d > maxDateStr) return maxDateStr;
      return d;
    });
  }, [minDateStr, maxDateStr]);

  // Timeline play: advance by one week
  useEffect(() => {
    if (!isTimelinePlaying) return;
    const interval = setInterval(() => {
      setTimelineDate((d) => {
        const next = new Date(d);
        next.setDate(next.getDate() + 7);
        const nextStr = next.toISOString().slice(0, 10);
        if (nextStr > maxDateStr) return maxDateStr;
        return nextStr;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [isTimelinePlaying, maxDateStr]);

  const {
    score: populationHappiness,
    avgDb,
    activeCount,
  } = computeHappinessScore(placedBuildings, timelineDate);

  // Calculate dynamic environmental metrics based on buildings active at current timeline date.
  // Metrics scale with construction progress (0→1) so CO2, energy, and water ramp up as the timeline advances.
  const buildingMetrics = useMemo(() => {
    if (buildingsActiveAtTimeline.length === 0) {
      return {
        co2Emissions: 0,
        energyConsumption: 0,
        waterUsage: 0,
        totalFootprint: 0,
        materialComplexity: "N/A",
        sustainabilityScore: 100,
      };
    }

    let totalCO2 = 0;
    let totalEnergy = 0;
    let totalWater = 0;
    let totalFootprint = 0;
    let complexityScore = 0;

    buildingsActiveAtTimeline.forEach((building) => {
      // Progress 0–1: no timeline = treat as fully complete (1)
      const progress =
        building.timeline?.startDate != null &&
        building.timeline?.durationDays != null
          ? getConstructionProgress(
              building.timeline.startDate,
              building.timeline.durationDays,
              timelineDate,
            )
          : 1;

      const footprint = building.scale.x * building.scale.z * 100;
      const height = building.scale.y * 3;

      // Footprint "completed so far" grows with progress
      totalFootprint += footprint * progress;

      const constructionCO2 = footprint * 0.5 * (1 + height / 30);
      const annualOperationalCO2 = footprint * 0.02 * (1 + height / 50);
      totalCO2 += progress * (constructionCO2 + annualOperationalCO2);

      const energyPerSqM = 180 + (height / 10) * 20;
      totalEnergy += progress * ((footprint * energyPerSqM) / 1000);

      const waterPerSqM = 8 + (height / 20) * 3;
      totalWater += progress * ((footprint * waterPerSqM * 365) / 1000);

      complexityScore += footprint > 2000 ? 3 : footprint > 1000 ? 2 : 1;
    });

    const avgComplexity = complexityScore / buildingsActiveAtTimeline.length;
    const materialComplexity =
      avgComplexity >= 2.5
        ? "High (Steel/Glass)"
        : avgComplexity >= 1.5
          ? "Medium (Concrete)"
          : "Low (Wood/Brick)";

    const impactFactor = totalCO2 / 100 + totalEnergy / 50 + totalWater / 500;
    const sustainabilityScore = Math.max(0, Math.min(100, 100 - impactFactor));

    return {
      co2Emissions: totalCO2,
      energyConsumption: totalEnergy,
      waterUsage: totalWater,
      totalFootprint,
      materialComplexity,
      sustainabilityScore,
    };
  }, [buildingsActiveAtTimeline, timelineDate]);

  // Keyboard controls for selected building
  useEffect(() => {
    if (!selectedBuildingId || !selectedBuilding) return;

    function handleKeyPress(event: KeyboardEvent) {
      // Don't interfere with browser shortcuts
      if (event.metaKey || event.ctrlKey) return;
      // Don't interfere with text inputs
      if ((event.target as HTMLElement).tagName === "INPUT") return;

      if (!selectedBuilding) return;

      const step = event.shiftKey ? 10 : 1;
      const rotationStep = event.shiftKey ? 15 : 5; // degrees
      const scaleStep = event.shiftKey ? -0.5 : 0.5;

      let updated = false;
      const newBuilding = { ...selectedBuilding };

      switch (event.key) {
        case "ArrowLeft":
          newBuilding.position.x -= step;
          updated = true;
          break;
        case "ArrowRight":
          newBuilding.position.x += step;
          updated = true;
          break;
        case "ArrowUp":
          newBuilding.position.z -= step;
          updated = true;
          break;
        case "ArrowDown":
          newBuilding.position.z += step;
          updated = true;
          break;
        case "PageUp":
          newBuilding.position.y += step;
          updated = true;
          break;
        case "PageDown":
          newBuilding.position.y -= step;
          updated = true;
          break;
        case "r":
        case "R":
          newBuilding.rotation.y += (rotationStep * Math.PI) / 180;
          updated = true;
          break;
        case "s":
          newBuilding.scale.x += scaleStep;
          newBuilding.scale.y += scaleStep;
          newBuilding.scale.z += scaleStep;
          updated = true;
          break;
        case "S":
          newBuilding.scale.x = Math.max(0.1, newBuilding.scale.x + scaleStep);
          newBuilding.scale.y = Math.max(0.1, newBuilding.scale.y + scaleStep);
          newBuilding.scale.z = Math.max(0.1, newBuilding.scale.z + scaleStep);
          updated = true;
          break;
        default:
          return;
      }

      if (updated) {
        setPlacedBuildings((prev) =>
          prev.map((b) =>
            b.id === selectedBuildingId ? newBuilding : b,
          ),
        );
        event.preventDefault();
      }
    }

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [selectedBuildingId, selectedBuilding, placedBuildings]);

  // Voice copilot: process voice commands for the planning simulator
  const handleVoiceCommand = useCallback((transcript: string) => {
    console.log('[VoiceCopilot] Command:', transcript);
  }, []);

  const handleVoiceProcess = useCallback(async (transcript: string): Promise<string> => {
    // Check for simple commands first
    const lower = transcript.toLowerCase();

    if (lower.includes('place') || lower.includes('add building')) {
      setIsPlacementMode(true);
      return 'Placement mode activated. Click anywhere on the map to place a building.';
    }

    if (lower.includes('stop plac') || lower.includes('cancel')) {
      setIsPlacementMode(false);
      return 'Placement mode deactivated.';
    }

    if (lower.includes('report') || lower.includes('environmental') || lower.includes('impact')) {
      if (buildingsActiveAtTimeline.length > 0) {
        setShowEnvironmentalReport(true);
        return `Generating environmental impact report for ${buildingsActiveAtTimeline.length} active building${buildingsActiveAtTimeline.length !== 1 ? 's' : ''}.`;
      }
      return 'No active buildings to generate a report for. Place some buildings first.';
    }

    if (lower.includes('play timeline') || lower.includes('start timeline')) {
      setIsTimelinePlaying(true);
      return 'Playing the construction timeline.';
    }

    if (lower.includes('pause') || lower.includes('stop timeline')) {
      setIsTimelinePlaying(false);
      return 'Timeline paused.';
    }

    if (lower.includes('how many building') || lower.includes('status')) {
      const co2 = buildingMetrics.co2Emissions.toFixed(1);
      const energy = buildingMetrics.energyConsumption.toFixed(1);
      return `You have ${placedBuildings.length} buildings placed, ${buildingsActiveAtTimeline.length} currently active. CO2 emissions are at ${co2} tonnes per year, energy consumption is ${energy} megawatt hours.`;
    }

    if (lower.includes('noise') || lower.includes('happiness') || lower.includes('sentiment')) {
      return `Population happiness score is ${populationHappiness} out of 100. Average construction noise is ${avgDb} decibels across ${activeCount} active construction sites.`;
    }

    if (lower.includes('delete') || lower.includes('remove')) {
      if (selectedBuildingId) {
        const id = selectedBuildingId;
        setPlacedBuildings(prev => prev.filter(b => b.id !== id));
        setSelectedBuildingId(null);
        return 'Selected building has been removed.';
      }
      return 'No building is selected. Click on a building first to select it.';
    }

    // Default: acknowledge and suggest
    return `I heard: "${transcript}". You can say things like "place a building", "generate report", "play timeline", or "what is the status".`;
  }, [buildingsActiveAtTimeline, placedBuildings, buildingMetrics, populationHappiness, avgDb, activeCount, selectedBuildingId]);

  return (
    <div className="relative min-h-screen w-full bg-[#0a0a0a] text-white overflow-hidden">
      {/* MAP BACKGROUND (3D Simulation) */}
      <div className="absolute inset-0 z-0">
        <ThreeMap
          className="w-full h-full"
          onCoordinateClick={handleMapClick}
          onPlacementInvalid={setPlacementError}
          placedBuildings={placedBuildings}
          isPlacementMode={isPlacementMode}
          buildingScale={buildingScale}
          selectedBuildingId={selectedBuildingId}
          onBuildingSelect={setSelectedBuildingId}
          customModelPath={customModelPath}
          timelineDate={timelineDate}
          showNoiseRipple={showNoiseRipple}
          showZoningLayer={showZoningLayer}
          zoningOffset={zoningOffset}
          zoningRotationY={zoningRotationY}
          zoningFlipH={zoningFlipH}
          debugOverlayVisible={debugOverlayVisible}
          onDebugOverlayChange={setDebugOverlayVisible}
          dashboardVisible={dashboardVisible}
          onDashboardVisibleChange={setDashboardVisible}
          panelsPortalRef={panelsPortalRef}
          debugPlacement={debugPlacement}
          allowPlacementAnywhere
        />
        {/* Map gradient overlay for better UI contrast */}
        <div className="absolute inset-0 map-gradient pointer-events-none"></div>

        {/* Placement error toast (e.g. click not on ground) */}
        {placementError && (
          <div
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg bg-[#0a0a0a]/95 backdrop-blur-xl border border-red-500/50 text-white text-sm font-medium max-w-md text-center"
            role="alert"
          >
            {placementError}
          </div>
        )}

        {/* Placement Mode Indicator */}
        {isPlacementMode && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[#0a0a0a]/95 backdrop-blur-xl border border-emerald-500/50 px-6 py-3 rounded-lg shadow-lg z-50 pointer-events-auto flex items-center gap-4">
            <div>
              <p className="text-sm font-black text-emerald-400 uppercase tracking-tight">
                {customModelPath
                  ? "Place your custom building"
                  : "Click on the map to place building"}
              </p>
              {importedBuildingName && (
                <p className="text-xs text-white/60 mt-1">
                  Model: {importedBuildingName}
                </p>
              )}
            </div>
            {customModelPath && (
              <button
                onClick={clearImportedBuilding}
                className="p-1.5 hover:bg-red-500/20 rounded-full transition-colors text-white/40 hover:text-red-400"
                title="Cancel import"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Imported Building Notification */}
        {customModelPath && !isPlacementMode && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[#0a0a0a]/95 backdrop-blur-xl border border-amber-500/50 px-6 py-3 rounded-lg shadow-lg z-50 pointer-events-auto flex items-center gap-4">
            <Upload size={18} className="text-amber-400" />
            <div>
              <p className="text-sm font-black text-amber-400 uppercase tracking-tight">
                Building imported from Editor
              </p>
              <p className="text-xs text-white/60 mt-0.5">
                Click &apos;Place&apos; to position it on the map
              </p>
            </div>
            <button
              onClick={clearImportedBuilding}
              className="p-1.5 hover:bg-red-500/20 rounded-full transition-colors text-white/40 hover:text-red-400"
              title="Discard import"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* OVERLAYS: panels and modals above sidebars (z-50) so they are visible */}
      <div className="absolute inset-0 z-50 pointer-events-none">
        <div
          ref={(el) => {
            panelsPortalRef.current = el;
          }}
          className="absolute inset-0"
          aria-hidden
        />
        {pendingPlacement && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-auto">
            <BuildingPlacementForm
              lat={pendingPlacement.lat}
              lng={pendingPlacement.lng}
              onSubmit={handlePlacementSubmit}
              onCancel={() => setPendingPlacement(null)}
            />
          </div>
        )}
        {showEnvironmentalReport && (
          <div className="absolute inset-0 z-30 pointer-events-auto">
            <EnvironmentalReportModal
              visible={showEnvironmentalReport}
              onClose={() => setShowEnvironmentalReport(false)}
              buildings={buildingsActiveAtTimeline}
              snapshot={{
                timelineDate,
                co2Emissions: buildingMetrics.co2Emissions,
                energyConsumption: buildingMetrics.energyConsumption,
                waterUsage: buildingMetrics.waterUsage,
                totalFootprint: buildingMetrics.totalFootprint,
                materialComplexity: buildingMetrics.materialComplexity,
                sustainabilityScore: buildingMetrics.sustainabilityScore,
                populationHappiness,
                avgDb,
                activeCount,
              }}
            />
          </div>
        )}
      </div>

      {/* SIDEBARS CONTAINER */}
      <div className="absolute inset-0 z-40 pointer-events-none">
        {/* LEFT SIDEBAR: LAYERS & PROJECTS */}
        <aside
          className={`absolute left-6 top-6 w-72 pointer-events-auto flex flex-col gap-3 sidebar-transition ${placedBuildings.length > 0 ? "bottom-32" : "bottom-6"}`}
        >
          {/* Geospatial Layers Panel - Dark Theme */}
          <div className="flex-1 bg-[#0a0a0a] rounded-lg shadow-lg border border-white/5 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl font-bold text-white tracking-tight">GrowthSync</span>
              </div>
              <h3 className="text-sm font-medium text-white/70 uppercase tracking-wide">Geospatial Layers</h3>
            </div>

            {/* Layers Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 editor-sidebar-scroll">
              {/* City Zoning Layer */}
              <div className="p-4 bg-white/[0.02] border-l-2 border-emerald-500/50 hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center">
                      <Map size={16} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">City Zoning</p>
                      <p className="text-xs text-white/50">Official Plan · Land Use Designation</p>
                    </div>
                  </div>
                  <MinimalToggle
                    checked={showZoningLayer}
                    onChange={(e) => setShowZoningLayer(e.target.checked)}
                  />
                </div>
              </div>

              {/* Coordinate Finder Section */}
              <div className="pt-4 border-t border-white/5">
                {!clickedCoordinate ? (
                  <div className="flex items-center gap-2 text-white/40 text-xs">
                    <MapPin size={14} className="text-white/30" />
                    <span className="uppercase tracking-wider">
                      Click anywhere on the map to see coordinates
                    </span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-emerald-400" />
                        <h3 className="text-sm font-medium text-white uppercase tracking-wide">Clicked Coordinate</h3>
                      </div>
                      <button
                        onClick={() => setClickedCoordinate(null)}
                        className="p-1 hover:bg-white/10 rounded transition-colors text-white/40 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-white/[0.02] p-3 border-l-2 border-white/10">
                        <p className="text-[10px] font-bold text-white/50 uppercase mb-2 tracking-wider">
                          Geographic
                        </p>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-white/60">Latitude</span>
                            <span className="font-mono text-white">
                              {clickedCoordinate.lat.toFixed(6)}°
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/60">Longitude</span>
                            <span className="font-mono text-white">
                              {clickedCoordinate.lng.toFixed(6)}°
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/[0.02] p-3 border-l-2 border-white/10">
                        <p className="text-[10px] font-bold text-white/50 uppercase mb-2 tracking-wider">
                          World
                        </p>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-white/60">X</span>
                            <span className="font-mono text-white">
                              {clickedCoordinate.worldX.toFixed(2)}m
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/60">Y</span>
                            <span className="font-mono text-white">
                              {clickedCoordinate.worldY.toFixed(2)}m
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/60">Z</span>
                            <span className="font-mono text-white">
                              {clickedCoordinate.worldZ.toFixed(2)}m
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${clickedCoordinate.lat.toFixed(6)}, ${clickedCoordinate.lng.toFixed(6)}`,
                          );
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:bg-white/10 rounded text-xs font-bold text-white hover:text-emerald-400 transition-colors uppercase tracking-wider"
                      >
                        <Copy size={12} />
                        Copy Coordinates
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT SIDEBAR: METRIC ANALYSIS */}
        <aside
          className={`absolute right-6 top-6 w-64 pointer-events-auto sidebar-transition ${placedBuildings.length > 0 ? "bottom-32" : "bottom-6"}`}
        >
          <div className="bg-[#0a0a0a] rounded-lg shadow-lg border border-white/5 h-full overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/5">
              <h3 className="text-sm font-medium text-white/70 uppercase tracking-wide">Impact Analysis</h3>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 editor-sidebar-scroll">
              {/* Finance & Execution — live from scenario (unit count = placed buildings) */}
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-3">
                <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign size={14} />
                  Finance &amp; Execution
                </h4>
                {financeExecution ? (
                  <>
                    <p className="text-[10px] text-white/50">
                      Based on {effectiveUnits} unit{effectiveUnits !== 1 ? "s" : ""}
                      {scenarioMix
                        ? " (subdivision mix from editor)"
                        : unitCountOverride == null
                          ? ` (${placedBuildings.length} building${placedBuildings.length !== 1 ? "s" : ""})`
                          : " (override)"}
                    </p>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-white/50 shrink-0">Units for estimate:</label>
                      <input
                        type="number"
                        min={1}
                        max={9999}
                        placeholder={`${totalUnits}`}
                        value={unitCountOverride ?? ""}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          if (v === "") {
                            setUnitCountOverride(null);
                            return;
                          }
                          const n = parseInt(v, 10);
                          if (!Number.isNaN(n) && n >= 1) setUnitCountOverride(n);
                        }}
                        className="w-16 px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between gap-2">
                        <span className="text-white/50">Land required</span>
                        <span className="text-white font-mono text-right">
                          {financeExecution.land.required_area_acres} ac ({financeExecution.land.required_area_m2.toLocaleString()} m²)
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-white/50">Land cost</span>
                        <span className="text-white font-mono text-right">
                          ${(financeExecution.land.cost_range_cad.low / 1_000_000).toFixed(1)}M – ${(financeExecution.land.cost_range_cad.high / 1_000_000).toFixed(1)}M
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-white/50">Construction</span>
                        <span className="text-white font-mono text-right">
                          ${(financeExecution.construction.cost_range_cad.low / 1_000_000).toFixed(1)}M – ${(financeExecution.construction.cost_range_cad.high / 1_000_000).toFixed(1)}M
                        </span>
                      </div>
                      <div className="flex justify-between gap-2 pt-1 border-t border-white/10">
                        <span className="text-white/70 font-semibold">Total project</span>
                        <span className="text-emerald-400 font-mono font-semibold text-right">
                          ${(financeExecution.total_project_cost.low / 1_000_000).toFixed(1)}M – ${(financeExecution.total_project_cost.high / 1_000_000).toFixed(1)}M
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-white/50">Timeline</span>
                        <span className="text-white font-mono text-right">
                          {financeExecution.execution_timeline.estimated_months_low}–{financeExecution.execution_timeline.estimated_months_high} mo
                          {financeExecution.execution_timeline.estimated_months_high >= 12 && (
                            <span className="text-white/60 ml-0.5">
                              ({(financeExecution.execution_timeline.estimated_months_low / 12).toFixed(1)}–{(financeExecution.execution_timeline.estimated_months_high / 12).toFixed(1)} yr)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    <details className="text-[10px] text-white/40">
                      <summary className="cursor-pointer hover:text-white/60">Phases</summary>
                      <ul className="mt-1.5 space-y-0.5 pl-1">
                        {financeExecution.execution_timeline.phases.map((p) => (
                          <li key={p.name} className="flex justify-between gap-2">
                            <span>{p.name}</span>
                            <span className="tabular-nums">{p.months} mo</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </>
                ) : (
                  <p className="text-xs text-white/40">Place buildings to see cost &amp; timeline estimates.</p>
                )}
              </div>

              <div>
                <button
                  onClick={() => setShowEnvironmentalReport(true)}
                  disabled={buildingsActiveAtTimeline.length === 0}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-black uppercase tracking-tight transition-all ${
                    buildingsActiveAtTimeline.length > 0
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg border border-emerald-500/30"
                      : "bg-white/5 text-white/30 cursor-not-allowed border border-white/5"
                  }`}
                >
                  <ClipboardList size={18} />
                  <span>Generate Impact Report</span>
                </button>
                <p className="text-[10px] text-white/40 text-center mt-2">
                  {buildingsActiveAtTimeline.length === 0
                    ? "Move timeline to a date with active construction to generate a report"
                    : `Snapshot at current date · ${buildingsActiveAtTimeline.length} building${buildingsActiveAtTimeline.length !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* VOICE COPILOT */}
      <VoiceCopilot
        onCommand={handleVoiceCommand}
        onProcess={handleVoiceProcess}
        context={`${placedBuildings.length} buildings placed, ${buildingsActiveAtTimeline.length} active`}
      />

    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-accent-blue border-r-transparent mb-4" />
            <p className="text-slate-600">Loading map...</p>
          </div>
        </div>
      }
    >
      <MapPageContent />
    </Suspense>
  );
}

import { useState, useCallback } from 'react';
import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';
import { DEFAULT_BATCH_CONFIG, type BatchConfig, type BatchMix } from '@/lib/editor/utils/buildingCluster';
import { CurtainButton } from '@/components/ui/curtain-button';

function normalizeMix(mix: BatchMix, changedKey: keyof BatchMix, newValue: number): BatchMix {
  const clamped = Math.max(0, Math.min(100, Math.round(newValue)));
  const rest = 100 - clamped;
  const keys: (keyof BatchMix)[] = ['detachedPct', 'townhousePct', 'midrisePct'];
  const others = keys.filter((k) => k !== changedKey);
  const next: BatchMix = { ...mix, [changedKey]: clamped };
  if (rest <= 0) {
    others.forEach((k) => (next[k] = 0));
    return next;
  }
  const sumOthers = others.reduce((s, k) => s + mix[k], 0);
  if (sumOthers <= 0) {
    const per = Math.floor(rest / others.length);
    others.forEach((k, i) => (next[k] = i === others.length - 1 ? rest - per * (others.length - 1) : per));
  } else {
    const [a, b] = others;
    const pa = mix[a] / sumOthers;
    next[a] = Math.round(rest * pa);
    next[b] = rest - next[a];
  }
  const total = next.detachedPct + next.townhousePct + next.midrisePct;
  if (total !== 100) {
    const largest = (['detachedPct', 'townhousePct', 'midrisePct'] as const).sort((a, b) => next[b] - next[a])[0];
    next[largest] = next[largest] + (100 - total);
  }
  return next;
}

export interface BuildingListProps {
  /** When provided, batch config is controlled by parent (e.g. sidebar with separate Batch Settings accordion). */
  batchConfig?: BatchConfig;
  setBatchConfig?: React.Dispatch<React.SetStateAction<BatchConfig>>;
  /** When true, hide the inline batch sliders (use Batch Settings accordion instead). */
  hideBatchSliders?: boolean;
}

export function BuildingList({ batchConfig: batchConfigProp, setBatchConfig: setBatchConfigProp, hideBatchSliders }: BuildingListProps = {}) {
  const {
    buildings,
    selectedBuildingId,
    selectedBuildingIds,
    selectBuilding,
    toggleBuildingSelection,
    removeBuilding,
    placementMode,
    setPlacementMode,
    mergeMode,
    setMergeMode,
    mergeBuildings,
    ungroupBuilding,
    batchPlacementConfig,
    setBatchPlacementConfig,
  } = useBuildings();

  const [internalBatchConfig, setInternalBatchConfig] = useState<BatchConfig>(() => ({ ...DEFAULT_BATCH_CONFIG }));
  const batchConfig = batchConfigProp ?? internalBatchConfig;
  const setBatchConfig = setBatchConfigProp ?? setInternalBatchConfig;

  const handleAddBuilding = () => {
    setPlacementMode(true);
  };

  const enterBatchPlacementMode = () => {
    setBatchPlacementConfig({ ...batchConfig });
  };

  const cancelBatchPlacementMode = () => {
    setBatchPlacementConfig(null);
  };

  const setMix = useCallback((key: keyof BatchMix, value: number) => {
    setBatchConfig((prev) => ({
      ...prev,
      mix: normalizeMix(prev.mix, key, value),
    }));
  }, []);

  const handleBuildingClick = (buildingId: string) => {
    if (mergeMode) {
      toggleBuildingSelection(buildingId);
    } else {
      selectBuilding(buildingId);
    }
  };

  const handleMerge = () => {
    if (selectedBuildingIds.length >= 2) {
      mergeBuildings();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <CurtainButton
            text={mergeMode ? 'Cancel' : 'Group'}
            onClick={() => setMergeMode(!mergeMode)}
            isDisabled={placementMode || buildings.length < 2}
            variant="purple"
            size="default"
          />
          <CurtainButton
            text="Place Subdivision (Batch)"
            onClick={enterBatchPlacementMode}
            isDisabled={placementMode || mergeMode || batchPlacementConfig !== null}
            variant="emerald"
            size="default"
            title={`Enter batch mode: click grid to place ${batchConfig.totalBuildings} buildings (${batchConfig.mix.detachedPct}% detached, ${batchConfig.mix.townhousePct}% townhouse, ${batchConfig.mix.midrisePct}% mid-rise)`}
          />
          <CurtainButton
            text={placementMode ? 'Click Grid...' : '+ Add'}
            onClick={handleAddBuilding}
            isDisabled={placementMode || mergeMode}
            variant="amber"
            size="default"
          />
        </div>
      </div>

      {!hideBatchSliders && (
        <div className="p-3 bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/20 rounded-lg space-y-3">
          <h4 className="text-sm font-semibold text-emerald-400">Batch Placement</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs text-white/80">Total Buildings</label>
              <span className="text-xs font-medium text-emerald-400 tabular-nums">{batchConfig.totalBuildings}</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              step={1}
              value={batchConfig.totalBuildings}
              onChange={(e) => setBatchConfig((c) => ({ ...c, totalBuildings: parseInt(e.target.value, 10) }))}
              className="w-full h-2 rounded-full appearance-none bg-emerald-500/20 accent-emerald-500"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs text-white/80">Spacing (m)</label>
              <span className="text-xs font-medium text-emerald-400 tabular-nums">{batchConfig.spacing}</span>
            </div>
            <input
              type="range"
              min={4}
              max={20}
              step={1}
              value={batchConfig.spacing}
              onChange={(e) => setBatchConfig((c) => ({ ...c, spacing: parseInt(e.target.value, 10) }))}
              className="w-full h-2 rounded-full appearance-none bg-emerald-500/20 accent-emerald-500"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs text-white/80">Footprint (compact ↔ spread)</label>
              <span className="text-xs font-medium text-emerald-400 tabular-nums">{batchConfig.footprintScale.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0.6}
              max={2}
              step={0.1}
              value={batchConfig.footprintScale}
              onChange={(e) => setBatchConfig((c) => ({ ...c, footprintScale: parseFloat(e.target.value) }))}
              className="w-full h-2 rounded-full appearance-none bg-emerald-500/20 accent-emerald-500"
            />
          </div>
          <div className="pt-1 border-t border-white/10">
            <p className="text-xs text-white/80 font-medium mb-2">Housing mix (sum = 100%)</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs text-white/80">Detached</label>
                <span className="text-xs font-medium text-emerald-400 tabular-nums w-8">{batchConfig.mix.detachedPct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={batchConfig.mix.detachedPct}
                onChange={(e) => setMix('detachedPct', parseInt(e.target.value, 10))}
                className="w-full h-2 rounded-full appearance-none bg-emerald-500/20 accent-emerald-500"
              />
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs text-white/80">Townhouses</label>
                <span className="text-xs font-medium text-emerald-400 tabular-nums w-8">{batchConfig.mix.townhousePct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={batchConfig.mix.townhousePct}
                onChange={(e) => setMix('townhousePct', parseInt(e.target.value, 10))}
                className="w-full h-2 rounded-full appearance-none bg-emerald-500/20 accent-emerald-500"
              />
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs text-white/80">Mid-rise</label>
                <span className="text-xs font-medium text-emerald-400 tabular-nums w-8">{batchConfig.mix.midrisePct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={batchConfig.mix.midrisePct}
                onChange={(e) => setMix('midrisePct', parseInt(e.target.value, 10))}
                className="w-full h-2 rounded-full appearance-none bg-emerald-500/20 accent-emerald-500"
              />
            </div>
          </div>
        </div>
      )}

      {batchPlacementConfig !== null && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg backdrop-blur-sm">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-emerald-300 font-medium">Batch Placement Mode</p>
              <p className="text-xs text-emerald-400/80 mt-1">
                Click anywhere on the grid to place the batch ({batchPlacementConfig.totalBuildings} buildings). One-time placement.
              </p>
              <CurtainButton
                text="Cancel"
                onClick={cancelBatchPlacementMode}
                variant="outline"
                size="sm"
                className="mt-2"
              />
            </div>
          </div>
        </div>
      )}

      {mergeMode && (
        <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg backdrop-blur-sm">
          <p className="text-sm text-purple-300 font-medium">Group Mode</p>
          <p className="text-xs text-purple-400/80 mt-1">
            Select 2+ buildings to group. They keep individual rotations but share textures/windows.
          </p>
          {selectedBuildingIds.length >= 2 && (
            <CurtainButton
              text={`Group ${selectedBuildingIds.length} Buildings`}
              onClick={handleMerge}
              variant="purple"
              size="default"
              className="mt-2"
            />
          )}
        </div>
      )}

      <div className="space-y-1 max-h-28 overflow-y-auto">
        {buildings.map((building) => {
          const isSelected = mergeMode
            ? selectedBuildingIds.includes(building.id)
            : selectedBuildingId === building.id;
          const selectionIndex = mergeMode ? selectedBuildingIds.indexOf(building.id) : -1;

          return (
            <div
              key={building.id}
              className={`
                px-3 py-2 rounded-lg border cursor-pointer transition-all duration-200 ease-out backdrop-blur-sm
                ${isSelected
                  ? mergeMode
                    ? 'border-purple-400/60 bg-purple-500/20'
                    : 'border-amber-400/60 bg-amber-500/20 shadow-lg'
                  : 'border-white/10 bg-white/5 hover:border-amber-400/40 hover:bg-white/10'
                }
              `}
              onClick={() => handleBuildingClick(building.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {mergeMode && selectionIndex >= 0 && (
                      <span className="w-4 h-4 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center font-bold">
                        {selectionIndex + 1}
                      </span>
                    )}
                    <span className="font-medium text-white text-sm">{building.name}</span>
                    {mergeMode && selectionIndex === 0 && (
                      <span className="text-xs bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded-full border border-purple-400/30">Primary</span>
                    )}
                    {!mergeMode && building.groupId && (
                      <span className="text-xs bg-green-500/30 text-green-300 px-1.5 py-0.5 rounded-full border border-green-400/30">Grouped</span>
                    )}
                    <span className="text-xs text-white/50">
                      {building.spec.width}×{building.spec.depth}m, {building.spec.numberOfFloors}F
                    </span>
                  </div>
                </div>
                {!mergeMode && (
                  <div className="flex items-center gap-1">
                    {building.groupId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          ungroupBuilding(building.id);
                        }}
                        className="p-1.5 rounded-full border border-green-400/40 text-green-400 hover:bg-green-500/80 hover:text-white transition-all duration-200 ease-out"
                        title="Ungroup building"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                          />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeBuilding(building.id);
                      }}
                      className="p-1.5 rounded-full border border-red-400/40 text-red-400 hover:bg-red-500/80 hover:text-white transition-all duration-200 ease-out"
                      title="Delete building"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {placementMode && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg backdrop-blur-sm">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-amber-400 mt-0.5 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-amber-300 font-medium">Placement Mode Active</p>
              <p className="text-xs text-amber-400/80 mt-1">
                Click anywhere on the grid to place the new building
              </p>
              <CurtainButton
                text="Cancel"
                onClick={() => setPlacementMode(false)}
                variant="outline"
                size="sm"
                className="mt-2"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

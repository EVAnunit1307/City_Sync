'use client';

import React, { useState, useCallback } from 'react';
import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';
import {
  planToBatchConfig,
  type BatchConfig,
  type SubdivisionPlanEntry,
} from '@/lib/editor/utils/buildingCluster';
import type { BuildingType } from '@/lib/editor/types/buildingSpec';
import { CurtainButton } from '@/components/ui/curtain-button';

type SubdivisionTab = 'presets' | 'custom';

interface SubdivisionPreset {
  id: string;
  name: string;
  description: string;
  plan: SubdivisionPlanEntry[];
}

const SUBDIVISION_PRESETS: SubdivisionPreset[] = [
  {
    id: 'detached-30',
    name: 'Detached Subdivision',
    description: '30 single-family detached homes.',
    plan: [{ type: 'detached', count: 30 }],
  },
  {
    id: 'townhouse-20',
    name: 'Townhouse Cluster',
    description: '20 townhouse units.',
    plan: [{ type: 'townhouse', count: 20 }],
  },
  {
    id: 'tod-midrise',
    name: 'TOD Mid-rise',
    description: '6 mid-rise buildings (transit-oriented).',
    plan: [{ type: 'midrise', count: 6 }],
  },
  {
    id: 'mixed-60-30-10',
    name: 'Mixed (60/30/10)',
    description: '30 buildings: 60% detached, 30% townhouse, 10% mid-rise.',
    plan: [
      { type: 'detached', count: 18 },
      { type: 'townhouse', count: 9 },
      { type: 'midrise', count: 3 },
    ],
  },
];

const BUILDING_TYPE_LABELS: Record<BuildingType, string> = {
  detached: 'Detached',
  townhouse: 'Townhouse',
  midrise: 'Mid-rise',
};

export function SubdivisionPanel() {
  const { batchPlacementConfig, setBatchPlacementConfig } = useBuildings();
  const [activeTab, setActiveTab] = useState<SubdivisionTab>('presets');
  const [customPlan, setCustomPlan] = useState<SubdivisionPlanEntry[]>([]);
  const [customType, setCustomType] = useState<BuildingType>('detached');
  const [customQuantity, setCustomQuantity] = useState(5);
  const [customSpacing, setCustomSpacing] = useState(8);

  const enterPlacementWithConfig = useCallback(
    (config: BatchConfig) => {
      setBatchPlacementConfig(config);
    },
    [setBatchPlacementConfig]
  );

  const handlePresetPlace = (preset: SubdivisionPreset) => {
    const config = planToBatchConfig(preset.plan, 8, 1.0);
    enterPlacementWithConfig(config);
  };

  const handleAddToPlan = () => {
    if (customQuantity < 1) return;
    setCustomPlan((prev) => {
      const i = prev.findIndex((e) => e.type === customType);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], count: next[i].count + customQuantity };
        return next;
      }
      return [...prev, { type: customType, count: customQuantity }];
    });
  };

  const removeFromPlan = (index: number) => {
    setCustomPlan((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePlanQuantity = (index: number, count: number) => {
    if (count < 1) return;
    setCustomPlan((prev) =>
      prev.map((e, i) => (i === index ? { ...e, count } : e))
    );
  };

  const handlePlacePlan = () => {
    if (customPlan.length === 0) return;
    const config = planToBatchConfig(customPlan, customSpacing, 1.0);
    enterPlacementWithConfig(config);
  };

  const totalInPlan = customPlan.reduce((s, e) => s + e.count, 0);

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
      <div className="flex border-b border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'presets'
              ? 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-500'
              : 'text-white/60 hover:bg-white/5 hover:text-white'
          }`}
        >
          Preset Subdivisions
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('custom')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'custom'
              ? 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-500'
              : 'text-white/60 hover:bg-white/5 hover:text-white'
          }`}
        >
          Custom Subdivision Builder
        </button>
      </div>

      <div className="p-4">
        {activeTab === 'presets' && (
          <div className="space-y-3">
            <p className="text-xs text-white/60 mb-3">
              Select a preset and click Place to enter placement mode. Click once on the grid to place.
            </p>
            {SUBDIVISION_PRESETS.map((preset) => (
              <div
                key={preset.id}
                className="p-3 rounded-lg border border-white/10 bg-white/5 hover:border-emerald-500/40 hover:bg-white/8 transition-all"
              >
                <div className="font-medium text-white">{preset.name}</div>
                <div className="text-xs text-white/60 mt-0.5">{preset.description}</div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-white/50">
                    {preset.plan.map((e) => `${e.count} ${e.type}`).join(', ')}
                  </span>
                  <CurtainButton
                    text="Place"
                    onClick={() => handlePresetPlace(preset)}
                    isDisabled={batchPlacementConfig !== null}
                    variant="emerald"
                    size="sm"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'custom' && (
          <div className="space-y-4">
            <p className="text-xs text-white/60">
              Build your plan, then click Place Plan to enter placement mode. Click once on the grid to place.
            </p>

            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[100px]">
                <label className="block text-xs font-medium text-white/80 mb-1">Building type</label>
                <select
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value as BuildingType)}
                  className="w-full rounded-lg border border-white/20 bg-white/10 text-white px-3 py-2 text-sm backdrop-blur-sm"
                >
                  {(['detached', 'townhouse', 'midrise'] as BuildingType[]).map((t) => (
                    <option key={t} value={t} className="bg-gray-900">
                      {BUILDING_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-20">
                <label className="block text-xs font-medium text-white/80 mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={customQuantity}
                  onChange={(e) => setCustomQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-full rounded-lg border border-white/20 bg-white/10 text-white px-2 py-2 text-sm backdrop-blur-sm"
                />
              </div>
              <CurtainButton
                text="Add to Plan"
                onClick={handleAddToPlan}
                variant="outline"
                size="default"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-white/80">Spacing (m)</label>
              <input
                type="range"
                min={4}
                max={20}
                step={1}
                value={customSpacing}
                onChange={(e) => setCustomSpacing(parseInt(e.target.value, 10))}
                className="flex-1 h-2 rounded-full appearance-none bg-emerald-500/20 accent-emerald-500"
              />
              <span className="text-xs font-medium text-white/80 tabular-nums w-6">{customSpacing}</span>
            </div>

            {customPlan.length > 0 && (
              <>
                <div className="text-xs font-medium text-white/80">Current plan ({totalInPlan} buildings)</div>
                <ul className="space-y-1 max-h-32 overflow-y-auto">
                  {customPlan.map((entry, index) => (
                    <li
                      key={`${entry.type}-${index}`}
                      className="flex items-center justify-between gap-2 py-1.5 px-2 rounded bg-white/5 border border-white/10"
                    >
                      <span className="text-sm text-white">
                        {BUILDING_TYPE_LABELS[entry.type]} × {entry.count}
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          value={entry.count}
                          onChange={(e) => updatePlanQuantity(index, parseInt(e.target.value, 10) || 1)}
                          className="w-12 rounded border border-white/20 bg-white/10 text-white px-1 py-0.5 text-xs backdrop-blur-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeFromPlan(index)}
                          className="p-1 rounded text-red-400 hover:bg-red-500/20 text-xs transition-colors"
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <CurtainButton
                  text={`Place Plan (${totalInPlan} buildings)`}
                  onClick={handlePlacePlan}
                  isDisabled={batchPlacementConfig !== null}
                  variant="emerald"
                  size="default"
                  className="w-full mt-2"
                />
              </>
            )}

            {customPlan.length === 0 && (
              <p className="text-xs text-white/50 italic">Add building types and quantities above to build your plan.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

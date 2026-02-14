'use client';

import { useState, useCallback } from 'react';
import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';
import { TransformForm } from './TransformForm';
import { DimensionsForm } from './DimensionsForm';
import { TextureSelector } from './TextureSelector';
import { WindowForm } from './WindowForm';
import { BlueprintUploader } from './BlueprintUploader';
import { BuildingList } from './BuildingList';
import { SubdivisionPanel } from './SubdivisionPanel';
import { BatchSettings } from './BatchSettings';
import { DEFAULT_BUILDING_SPEC } from '@/lib/editor/types/buildingSpec';
import { DEFAULT_BATCH_CONFIG, type BatchConfig } from '@/lib/editor/utils/buildingCluster';
import { ChevronDown, ChevronRight, Building2, BarChart3, FolderKanban, Sparkles } from 'lucide-react';

type SettingsTab = 'transform' | 'dimensions' | 'textures' | 'windows';
type MainTab = 'build' | 'impacts' | 'projects' | 'ai';

const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: 'transform', label: 'Transform' },
  { id: 'dimensions', label: 'Dimensions' },
  { id: 'textures', label: 'Textures' },
  { id: 'windows', label: 'Windows' },
];

const MAIN_TABS: { id: MainTab; label: string; icon: React.ReactNode }[] = [
  { id: 'build', label: 'Build', icon: <Building2 size={16} /> },
  { id: 'impacts', label: 'Impacts', icon: <BarChart3 size={16} /> },
  { id: 'projects', label: 'Projects', icon: <FolderKanban size={16} /> },
  { id: 'ai', label: 'AI', icon: <Sparkles size={16} /> },
];

function Accordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-gray-900 bg-gray-50 hover:bg-gray-100"
      >
        <span>{title}</span>
        {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

export function InputPanel() {
  const {
    buildings,
    getSelectedBuilding,
    updateBuilding,
    updateBuildingRotation,
    updateBuildingPosition,
    placementMode,
    setPlacementMode,
    batchPlacementConfig,
    setBatchPlacementConfig,
  } = useBuildings();
  const selectedBuilding = getSelectedBuilding();
  const [activeTab, setActiveTab] = useState<SettingsTab>('transform');
  const [mainTab, setMainTab] = useState<MainTab>('build');
  const [llmDraftPrompt, setLlmDraftPrompt] = useState('');
  const [batchConfig, setBatchConfig] = useState<BatchConfig>(() => ({ ...DEFAULT_BATCH_CONFIG }));
  const [buildAccordion, setBuildAccordion] = useState<'placement' | 'batch' | 'subdivision'>('placement');

  const handleUpdate = (updates: Partial<typeof DEFAULT_BUILDING_SPEC>) => {
    if (selectedBuilding) updateBuilding(selectedBuilding.id, updates);
  };

  const handleReset = () => {
    if (selectedBuilding) updateBuilding(selectedBuilding.id, DEFAULT_BUILDING_SPEC);
  };

  const setBuildAccordionOne = useCallback((key: 'placement' | 'batch' | 'subdivision') => {
    setBuildAccordion(key);
  }, []);

  const units = buildings.length;
  const congestion = '—';
  const transitLoad = '—';

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-gradient-to-b from-gray-50 to-white border-r border-gray-200">
      {/* Sticky header */}
      <div className="shrink-0 sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-bold text-gray-900">GrowthSync Editor</h1>
        <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
          <span>Units: {units}</span>
          <span>Congestion: {congestion}</span>
          <span>Transit: {transitLoad}</span>
        </div>
      </div>

      {/* Main tabs */}
      <div className="shrink-0 px-2 pt-2 pb-1">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-sm font-medium transition-colors ${
                mainTab === tab.id ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 space-y-4">
          {mainTab === 'build' && (
            <>
              <Accordion
                title="Placement"
                open={buildAccordion === 'placement'}
                onToggle={() => setBuildAccordionOne('placement')}
              >
                <BuildingList
                  batchConfig={batchConfig}
                  setBatchConfig={setBatchConfig}
                  hideBatchSliders
                />
              </Accordion>
              <Accordion
                title="Batch Settings"
                open={buildAccordion === 'batch'}
                onToggle={() => setBuildAccordionOne('batch')}
              >
                <BatchSettings batchConfig={batchConfig} setBatchConfig={setBatchConfig} />
              </Accordion>
              <Accordion
                title="Subdivision Plan"
                open={buildAccordion === 'subdivision'}
                onToggle={() => setBuildAccordionOne('subdivision')}
              >
                <SubdivisionPanel />
              </Accordion>
            </>
          )}

          {mainTab === 'impacts' && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
              <h3 className="text-base font-semibold text-gray-900">Live metrics</h3>
              <div className="grid gap-3">
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Congestion</p>
                  <p className="text-lg font-semibold text-gray-800">{congestion}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Transit load</p>
                  <p className="text-lg font-semibold text-gray-800">{transitLoad}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Units</p>
                  <p className="text-lg font-semibold text-gray-800">{units}</p>
                </div>
              </div>
            </div>
          )}

          {mainTab === 'projects' && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-3">York Region projects</h3>
              <p className="text-sm text-gray-500">Project toggles — coming soon</p>
            </div>
          )}

          {mainTab === 'ai' && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Planning Assistant (LLM) — coming soon
              </label>
              <textarea
                value={llmDraftPrompt}
                onChange={(e) => setLlmDraftPrompt(e.target.value)}
                placeholder="Describe a subdivision or ask why an impact changed…"
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  disabled
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-300 text-gray-500 cursor-not-allowed"
                >
                  Run
                </button>
              </div>
            </div>
          )}

          {/* Building settings (when a building is selected) - show below main content in same scroll */}
          {selectedBuilding && mainTab === 'build' && (
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-base font-semibold text-gray-900 mb-3">{selectedBuilding.name}</h3>
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-3">
                {SETTINGS_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
                      activeTab === tab.id ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                {activeTab === 'transform' && (
                  <TransformForm
                    buildingId={selectedBuilding.id}
                    position={selectedBuilding.position}
                    rotation={selectedBuilding.rotation}
                    onPositionChange={(pos) => updateBuildingPosition(selectedBuilding.id, pos)}
                    onRotationChange={(r) => updateBuildingRotation(selectedBuilding.id, r)}
                  />
                )}
                {activeTab === 'dimensions' && (
                  <DimensionsForm spec={selectedBuilding.spec} onUpdate={handleUpdate} buildingId={selectedBuilding.id} />
                )}
                {activeTab === 'textures' && <TextureSelector spec={selectedBuilding.spec} onUpdate={handleUpdate} />}
                {activeTab === 'windows' && <WindowForm spec={selectedBuilding.spec} onUpdate={handleUpdate} />}
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-full font-medium text-xs border-2 bg-amber-200 border-amber-300 text-amber-700 hover:bg-amber-300"
                >
                  Reset building
                </button>
              </div>
            </div>
          )}

          {!selectedBuilding && mainTab === 'build' && (
            <div className="py-8 text-center bg-white rounded-xl border border-gray-200">
              <p className="text-gray-600">No building selected</p>
              <p className="text-sm text-gray-500 mt-1">Add a building or select one in the list</p>
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer: primary actions */}
      <div className="shrink-0 sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3 flex flex-wrap gap-2 items-center">
        {!placementMode && !batchPlacementConfig && (
          <button
            onClick={() => setPlacementMode(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600"
          >
            Place
          </button>
        )}
        {placementMode && (
          <button
            onClick={() => setPlacementMode(false)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Cancel Placement
          </button>
        )}
        {batchPlacementConfig !== null && (
          <button
            onClick={() => setBatchPlacementConfig(null)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
          >
            Clear Plan
          </button>
        )}
      </div>

      {/* Blueprint at very bottom (optional - keep or move into Build) */}
      <div className="shrink-0 p-4 border-t border-gray-100 bg-gray-50/50">
        <BlueprintUploader />
      </div>
    </div>
  );
}

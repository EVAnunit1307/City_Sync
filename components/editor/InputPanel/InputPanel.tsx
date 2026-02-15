'use client';

import { useState, useCallback } from 'react';
import * as THREE from 'three';
import { useRouter } from 'next/navigation';
import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';
import { TransformForm } from './TransformForm';
import { DimensionsForm } from './DimensionsForm';
import { TextureSelector } from './TextureSelector';
import { WindowForm } from './WindowForm';
import { BuildingList } from './BuildingList';
import { SubdivisionPanel } from './SubdivisionPanel';
import { BatchSettings } from './BatchSettings';
import { DEFAULT_BUILDING_SPEC } from '@/lib/editor/types/buildingSpec';
import { DEFAULT_BATCH_CONFIG, type BatchConfig } from '@/lib/editor/utils/buildingCluster';
import { SHOW_SINGLE_BUILDING_ADD_UI } from '@/lib/editor/config';
import { exportToMap } from '@/lib/editor/utils/exportUtils';
import { ChevronDown, ChevronRight, Building2, FileText, MapPin } from 'lucide-react';

type SettingsTab = 'transform' | 'dimensions' | 'textures' | 'windows';
type MainTab = 'build' | 'report';

const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: 'transform', label: 'Transform' },
  { id: 'dimensions', label: 'Dimensions' },
  { id: 'textures', label: 'Textures' },
  { id: 'windows', label: 'Windows' },
];

const MAIN_TABS: { id: MainTab; label: string; icon: React.ReactNode }[] = [
  { id: 'build', label: 'Build', icon: <Building2 size={16} /> },
  { id: 'report', label: 'Report', icon: <FileText size={16} /> },
];

// Removed accordion - using direct sections instead for simpler flow

interface ReportTabContentProps {
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
}

function ReportTabContent({ sceneRef }: ReportTabContentProps) {
  const { buildings } = useBuildings();
  const router = useRouter();
  const [exportingToMap, setExportingToMap] = useState(false);

  const handleExportToMap = async () => {
    if (!sceneRef.current || buildings.length === 0) {
      alert(buildings.length === 0 ? 'Create a building first' : 'Scene not ready');
      return;
    }
    setExportingToMap(true);
    try {
      const { id } = await exportToMap(sceneRef.current, 'custom-building');
      const detached = buildings.filter((b) => b.buildingType === 'detached').length;
      const townhouse = buildings.filter((b) => b.buildingType === 'townhouse').length;
      const midrise = buildings.filter((b) => b.buildingType === 'midrise').length;
      const params = new URLSearchParams({ buildingId: id, units: String(buildings.length) });
      if (detached + townhouse + midrise > 0) {
        params.set('detached', String(detached));
        params.set('townhouse', String(townhouse));
        params.set('midrise', String(midrise));
      }
      router.push(`/map?${params.toString()}`);
    } catch (e) {
      console.error(e);
      alert('Export to map failed');
      setExportingToMap(false);
    }
  };

  return (
    <div className="editor-section-animate">
      <h3 className="text-sm font-semibold text-white/90 mb-4 flex items-center gap-2">
        <div className="w-1 h-4 bg-emerald-500/60 rounded-full"></div>
        Export & Report
      </h3>
      <p className="text-xs text-white/40 mb-4">
        {buildings.length} building{buildings.length !== 1 ? 's' : ''} in scene
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExportToMap}
          disabled={exportingToMap}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 disabled:opacity-60 transition-all"
        >
          <MapPin size={14} />
          {exportingToMap ? 'Exporting…' : 'Export to Map'}
        </button>
      </div>
    </div>
  );
}

export interface InputPanelProps {
  sceneRef?: React.MutableRefObject<THREE.Scene | null>;
}

export function InputPanel({ sceneRef }: InputPanelProps) {
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

  return (
    <div className="w-full flex flex-col min-h-0">
      {/* Main tabs - minimalist */}
      <div className="shrink-0 mb-6 border-b border-white/5">
        <div className="flex gap-1">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id)}
              className={`group relative flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium transition-all duration-200 ${
                mainTab === tab.id 
                  ? 'text-emerald-400 border-b-2 border-emerald-500' 
                  : 'text-white/50 hover:text-white/80 border-b-2 border-transparent'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content - no accordions, direct sections */}
      <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-1">
          {mainTab === 'build' && (
            <>
              {/* Direct building list - integrated panel section */}
              <div className="editor-section-animate group relative border-b border-white/5 pb-5 mb-5">
                <h3 className="text-sm font-semibold text-white/90 mb-4 flex items-center gap-2">
                  <div className="w-1 h-4 bg-emerald-500/60 rounded-full"></div>
                  Buildings
                </h3>
                <BuildingList
                  batchConfig={batchConfig}
                  setBatchConfig={setBatchConfig}
                  hideBatchSliders
                  showSingleBuildingAddUI={SHOW_SINGLE_BUILDING_ADD_UI}
                />
              </div>

              {/* Batch/Subdivision options - integrated panel section */}
              <div className="editor-section-animate group relative border-b border-white/5 pb-5 mb-5">
                <h3 className="text-sm font-semibold text-white/90 mb-4 flex items-center gap-2">
                  <div className="w-1 h-4 bg-emerald-500/60 rounded-full"></div>
                  Quick Add
                </h3>
                <SubdivisionPanel />
              </div>
            </>
          )}

          {mainTab === 'impacts' && (
            <div className="editor-section-animate space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-white/[0.02] border-l-2 border-emerald-500/40 hover:bg-white/[0.04] transition-all duration-200">
                  <p className="text-[10px] text-white/30 uppercase tracking-wide mb-2">Congestion</p>
                  <p className="text-2xl font-bold text-white">{congestion}</p>
                </div>
                <div className="p-4 bg-white/[0.02] border-l-2 border-blue-500/40 hover:bg-white/[0.04] transition-all duration-200">
                  <p className="text-[10px] text-white/30 uppercase tracking-wide mb-2">Transit</p>
                  <p className="text-2xl font-bold text-white">{transitLoad}</p>
                </div>
                <div className="p-4 bg-white/[0.02] border-l-2 border-purple-500/40 hover:bg-white/[0.04] transition-all duration-200">
                  <p className="text-[10px] text-white/30 uppercase tracking-wide mb-2">Units</p>
                  <p className="text-2xl font-bold text-white">{units}</p>
                </div>
              </div>
            </div>
          )}

          {mainTab === 'report' && sceneRef && (
            <ReportTabContent sceneRef={sceneRef} />
          )}
          {mainTab === 'report' && !sceneRef && (
            <div className="py-8 text-center text-white/40 text-sm">
              <p>Export unavailable</p>
            </div>
          )}

          {/* Building settings (when a building is selected) - integrated panel */}
          {selectedBuilding && mainTab === 'build' && (
            <div className="pt-5 mt-5 border-t border-white/5">
              <h3 className="text-sm font-semibold text-white/90 mb-4 flex items-center gap-2">
                <div className="w-1 h-4 bg-amber-500/60 rounded-full"></div>
                {selectedBuilding.name}
              </h3>
              <div className="flex gap-1 mb-4">
                {SETTINGS_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 px-3 py-2 text-xs font-medium transition-all duration-200 ${
                      activeTab === tab.id 
                        ? 'bg-emerald-500/15 text-emerald-400 border-b-2 border-emerald-500' 
                        : 'text-white/50 hover:text-white/80 border-b-2 border-transparent'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="bg-white/[0.02] p-4 border-l-2 border-emerald-500/30">
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
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white transition-all duration-200"
                >
                  Reset building →
                </button>
              </div>
            </div>
          )}

          {!selectedBuilding && mainTab === 'build' && (
            <div className="py-12 text-center text-white/30 text-sm">
              <p className="font-medium text-white/40">No building selected</p>
              <p className="text-xs mt-1">Add or select a building to configure</p>
            </div>
          )}
      </div>
    </div>
  );
}

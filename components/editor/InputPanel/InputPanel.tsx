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
import { exportMultiBuildingsToGLB, exportMultiBuildingsToJSON, copyMultiBuildingsToClipboard, exportToMap } from '@/lib/editor/utils/exportUtils';
import { ChevronDown, ChevronRight, Building2, BarChart3, FileText, Download, Copy, MapPin } from 'lucide-react';

type SettingsTab = 'transform' | 'dimensions' | 'textures' | 'windows';
type MainTab = 'build' | 'impacts' | 'report';

const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: 'transform', label: 'Transform' },
  { id: 'dimensions', label: 'Dimensions' },
  { id: 'textures', label: 'Textures' },
  { id: 'windows', label: 'Windows' },
];

const MAIN_TABS: { id: MainTab; label: string; icon: React.ReactNode }[] = [
  { id: 'build', label: 'Build', icon: <Building2 size={16} /> },
  { id: 'impacts', label: 'Impacts', icon: <BarChart3 size={16} /> },
  { id: 'report', label: 'Report', icon: <FileText size={16} /> },
];

// Removed accordion - using direct sections instead for simpler flow

interface ReportTabContentProps {
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
}

function ReportTabContent({ sceneRef }: ReportTabContentProps) {
  const { buildings } = useBuildings();
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [exportingToMap, setExportingToMap] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExportGLB = async () => {
    if (!sceneRef.current) {
      alert('Scene not ready for export');
      return;
    }
    setExporting(true);
    try {
      await exportMultiBuildingsToGLB(sceneRef.current);
      alert(`Exported ${buildings.length} building${buildings.length !== 1 ? 's' : ''} as GLB`);
    } catch (e) {
      console.error(e);
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSON = () => {
    exportMultiBuildingsToJSON(buildings);
  };

  const handleCopyJSON = async () => {
    try {
      await copyMultiBuildingsToClipboard(buildings);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Copy failed');
    }
  };

  const handleExportToMap = async () => {
    if (!sceneRef.current || buildings.length === 0) {
      alert(buildings.length === 0 ? 'Create a building first' : 'Scene not ready');
      return;
    }
    setExportingToMap(true);
    try {
      const { id } = await exportToMap(sceneRef.current, 'custom-building');
      router.push(`/map?buildingId=${id}`);
    } catch (e) {
      console.error(e);
      alert('Export to map failed');
      setExportingToMap(false);
    }
  };

  return (
    <div className="editor-section-animate group relative rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 space-y-3 transition-all duration-300 hover:border-emerald-500/40 hover:bg-white/8 hover:shadow-lg hover:shadow-emerald-500/10">
      {/* Corner brackets on hover */}
      <div className="absolute top-3 left-3 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute top-0 left-0 w-4 h-0.5 bg-emerald-500" />
        <div className="absolute top-0 left-0 w-0.5 h-4 bg-emerald-500" />
      </div>
      <div className="absolute bottom-3 right-3 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute bottom-0 right-0 w-4 h-0.5 bg-emerald-500" />
        <div className="absolute bottom-0 right-0 w-0.5 h-4 bg-emerald-500" />
      </div>
      
      <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors duration-300">Export &amp; report</h3>
      <p className="text-xs text-white/60">
        {buildings.length} building{buildings.length !== 1 ? 's' : ''} in scene
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExportGLB}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/10 text-white hover:bg-white/20 border border-white/20 disabled:opacity-60 transition-all"
        >
          <Download size={14} />
          {exporting ? 'Exporting…' : 'Download GLB'}
        </button>
        <button
          type="button"
          onClick={handleExportJSON}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-white/80 hover:bg-white/10 border border-white/10 transition-all"
        >
          <Download size={14} />
          JSON
        </button>
        <button
          type="button"
          onClick={handleCopyJSON}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-white/80 hover:bg-white/10 border border-white/10 transition-all"
        >
          <Copy size={14} />
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
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

  const units = buildings.length;
  const congestion = '—';
  const transitLoad = '—';

  return (
    <div className="w-full flex flex-col min-h-0">
      {/* Main tabs - dark theme */}
      <div className="shrink-0 mb-4">
        <div className="flex gap-1 p-1 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id)}
              className={`group relative flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-md text-sm font-medium transition-all duration-300 ${
                mainTab === tab.id 
                  ? 'bg-emerald-500/20 text-emerald-400 shadow-lg border border-emerald-500/40' 
                  : 'text-white/60 hover:bg-white/10 hover:text-white hover:border-white/20 border border-transparent'
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
              {/* Direct building list - no accordion */}
              <div className="editor-section-animate group relative rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 space-y-3 transition-all duration-300 hover:border-emerald-500/40 hover:bg-white/8 hover:shadow-lg hover:shadow-emerald-500/10">
                {/* Corner brackets on hover */}
                <div className="absolute top-3 left-3 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute top-0 left-0 w-4 h-0.5 bg-emerald-500" />
                  <div className="absolute top-0 left-0 w-0.5 h-4 bg-emerald-500" />
                </div>
                <div className="absolute bottom-3 right-3 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 right-0 w-4 h-0.5 bg-emerald-500" />
                  <div className="absolute bottom-0 right-0 w-0.5 h-4 bg-emerald-500" />
                </div>
                
                <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors duration-300">Buildings</h3>
                <BuildingList
                  batchConfig={batchConfig}
                  setBatchConfig={setBatchConfig}
                  hideBatchSliders
                />
              </div>

              {/* Batch/Subdivision options */}
              <div className="editor-section-animate group relative rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 space-y-3 transition-all duration-300 hover:border-emerald-500/40 hover:bg-white/8 hover:shadow-lg hover:shadow-emerald-500/10">
                {/* Corner brackets on hover */}
                <div className="absolute top-3 left-3 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute top-0 left-0 w-4 h-0.5 bg-emerald-500" />
                  <div className="absolute top-0 left-0 w-0.5 h-4 bg-emerald-500" />
                </div>
                <div className="absolute bottom-3 right-3 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 right-0 w-4 h-0.5 bg-emerald-500" />
                  <div className="absolute bottom-0 right-0 w-0.5 h-4 bg-emerald-500" />
                </div>
                
                <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors duration-300">Quick Add</h3>
                <SubdivisionPanel />
              </div>
            </>
          )}

          {mainTab === 'impacts' && (
            <div className="editor-section-animate group relative rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 space-y-3 transition-all duration-300 hover:border-emerald-500/40 hover:bg-white/8 hover:shadow-lg hover:shadow-emerald-500/10">
              {/* Corner brackets on hover */}
              <div className="absolute top-3 left-3 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute top-0 left-0 w-4 h-0.5 bg-emerald-500" />
                <div className="absolute top-0 left-0 w-0.5 h-4 bg-emerald-500" />
              </div>
              <div className="absolute bottom-3 right-3 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 right-0 w-4 h-0.5 bg-emerald-500" />
                <div className="absolute bottom-0 right-0 w-0.5 h-4 bg-emerald-500" />
              </div>
              
              <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors duration-300">Live metrics</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 hover:border-emerald-500/30 hover:bg-white/8 transition-all duration-200">
                  <p className="text-[10px] text-white/50 uppercase tracking-wide">Congestion</p>
                  <p className="text-sm font-semibold text-white">{congestion}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 hover:border-emerald-500/30 hover:bg-white/8 transition-all duration-200">
                  <p className="text-[10px] text-white/50 uppercase tracking-wide">Transit load</p>
                  <p className="text-sm font-semibold text-white">{transitLoad}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 hover:border-emerald-500/30 hover:bg-white/8 transition-all duration-200">
                  <p className="text-[10px] text-white/50 uppercase tracking-wide">Units</p>
                  <p className="text-sm font-semibold text-white">{units}</p>
                </div>
              </div>
            </div>
          )}

          {mainTab === 'report' && sceneRef && (
            <ReportTabContent sceneRef={sceneRef} />
          )}
          {mainTab === 'report' && !sceneRef && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">Export unavailable</div>
          )}

          {/* Building settings (when a building is selected) - dark theme */}
          {selectedBuilding && mainTab === 'build' && (
            <div className="pt-4 border-t border-white/10">
              <h3 className="text-sm font-semibold text-white mb-3">{selectedBuilding.name}</h3>
              <div className="flex gap-1 p-1 bg-white/5 backdrop-blur-sm rounded-lg mb-3 border border-white/10">
                {SETTINGS_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all duration-300 ${
                      activeTab === tab.id 
                        ? 'bg-emerald-500/20 text-emerald-400 shadow-lg border border-emerald-500/40' 
                        : 'text-white/60 hover:bg-white/10 hover:text-white hover:border-white/20 border border-transparent'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="group relative bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10 transition-all duration-300 hover:border-emerald-500/40 hover:bg-white/8 hover:shadow-lg hover:shadow-emerald-500/10">
                {/* Corner brackets on hover */}
                <div className="absolute top-3 left-3 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute top-0 left-0 w-4 h-0.5 bg-emerald-500" />
                  <div className="absolute top-0 left-0 w-0.5 h-4 bg-emerald-500" />
                </div>
                <div className="absolute bottom-3 right-3 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 right-0 w-4 h-0.5 bg-emerald-500" />
                  <div className="absolute bottom-0 right-0 w-0.5 h-4 bg-emerald-500" />
                </div>
                
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
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-white/80 hover:bg-white/10 hover:text-emerald-400 border border-white/10 hover:border-emerald-500/40 transition-all duration-200"
                >
                  Reset building
                </button>
              </div>
            </div>
          )}

          {!selectedBuilding && mainTab === 'build' && (
            <div className="py-6 text-center bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 text-white/60 text-sm">
              <p className="font-medium">No building selected</p>
              <p className="text-xs text-white/40 mt-1">Add a building or select one in the list</p>
            </div>
          )}
      </div>
    </div>
  );
}

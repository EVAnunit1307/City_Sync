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
    <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white/90 shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-semibold text-slate-800 bg-slate-50/80 hover:bg-slate-100/80 transition-colors"
      >
        <span>{title}</span>
        {open ? <ChevronDown size={18} className="text-slate-500" /> : <ChevronRight size={18} className="text-slate-500" />}
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

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
    <div className="rounded-xl border border-slate-200/80 bg-white/90 p-4 space-y-3 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800">Export &amp; report</h3>
      <p className="text-xs text-slate-500">
        {buildings.length} building{buildings.length !== 1 ? 's' : ''} in scene
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExportGLB}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-60"
        >
          <Download size={14} />
          {exporting ? 'Exporting…' : 'Download GLB'}
        </button>
        <button
          type="button"
          onClick={handleExportJSON}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
        >
          <Download size={14} />
          JSON
        </button>
        <button
          type="button"
          onClick={handleCopyJSON}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
        >
          <Copy size={14} />
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
        <button
          type="button"
          onClick={handleExportToMap}
          disabled={exportingToMap}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
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
      {/* Main tabs */}
      <div className="shrink-0 mb-3">
        <div className="flex gap-1 p-1 bg-slate-100/80 rounded-lg">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-sm font-medium transition-colors ${
                mainTab === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 space-y-4">
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
            <div className="rounded-xl border border-slate-200/80 bg-white/90 p-4 space-y-3 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800">Live metrics</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-100">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Congestion</p>
                  <p className="text-sm font-semibold text-slate-800">{congestion}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-100">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Transit load</p>
                  <p className="text-sm font-semibold text-slate-800">{transitLoad}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-100">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">Units</p>
                  <p className="text-sm font-semibold text-slate-800">{units}</p>
                </div>
              </div>
            </div>
          )}

          {mainTab === 'report' && sceneRef && (
            <ReportTabContent sceneRef={sceneRef} />
          )}
          {mainTab === 'report' && !sceneRef && (
            <div className="rounded-xl border border-slate-200/80 bg-white/90 p-4 text-sm text-slate-500">Export unavailable</div>
          )}

          {/* Building settings (when a building is selected) */}
          {selectedBuilding && mainTab === 'build' && (
            <div className="pt-4 border-t border-slate-200/80">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">{selectedBuilding.name}</h3>
              <div className="flex gap-1 p-1 bg-slate-100/80 rounded-lg mb-3">
                {SETTINGS_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
                      activeTab === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-200/80'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="bg-white/90 p-4 rounded-xl border border-slate-200/80 shadow-sm">
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
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                >
                  Reset building
                </button>
              </div>
            </div>
          )}

          {!selectedBuilding && mainTab === 'build' && (
            <div className="py-6 text-center bg-white/90 rounded-xl border border-slate-200/80 text-slate-600 text-sm">
              <p className="font-medium">No building selected</p>
              <p className="text-xs text-slate-500 mt-1">Add a building or select one in the list</p>
            </div>
          )}
      </div>
    </div>
  );
}

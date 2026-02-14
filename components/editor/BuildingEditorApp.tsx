'use client';

import React, { useRef, useMemo } from 'react';
import Link from 'next/link';
import * as THREE from 'three';
import { BuildingsProvider, useBuildings } from '@/lib/editor/contexts/BuildingsContext';
import { InputPanel } from '@/components/editor/InputPanel/InputPanel';
import { Scene } from '@/components/editor/Viewport/Scene';
import { EditorDrawer } from '@/components/editor/EditorDrawer';
import { PlacementToast } from '@/components/editor/PlacementToast';
import { VoiceDesign } from '@/components/editor/InputPanel/VoiceDesign';

function EditorLayout() {
  const sceneRef = useRef<THREE.Scene | null>(null);
  const {
    placementMode,
    setPlacementMode,
    batchPlacementConfig,
    setBatchPlacementConfig,
  } = useBuildings();

  const modeLabel = useMemo(() => {
    if (batchPlacementConfig) return 'Placing: Subdivision';
    if (placementMode) return 'Placing: Single';
    return 'Ready';
  }, [placementMode, batchPlacementConfig]);

  const drawerActions = useMemo(
    () => (
      <>
        {placementMode && (
          <button
            type="button"
            onClick={() => setPlacementMode(false)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-200 text-slate-700 hover:bg-slate-300"
          >
            Cancel
          </button>
        )}
        {batchPlacementConfig !== null && (
          <button
            type="button"
            onClick={() => setBatchPlacementConfig(null)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-200 text-slate-700 hover:bg-slate-300"
          >
            Clear
          </button>
        )}
      </>
    ),
    [placementMode, batchPlacementConfig, setPlacementMode, setBatchPlacementConfig]
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100">
      {/* Minimal top bar */}
      <header className="shrink-0 z-10 flex items-center justify-between px-4 py-2 bg-white/90 backdrop-blur-sm border-b border-slate-200/80">
        <h1 className="text-sm font-semibold text-slate-800">3D Building Editor</h1>
        <Link
          href="/"
          className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          ← Back to Map
        </Link>
      </header>

      {/* Full-width 3D viewport */}
      <div className="flex-1 min-h-0 relative">
        <Scene sceneRef={sceneRef} />

        {/* Placement legend (top-left) */}
        <div
          className="absolute left-3 top-3 z-10 flex flex-col gap-1.5 rounded-lg bg-white/85 backdrop-blur-sm border border-slate-200/80 px-3 py-2 shadow-sm text-[10px] font-medium text-slate-600"
          aria-hidden
        >
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500/80" />
            Valid
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded bg-red-500/80" />
            Invalid
          </span>
        </div>
      </div>

      {/* Bottom drawer with panel content */}
      <EditorDrawer title="Editor" modeLabel={modeLabel} actions={drawerActions}>
        <InputPanel sceneRef={sceneRef} />
      </EditorDrawer>

      <PlacementToast />
      <VoiceDesign />
    </div>
  );
}

export default function BuildingEditorApp() {
  return (
    <BuildingsProvider>
      <EditorLayout />
    </BuildingsProvider>
  );
}

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
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-white hover:bg-white/20 border border-white/20 transition-all"
          >
            Cancel
          </button>
        )}
        {batchPlacementConfig !== null && (
          <button
            type="button"
            onClick={() => setBatchPlacementConfig(null)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-white hover:bg-white/20 border border-white/20 transition-all"
          >
            Clear
          </button>
        )}
      </>
    ),
    [placementMode, batchPlacementConfig, setPlacementMode, setBatchPlacementConfig]
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gradient-to-b from-[#0a0a0a] to-[#1a1a1a]">
      {/* Dark minimal top bar */}
      <header className="shrink-0 z-10 flex items-center justify-between px-6 py-3 bg-black/40 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-white tracking-tight">3D Building Editor</h1>
          <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            {modeLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {drawerActions}
          <Link
            href="/"
            className="text-sm font-medium text-white/70 hover:text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-all"
          >
            ← Home
          </Link>
        </div>
      </header>

      {/* Main content area with viewport and right sidebar */}
      <div className="flex flex-1 min-h-0">
        {/* 3D viewport */}
        <div className="flex-1 relative">
          <Scene sceneRef={sceneRef} />

          {/* Placement legend (top-left) - dark theme */}
          <div
            className="absolute left-4 top-4 z-10 flex flex-col gap-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 px-4 py-3 shadow-xl"
            aria-hidden
          >
            <span className="flex items-center gap-2 text-xs font-medium text-white/80">
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              Valid
            </span>
            <span className="flex items-center gap-2 text-xs font-medium text-white/80">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              Invalid
            </span>
          </div>
        </div>

        {/* Right sidebar panel */}
        <div className="w-full md:w-96 shrink-0 border-l border-white/10 bg-black/30 backdrop-blur-md overflow-y-auto shadow-2xl editor-sidebar-scroll">
          <div className="sticky top-0 z-10 px-6 py-5 bg-black/60 backdrop-blur-xl border-b border-white/10 shadow-lg">
            <h2 className="text-xl font-bold text-white tracking-tight">Editor Panel</h2>
            <p className="text-xs text-white/60 mt-1">Configure your buildings and view impacts</p>
          </div>
          <div className="p-6 pb-32 animate-in fade-in duration-300">
            <InputPanel sceneRef={sceneRef} />
          </div>
        </div>
      </div>

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

'use client';

import React, { useEffect } from 'react';
import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';

const TOAST_DURATION_MS = 4000;

export function PlacementToast() {
  const { placementMessage, setPlacementMessage } = useBuildings();

  useEffect(() => {
    if (!placementMessage) return;
    const t = setTimeout(() => setPlacementMessage(null), TOAST_DURATION_MS);
    return () => clearTimeout(t);
  }, [placementMessage, setPlacementMessage]);

  if (!placementMessage) return null;

  return (
    <div
      className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-xl bg-black/85 backdrop-blur-md text-white text-sm font-medium max-w-md text-center border border-white/20"
      role="alert"
    >
      {placementMessage}
    </div>
  );
}

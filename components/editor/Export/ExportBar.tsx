import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';
import { useBuildings } from '@/lib/editor/contexts/BuildingsContext';
import { exportToMap } from '@/lib/editor/utils/exportUtils';

interface ExportBarProps {
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
}

export function ExportBar({ sceneRef }: ExportBarProps) {
  const { buildings } = useBuildings();
  const router = useRouter();
  const [exportingToMap, setExportingToMap] = useState(false);

  const handleExportToMap = async () => {
    if (!sceneRef.current) {
      alert('Scene not ready for export');
      return;
    }

    if (buildings.length === 0) {
      alert('No buildings to export. Create a building first!');
      return;
    }

    setExportingToMap(true);
    try {
      const { id } = await exportToMap(sceneRef.current, 'custom-building');
      // Navigate to map with the building ID
      router.push(`/map?buildingId=${id}`);
    } catch (error) {
      console.error('Export to map failed:', error);
      alert('Failed to export to map. Check console for details.');
      setExportingToMap(false);
    }
  };

  return (
    <div className="w-full bg-gray-800 text-white p-4 border-t border-gray-700">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="text-sm">
          <span className="font-semibold">Export Options</span>
          <span className="ml-3 text-gray-400">
            {buildings.length} building{buildings.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleExportToMap}
            disabled={exportingToMap}
            className="px-5 py-2.5 rounded-full font-medium text-sm border-2 bg-gradient-to-r from-orange-500 to-amber-500 border-orange-400 text-white hover:from-orange-600 hover:to-amber-600 hover:shadow-[0_8px_25px_-5px_rgba(249,115,22,0.5)] hover:-translate-y-0.5 active:translate-y-0 disabled:from-gray-600 disabled:to-gray-600 disabled:border-gray-500 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-200 ease-out"
          >
            {exportingToMap ? 'Exporting...' : 'Export to Map →'}
          </button>
        </div>
      </div>
    </div>
  );
}

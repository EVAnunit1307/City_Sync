"use client";

import { useState, useEffect } from "react";
import { X, Building2, AlertTriangle } from "lucide-react";
import { MARKHAM_ZONE_TYPES, type MarkhamZoneCode } from "@/lib/markhamZoning";
import {
  fetchZoneAtPoint,
  getZoneCompatibilityWarning,
} from "@/lib/zoneCompatibility";

export interface BuildingPlacementDetails {
  zoneType: MarkhamZoneCode;
}

interface BuildingPlacementFormProps {
  lat: number;
  lng: number;
  onSubmit: (details: BuildingPlacementDetails) => void;
  onCancel: () => void;
}

export function BuildingPlacementForm({
  lat,
  lng,
  onSubmit,
  onCancel,
}: BuildingPlacementFormProps) {
  const [zoneType, setZoneType] = useState<MarkhamZoneCode>("MU1");
  const [officialPlanZone, setOfficialPlanZone] = useState<string | null>(null);
  const [zoneLoading, setZoneLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) setZoneLoading(true);
    });
    fetchZoneAtPoint(lat, lng)
      .then((code) => {
        if (!cancelled) setOfficialPlanZone(code);
      })
      .catch(() => {
        if (!cancelled) setOfficialPlanZone(null);
      })
      .finally(() => {
        if (!cancelled) setZoneLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  const zoneWarning = getZoneCompatibilityWarning(officialPlanZone, zoneType);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ zoneType });
  };

  const categories = [...new Set(MARKHAM_ZONE_TYPES.map((z) => z.category))];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-slate-900 text-slate-100 rounded-xl shadow-2xl border border-slate-700 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="text-accent-blue" size={20} />
            <h2 className="text-base font-black text-slate-100 uppercase tracking-tight">
              Building Details
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Zone at location */}
          {!zoneLoading && officialPlanZone && (
            <div className="text-[10px] text-slate-400">
              <span className="font-bold uppercase">Official Plan zone at this location:</span>{" "}
              {officialPlanZone}
            </div>
          )}

          {/* Zone Type */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">
              Markham Zoning Type (building use)
            </label>
            <select
              value={zoneType}
              onChange={(e) => setZoneType(e.target.value as MarkhamZoneCode)}
              className="w-full px-3 py-2.5 text-sm text-slate-100 border border-slate-600 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-accent-blue bg-slate-800"
            >
              {categories.map((cat) => (
                <optgroup key={cat} label={cat}>
                  {MARKHAM_ZONE_TYPES.filter((z) => z.category === cat).map(
                    (z) => (
                      <option key={z.code} value={z.code}>
                        {z.code} - {z.name}
                      </option>
                    )
                  )}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Zone compatibility warning */}
          {zoneWarning && (
            <div className="flex gap-3 p-3 rounded-lg bg-amber-900/40 border border-amber-700">
              <AlertTriangle className="shrink-0 text-amber-400" size={20} />
              <div>
                <p className="text-sm font-bold text-amber-300">Zone compatibility warning</p>
                <p className="text-xs text-amber-400 mt-0.5">{zoneWarning}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-800 transition-colors uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors uppercase"
            >
              Place Building
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

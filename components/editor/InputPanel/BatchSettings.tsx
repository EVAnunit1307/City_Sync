'use client';

import type { BatchConfig, BatchMix } from '@/lib/editor/utils/buildingCluster';

function normalizeMix(mix: BatchMix, changedKey: keyof BatchMix, newValue: number): BatchMix {
  const clamped = Math.max(0, Math.min(100, Math.round(newValue)));
  const rest = 100 - clamped;
  const keys: (keyof BatchMix)[] = ['detachedPct', 'townhousePct', 'midrisePct'];
  const others = keys.filter((k) => k !== changedKey);
  const next: BatchMix = { ...mix, [changedKey]: clamped };
  if (rest <= 0) {
    others.forEach((k) => (next[k] = 0));
    return next;
  }
  const sumOthers = others.reduce((s, k) => s + mix[k], 0);
  if (sumOthers <= 0) {
    const per = Math.floor(rest / others.length);
    others.forEach((k, i) => (next[k] = i === others.length - 1 ? rest - per * (others.length - 1) : per));
  } else {
    const [a, b] = others;
    const pa = mix[a] / sumOthers;
    next[a] = Math.round(rest * pa);
    next[b] = rest - next[a];
  }
  const total = next.detachedPct + next.townhousePct + next.midrisePct;
  if (total !== 100) {
    const largest = (['detachedPct', 'townhousePct', 'midrisePct'] as const).sort((a, b) => next[b] - next[a])[0];
    next[largest] = next[largest] + (100 - total);
  }
  return next;
}

export interface BatchSettingsProps {
  batchConfig: BatchConfig;
  setBatchConfig: React.Dispatch<React.SetStateAction<BatchConfig>>;
}

export function BatchSettings({ batchConfig, setBatchConfig }: BatchSettingsProps) {
  const setMix = (key: keyof BatchMix, value: number) => {
    setBatchConfig((prev) => ({
      ...prev,
      mix: normalizeMix(prev.mix, key, value),
    }));
  };

  return (
    <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs text-emerald-800">Total Buildings</label>
          <span className="text-xs font-medium text-emerald-700 tabular-nums">{batchConfig.totalBuildings}</span>
        </div>
        <input
          type="range"
          min={5}
          max={100}
          step={1}
          value={batchConfig.totalBuildings}
          onChange={(e) => setBatchConfig((c) => ({ ...c, totalBuildings: parseInt(e.target.value, 10) }))}
          className="w-full h-2 rounded-full appearance-none bg-emerald-200 accent-emerald-600"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs text-emerald-800">Spacing (m)</label>
          <span className="text-xs font-medium text-emerald-700 tabular-nums">{batchConfig.spacing}</span>
        </div>
        <input
          type="range"
          min={4}
          max={20}
          step={1}
          value={batchConfig.spacing}
          onChange={(e) => setBatchConfig((c) => ({ ...c, spacing: parseInt(e.target.value, 10) }))}
          className="w-full h-2 rounded-full appearance-none bg-emerald-200 accent-emerald-600"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs text-emerald-800">Footprint (compact ↔ spread)</label>
          <span className="text-xs font-medium text-emerald-700 tabular-nums">{batchConfig.footprintScale.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={0.6}
          max={2}
          step={0.1}
          value={batchConfig.footprintScale}
          onChange={(e) => setBatchConfig((c) => ({ ...c, footprintScale: parseFloat(e.target.value) }))}
          className="w-full h-2 rounded-full appearance-none bg-emerald-200 accent-emerald-600"
        />
      </div>
      <div className="pt-1 border-t border-emerald-200/80">
        <p className="text-xs text-emerald-800 font-medium mb-2">Housing mix (sum = 100%)</p>
        <div className="space-y-2">
          {(['detachedPct', 'townhousePct', 'midrisePct'] as const).map((key) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs text-emerald-800">
                  {key === 'detachedPct' ? 'Detached' : key === 'townhousePct' ? 'Townhouses' : 'Mid-rise'}
                </label>
                <span className="text-xs font-medium text-emerald-700 tabular-nums w-8">{batchConfig.mix[key]}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={batchConfig.mix[key]}
                onChange={(e) => setMix(key, parseInt(e.target.value, 10))}
                className="w-full h-2 rounded-full appearance-none bg-emerald-200 accent-emerald-600"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

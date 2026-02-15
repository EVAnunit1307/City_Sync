/**
 * Finance & Execution estimator for subdivision scenarios (Markham).
 * Rules-based; all numbers from constants below. No AI-generated figures.
 */

const M2_PER_ACRE = 4046.8564224;

/** Land area (m²) per unit by type: [low, high] */
export const LAND_PER_UNIT_M2 = {
  Detached: [350, 550],
  Townhouse: [120, 220],
  "Mid-rise": [40, 80],
} as const;

/** Configurable: $ CAD per acre (Markham proxy) */
export const LAND_COST_PER_ACRE_CAD = {
  low: 2_000_000,
  high: 8_000_000,
} as const;

/** Construction cost per unit ($ CAD): [low, high] by type */
export const CONSTRUCTION_COST_PER_UNIT_CAD = {
  Detached: [450_000, 900_000],
  Townhouse: [350_000, 700_000],
  "Mid-rise": [300_000, 600_000],
} as const;

/** Soft costs as fraction of construction subtotal */
export const SOFT_COSTS_FRACTION = 0.2;
/** Contingency as fraction of (land + construction + soft) */
export const CONTINGENCY_FRACTION = 0.1;

/** Timeline: approvals/design months [low, high] */
const PHASE_APPROVALS_MONTHS: [number, number] = [6, 12];
/** Servicing/site works [low, high] */
const PHASE_SERVICING_MONTHS: [number, number] = [4, 10];
/** Closeout [low, high] */
const PHASE_CLOSEOUT_MONTHS: [number, number] = [2, 4];
/** Low-rise throughput: units per month [low, high] */
const LOW_RISE_UNITS_PER_MONTH: [number, number] = [6, 10];
/** Mid-rise: additional months per “tower” proxy (or per N units) */
const MIDRISE_MONTHS_PER_BLOCK = 18;
const MIDRISE_UNITS_PER_BLOCK = 80;

export interface FinanceExecutionInput {
  /** Total dwelling units */
  unitCount: number;
  /** Optional: explicit counts by type. If omitted, default mix is applied (40% detached, 35% townhouse, 25% mid-rise). */
  detached?: number;
  townhouse?: number;
  midrise?: number;
  /** Optional: known site area in m²; if provided, land.required_area_m2 uses this instead of computed */
  parcelAreaM2?: number;
}

export interface FinanceExecutionOutput {
  land: {
    required_area_m2: number;
    required_area_acres: number;
    cost_range_cad: { low: number; high: number };
    assumptions: string[];
  };
  construction: {
    cost_range_cad: { low: number; high: number };
    breakdown: Array<{
      type: "Detached" | "Townhouse" | "Mid-rise";
      units: number;
      cost_per_unit_low: number;
      cost_per_unit_high: number;
      subtotal_low: number;
      subtotal_high: number;
    }>;
    assumptions: string[];
  };
  total_project_cost: {
    low: number;
    high: number;
    includes: string[];
  };
  execution_timeline: {
    estimated_months_low: number;
    estimated_months_high: number;
    phases: Array<{ name: string; months: number }>;
    assumptions: string[];
  };
}

function defaultMix(unitCount: number): { detached: number; townhouse: number; midrise: number } {
  const detached = Math.round(unitCount * 0.4);
  const townhouse = Math.round(unitCount * 0.35);
  const midrise = Math.max(0, unitCount - detached - townhouse);
  return { detached, townhouse, midrise };
}

export function estimateFinanceExecution(input: FinanceExecutionInput): FinanceExecutionOutput {
  const { unitCount, parcelAreaM2 } = input;
  const detached = input.detached ?? defaultMix(unitCount).detached;
  const townhouse = input.townhouse ?? defaultMix(unitCount).townhouse;
  const midrise = input.midrise ?? defaultMix(unitCount).midrise;

  const totalFromMix = detached + townhouse + midrise;
  const scale = totalFromMix > 0 ? unitCount / totalFromMix : 1;
  const d = Math.round(detached * scale);
  const t = Math.round(townhouse * scale);
  const m = Math.max(0, unitCount - d - t);

  // --- Land ---
  const landLowM2 =
    d * LAND_PER_UNIT_M2.Detached[0] +
    t * LAND_PER_UNIT_M2.Townhouse[0] +
    m * LAND_PER_UNIT_M2["Mid-rise"][0];
  const landHighM2 =
    d * LAND_PER_UNIT_M2.Detached[1] +
    t * LAND_PER_UNIT_M2.Townhouse[1] +
    m * LAND_PER_UNIT_M2["Mid-rise"][1];
  const required_area_m2 = parcelAreaM2 ?? (landLowM2 + landHighM2) / 2;
  const required_area_acres = required_area_m2 / M2_PER_ACRE;
  const landCostLow = required_area_acres * LAND_COST_PER_ACRE_CAD.low;
  const landCostHigh = required_area_acres * LAND_COST_PER_ACRE_CAD.high;

  const landAssumptions = [
    `Land per unit: Detached ${LAND_PER_UNIT_M2.Detached[0]}-${LAND_PER_UNIT_M2.Detached[1]} m², Townhouse ${LAND_PER_UNIT_M2.Townhouse[0]}-${LAND_PER_UNIT_M2.Townhouse[1]} m², Mid-rise ${LAND_PER_UNIT_M2["Mid-rise"][0]}-${LAND_PER_UNIT_M2["Mid-rise"][1]} m² (incl. roads/share).`,
    `Markham land: $${(LAND_COST_PER_ACRE_CAD.low / 1_000_000).toFixed(1)}M–$${(LAND_COST_PER_ACRE_CAD.high / 1_000_000).toFixed(1)}M CAD per acre (proxy).`,
  ];
  if (parcelAreaM2 != null) {
    landAssumptions.push("Required area uses provided parcel/site area.");
  }

  // --- Construction breakdown ---
  const breakdown: FinanceExecutionOutput["construction"]["breakdown"] = [
    {
      type: "Detached",
      units: d,
      cost_per_unit_low: CONSTRUCTION_COST_PER_UNIT_CAD.Detached[0],
      cost_per_unit_high: CONSTRUCTION_COST_PER_UNIT_CAD.Detached[1],
      subtotal_low: d * CONSTRUCTION_COST_PER_UNIT_CAD.Detached[0],
      subtotal_high: d * CONSTRUCTION_COST_PER_UNIT_CAD.Detached[1],
    },
    {
      type: "Townhouse",
      units: t,
      cost_per_unit_low: CONSTRUCTION_COST_PER_UNIT_CAD.Townhouse[0],
      cost_per_unit_high: CONSTRUCTION_COST_PER_UNIT_CAD.Townhouse[1],
      subtotal_low: t * CONSTRUCTION_COST_PER_UNIT_CAD.Townhouse[0],
      subtotal_high: t * CONSTRUCTION_COST_PER_UNIT_CAD.Townhouse[1],
    },
    {
      type: "Mid-rise",
      units: m,
      cost_per_unit_low: CONSTRUCTION_COST_PER_UNIT_CAD["Mid-rise"][0],
      cost_per_unit_high: CONSTRUCTION_COST_PER_UNIT_CAD["Mid-rise"][1],
      subtotal_low: m * CONSTRUCTION_COST_PER_UNIT_CAD["Mid-rise"][0],
      subtotal_high: m * CONSTRUCTION_COST_PER_UNIT_CAD["Mid-rise"][1],
    },
  ];
  const constructionLow = breakdown.reduce((s, row) => s + row.subtotal_low, 0);
  const constructionHigh = breakdown.reduce((s, row) => s + row.subtotal_high, 0);
  const softLow = constructionLow * SOFT_COSTS_FRACTION;
  const softHigh = constructionHigh * SOFT_COSTS_FRACTION;
  const constructionAssumptions = [
    `Per-unit construction: Detached $${CONSTRUCTION_COST_PER_UNIT_CAD.Detached[0] / 1000}k–$${CONSTRUCTION_COST_PER_UNIT_CAD.Detached[1] / 1000}k, Townhouse $${CONSTRUCTION_COST_PER_UNIT_CAD.Townhouse[0] / 1000}k–$${CONSTRUCTION_COST_PER_UNIT_CAD.Townhouse[1] / 1000}k, Mid-rise $${CONSTRUCTION_COST_PER_UNIT_CAD["Mid-rise"][0] / 1000}k–$${CONSTRUCTION_COST_PER_UNIT_CAD["Mid-rise"][1] / 1000}k CAD (proxy).`,
    `Soft costs: ${SOFT_COSTS_FRACTION * 100}% of construction.`,
  ];

  // --- Total project cost (land + construction + soft + contingency) ---
  const beforeContingencyLow = landCostLow + constructionLow + softLow;
  const beforeContingencyHigh = landCostHigh + constructionHigh + softHigh;
  const totalLow = beforeContingencyLow * (1 + CONTINGENCY_FRACTION);
  const totalHigh = beforeContingencyHigh * (1 + CONTINGENCY_FRACTION);

  // --- Execution timeline ---
  const approvalsMonths = (PHASE_APPROVALS_MONTHS[0] + PHASE_APPROVALS_MONTHS[1]) / 2;
  const servicingMonths = (PHASE_SERVICING_MONTHS[0] + PHASE_SERVICING_MONTHS[1]) / 2;
  const lowRiseUnits = d + t;
  const lowRiseMonthsLow = lowRiseUnits / LOW_RISE_UNITS_PER_MONTH[1];
  const lowRiseMonthsHigh = lowRiseUnits / LOW_RISE_UNITS_PER_MONTH[0];
  const midriseBlocks = m > 0 ? Math.max(1, Math.ceil(m / MIDRISE_UNITS_PER_BLOCK)) : 0;
  const midriseMonths = midriseBlocks * MIDRISE_MONTHS_PER_BLOCK;
  const verticalLow = lowRiseUnits > 0 ? lowRiseMonthsLow : 0;
  const verticalHigh = (lowRiseUnits > 0 ? lowRiseMonthsHigh : 0) + midriseMonths;
  const closeoutMonths = (PHASE_CLOSEOUT_MONTHS[0] + PHASE_CLOSEOUT_MONTHS[1]) / 2;

  const phases = [
    { name: "Approvals & Design", months: Math.round(approvalsMonths) },
    { name: "Servicing & Site Works", months: Math.round(servicingMonths) },
    { name: "Vertical Construction", months: Math.round((verticalLow + verticalHigh) / 2) },
    { name: "Occupancy / Closeout", months: Math.round(closeoutMonths) },
  ];
  const estimated_months_low = Math.round(
    PHASE_APPROVALS_MONTHS[0] + PHASE_SERVICING_MONTHS[0] + verticalLow + PHASE_CLOSEOUT_MONTHS[0]
  );
  const estimated_months_high = Math.round(
    PHASE_APPROVALS_MONTHS[1] + PHASE_SERVICING_MONTHS[1] + verticalHigh + PHASE_CLOSEOUT_MONTHS[1]
  );
  const timelineAssumptions = [
    "Approvals & design 6–12 months; Servicing 4–10 months; Closeout 2–4 months.",
    "Low-rise (detached/townhouse): 6–10 units/month. Mid-rise: ~18 months per block (~80 units).",
  ];

  return {
    land: {
      required_area_m2: Math.round(required_area_m2),
      required_area_acres: Math.round(required_area_acres * 100) / 100,
      cost_range_cad: { low: Math.round(landCostLow), high: Math.round(landCostHigh) },
      assumptions: landAssumptions,
    },
    construction: {
      cost_range_cad: { low: Math.round(constructionLow), high: Math.round(constructionHigh) },
      breakdown,
      assumptions: constructionAssumptions,
    },
    total_project_cost: {
      low: Math.round(totalLow),
      high: Math.round(totalHigh),
      includes: ["land", "construction", "soft_costs_proxy", "contingency_proxy"],
    },
    execution_timeline: {
      estimated_months_low: estimated_months_low,
      estimated_months_high: estimated_months_high,
      phases,
      assumptions: timelineAssumptions,
    },
  };
}

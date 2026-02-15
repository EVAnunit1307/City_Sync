/**
 * Required Infrastructure List — deterministic, rules-based upgrades/mitigations
 * for GrowthSync Impact Report. No AI; uses same inputs as the report (scores + context).
 *
 * Example scenarios (for demo):
 * - trafficScore 72, no segment ratio => adds "Intersection Optimization + Turn Lanes" (Moderate)
 * - trafficScore 88 => adds both Intersection Optimization (Moderate) and Road Widening (Major)
 * - transitAccessibility 35 => adds "Add feeder route / new stops" (Moderate)
 * - infrastructureIndex 75 => adds "Local water/sewer capacity upgrade" (Moderate)
 * - financialScore 38 => adds "Adjust phasing / developer contributions" (Moderate)
 * - nearbyProjects.length > 0 => transportation upgrades get note "Coordinate staging with X project(s) nearby"
 */

export interface RequiredUpgrade {
  id: string;
  title: string;
  category: string;
  trigger: string;
  location: string;
  severity: 'Minor' | 'Moderate' | 'Major';
  expected_benefit: {
    traffic_score_delta: number;
    transit_accessibility_delta: number;
    infra_index_delta: number;
    financial_score_delta: number;
  };
  suggested_owner: string;
  notes: string;
}

export interface RequiredUpgradesOutput {
  required_upgrades: RequiredUpgrade[];
}

export interface RequiredUpgradesInput {
  /** 0–100 from report (Gemini) */
  trafficScore?: number;
  /** Optional: primary arterial segment load ratio; if > 1.2 or > 1.5 triggers transportation upgrades */
  keySegmentRatio?: number;
  /** 0–100 from report (Gemini) — high = high load / need frequency */
  transitLoadScore?: number;
  /** 0–100 from computed (transit accessibility) */
  transitAccessibilityScore?: number;
  /** 0–100 from report (Gemini) */
  infrastructureIndex?: number;
  /** 0–100 from report (Gemini) */
  financialScore?: number;
  /** Nearby projects within 5 km (for coordination note) */
  nearbyProjectsCount?: number;
  /** Matched corridor names for location text */
  matchedCorridors?: string[];
}

const DEFAULT_LOCATION = 'Site vicinity';

function locationFromCorridors(corridors: string[] | undefined): string {
  if (!corridors || corridors.length === 0) return DEFAULT_LOCATION;
  return corridors.slice(0, 3).join(', ') + ' corridor(s)';
}

/**
 * Build the Required Infrastructure List from impact metrics and context.
 * Deterministic: same inputs => same output. No Gemini.
 */
export function computeRequiredUpgrades(input: RequiredUpgradesInput): RequiredUpgradesOutput {
  const upgrades: RequiredUpgrade[] = [];
  const traffic = input.trafficScore ?? 0;
  const segmentRatio = input.keySegmentRatio ?? 0;
  const transitLoad = input.transitLoadScore ?? 0;
  const transitAccess = input.transitAccessibilityScore ?? 100;
  const infra = input.infrastructureIndex ?? 0;
  const financial = input.financialScore ?? 100;
  const nearbyCount = input.nearbyProjectsCount ?? 0;
  const corridors = input.matchedCorridors;
  const location = locationFromCorridors(corridors);
  const coordNote =
    nearbyCount > 0
      ? ` Coordinate staging with ${nearbyCount} active construction project(s) nearby.`
      : '';

  // --- Transportation ---
  if (traffic >= 70 || segmentRatio > 1.2) {
    upgrades.push({
      id: 'traffic_intersection_upgrade',
      title: 'Intersection Optimization + Turn Lanes',
      category: 'Transportation',
      trigger: 'Traffic congestion index exceeded threshold on primary arterial.',
      location,
      severity: 'Moderate',
      expected_benefit: {
        traffic_score_delta: 10,
        transit_accessibility_delta: 0,
        infra_index_delta: 0,
        financial_score_delta: 0,
      },
      suggested_owner: 'Developer/City shared',
      notes: `Signal timing + turning lane improvements.${coordNote}`,
    });
  }
  if (traffic >= 85 || segmentRatio > 1.5) {
    upgrades.push({
      id: 'traffic_road_widening',
      title: 'Road Widening / Additional access',
      category: 'Transportation',
      trigger: 'Traffic score or segment ratio indicates major capacity shortfall.',
      location,
      severity: 'Major',
      expected_benefit: {
        traffic_score_delta: 15,
        transit_accessibility_delta: 0,
        infra_index_delta: 0,
        financial_score_delta: -2,
      },
      suggested_owner: 'City / Region',
      notes: `Additional lanes or access points; coordinate with York Region.${coordNote}`,
    });
  }

  // --- Transit ---
  if (transitLoad >= 85) {
    upgrades.push({
      id: 'transit_frequency',
      title: 'Increase peak frequency on matched corridors',
      category: 'Transit',
      trigger: 'Transit load score indicates high demand on corridors.',
      location: locationFromCorridors(corridors),
      severity: 'Minor',
      expected_benefit: {
        traffic_score_delta: 0,
        transit_accessibility_delta: 5,
        infra_index_delta: 0,
        financial_score_delta: 0,
      },
      suggested_owner: 'YRT / Region',
      notes: 'Peak-hour frequency increase on existing routes.',
    });
  }
  if (transitAccess <= 40) {
    upgrades.push({
      id: 'transit_feeder',
      title: 'Add feeder route / new stops',
      category: 'Transit',
      trigger: 'Transit accessibility score below threshold; limited service near site.',
      location: locationFromCorridors(corridors),
      severity: 'Moderate',
      expected_benefit: {
        traffic_score_delta: 0,
        transit_accessibility_delta: 15,
        infra_index_delta: 0,
        financial_score_delta: 0,
      },
      suggested_owner: 'YRT / Developer contribution',
      notes: 'Feeder route or new stops to improve access.',
    });
  }

  // --- Infrastructure ---
  if (infra >= 70) {
    upgrades.push({
      id: 'infra_local_upgrade',
      title: 'Local water/sewer capacity upgrade (proxy)',
      category: 'Infrastructure',
      trigger: 'Infrastructure index indicates strain on local servicing.',
      location: DEFAULT_LOCATION,
      severity: 'Moderate',
      expected_benefit: {
        traffic_score_delta: 0,
        transit_accessibility_delta: 0,
        infra_index_delta: 10,
        financial_score_delta: 0,
      },
      suggested_owner: 'City / Developer',
      notes: 'Confirm capacity with municipal servicing; upgrade if needed.',
    });
  }
  if (infra >= 85) {
    upgrades.push({
      id: 'infra_major_upgrade',
      title: 'Major servicing upgrade + stormwater storage requirement',
      category: 'Infrastructure',
      trigger: 'Infrastructure index indicates major servicing shortfall.',
      location: DEFAULT_LOCATION,
      severity: 'Major',
      expected_benefit: {
        traffic_score_delta: 0,
        transit_accessibility_delta: 0,
        infra_index_delta: 15,
        financial_score_delta: -5,
      },
      suggested_owner: 'City / Region',
      notes: 'Major water/sewer/stormwater upgrade; stormwater storage may be required.',
    });
  }

  // --- Financial ---
  if (financial <= 40) {
    upgrades.push({
      id: 'financial_phasing',
      title: 'Adjust phasing / require developer contributions for off-site works',
      category: 'Financial',
      trigger: 'Financial score indicates need for phasing or off-site contributions.',
      location: DEFAULT_LOCATION,
      severity: 'Moderate',
      expected_benefit: {
        traffic_score_delta: 0,
        transit_accessibility_delta: 0,
        infra_index_delta: 0,
        financial_score_delta: 10,
      },
      suggested_owner: 'Developer/City shared',
      notes: 'Phasing or developer contributions for off-site infrastructure.',
    });
  }

  return { required_upgrades: upgrades };
}

/**
 * Strict JSON schema for Optimization Memo (Gemini output).
 * Used by /api/optimize and UI.
 */

export interface ConstructionConstraintItem {
  name: string;
  distance_km: number;
  status: string;
  why_it_matters: string;
}

export interface TransitContextItem {
  route: string;
  relevance: string;
  distance_km: number | null;
}

export interface SourceItem {
  title: string;
  url: string;
  snippet: string;
}

export interface SiteContext {
  location: string;
  construction_constraints: ConstructionConstraintItem[];
  transit_context: TransitContextItem[];
  sources: SourceItem[];
}

export interface Diagnosis {
  why_traffic_is_high: string[];
  why_transit_is_high_or_low: string[];
  why_infrastructure_is_high: string[];
}

export interface ExpectedMetricEffect {
  traffic: number;
  transit_load: number;
  transit_accessibility: number;
  infrastructure: number;
  financial: number;
}

export interface RecommendedAction {
  horizon: 'Now (0-1y)' | 'Mid (1-3y)' | 'Long (3-7y)';
  action_title: string;
  details: string;
  expected_metric_effect: ExpectedMetricEffect;
  dependencies: string[];
  owner: 'City' | 'York Region' | 'Developer' | 'YRT' | 'Shared';
  risks: string[];
  sequence_notes: string;
}

export interface OptimizationMemo {
  summary: string;
  site_context: SiteContext;
  diagnosis: Diagnosis;
  recommended_actions: RecommendedAction[];
}

import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { getGeminiApiKey, isGeminiConfigured } from '@/lib/geminiEnv';
import { fetchEvidenceBundle } from '@/lib/optimizeContext';
import { computeRequiredUpgrades } from '@/lib/requiredUpgrades';
import type { OptimizationMemo, SiteContext } from '@/lib/optimizeMemoTypes';

const MEMO_SCHEMA = `{
  "summary": "2-4 sentences",
  "site_context": {
    "location": "string",
    "construction_constraints": [{"name":"string","distance_km": number,"status":"string","why_it_matters":"string"}],
    "transit_context": [{"route":"string","relevance":"string","distance_km": number|null}],
    "sources": [{"title":"string","url":"string","snippet":"string"}]
  },
  "diagnosis": {
    "why_traffic_is_high": ["bullet"],
    "why_transit_is_high_or_low": ["bullet"],
    "why_infrastructure_is_high": ["bullet"]
  },
  "recommended_actions": [{
    "horizon": "Now (0-1y) | Mid (1-3y) | Long (3-7y)",
    "action_title": "string",
    "details": "5-10 sentences of concrete planning detail",
    "expected_metric_effect": {"traffic": number,"transit_load": number,"transit_accessibility": number,"infrastructure": number,"financial": number},
    "dependencies": ["string"],
    "owner": "City | York Region | Developer | YRT | Shared",
    "risks": ["string"],
    "sequence_notes": "string"
  }]
}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      buildings,
      report,
      computed,
    } = body as {
      buildings: Array<{ lat: number; lng: number; scale: { x: number; y: number; z: number } }>;
      report: {
        trafficScore?: number;
        transitLoadScore?: number;
        infrastructureIndex?: number;
        financialScore?: number;
      };
      computed: {
        transitAccessibilityScore?: number;
        nearbyProjects: Array<{
          projectName: string;
          location: string;
          projectSubtype: string;
          status: string;
          distanceKm: number | null;
        }>;
        nearbyRoutes: Array<{ routeLongName: string; routeShortName: string }>;
        matchedCorridors?: string[];
      };
    };

    if (!buildings || buildings.length === 0) {
      return NextResponse.json({ error: 'No buildings provided' }, { status: 400 });
    }

    const centroidLat = buildings.reduce((s, b) => s + b.lat, 0) / buildings.length;
    const centroidLng = buildings.reduce((s, b) => s + b.lng, 0) / buildings.length;
    const locationStr = `~${centroidLat.toFixed(5)}°N, ${Math.abs(centroidLng).toFixed(5)}°W (Markham, ON)`;

    const scaleOr = (b: (typeof buildings)[0]) => b.scale ?? { x: 10, y: 10, z: 10 };
    const footprint = buildings.reduce((s, b) => s + scaleOr(b).x * scaleOr(b).z * 100, 0);
    const heightM = buildings.reduce((s, b) => s + scaleOr(b).y * 3, 0) / buildings.length;
    const scenarioSummary = `${buildings.length} building(s); total footprint ~${Math.round(footprint)} m²; avg height ~${Math.round(heightM)} m.`;

    const trafficScore = report?.trafficScore ?? 0;
    const transitLoadScore = report?.transitLoadScore ?? 0;
    const transitAccessibilityScore = computed?.transitAccessibilityScore ?? 0;
    const infrastructureIndex = report?.infrastructureIndex ?? 0;
    const financialScore = report?.financialScore ?? 0;

    let sources: Array<{ title: string; url: string; snippet: string }> = [];
    try {
      sources = await fetchEvidenceBundle();
    } catch (e) {
      console.warn('Optimize: evidence fetch failed', e);
    }

    const nearbyProjectsList =
      computed?.nearbyProjects
        ?.map(
          (p: { projectName: string; location: string; status: string; distanceKm: number | null }) =>
            `- ${p.projectName} | ${p.location} | ${p.status} | ${p.distanceKm != null ? `${p.distanceKm.toFixed(2)} km` : 'N/A'}`
        )
        .join('\n') ?? 'None within 5 km.';
    const nearbyTransitList =
      computed?.nearbyRoutes
        ?.map((r: { routeLongName: string; routeShortName: string }) => `- ${r.routeLongName || r.routeShortName}`)
        .join('\n') ?? 'None matched.';

    const evidenceBlock =
      sources.length > 0
        ? sources.map((s) => `[${s.title}] ${s.url}\n${s.snippet}`).join('\n\n')
        : 'No scraped evidence available; use only the scenario and metrics below.';

    const apiKey = getGeminiApiKey();
    const useGemini = isGeminiConfigured() && apiKey;

    let memo: OptimizationMemo | null = null;

    if (useGemini) {
      try {
        const prompt = `You are an urban planning expert producing an OPTIMIZATION MEMO for a proposed development in Markham, Ontario (York Region).

SITE: ${locationStr}
SCENARIO: ${scenarioSummary}

CURRENT IMPACT METRICS (0-100):
- Traffic: ${trafficScore}
- Transit load: ${transitLoadScore}
- Transit accessibility: ${transitAccessibilityScore}
- Infrastructure index: ${infrastructureIndex}
- Financial: ${financialScore}

NEARBY CONSTRUCTION PROJECTS (from our dataset; do NOT invent others):
${nearbyProjectsList}

NEARBY TRANSIT (spatially filtered corridors):
${nearbyTransitList}

EVIDENCE FROM OFFICIAL SOURCES (use only to support diagnosis/actions; do not invent projects):
${evidenceBlock}

TASK: Output a single JSON object that matches this schema exactly. No markdown, no code fences, no extra text.
Do NOT invent projects or routes; only refer to projects listed above or mentioned in the evidence.
Schema:
${MEMO_SCHEMA}

Output the JSON object only.`;

        const genAI = new GoogleGenerativeAI(apiKey!);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        /** Extract a single JSON object from text (handles markdown, leading/trailing text). */
        function extractJson(text: string): string | null {
          const noMarkdown = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
          const start = noMarkdown.indexOf('{');
          if (start === -1) return null;
          let depth = 0;
          let inString = false;
          let escape = false;
          let quote = '';
          for (let i = start; i < noMarkdown.length; i++) {
            const c = noMarkdown[i];
            if (escape) {
              escape = false;
              continue;
            }
            if (inString) {
              if (c === '\\') escape = true;
              else if (c === quote) inString = false;
              continue;
            }
            if (c === '"' || c === "'") {
              inString = true;
              quote = c;
              continue;
            }
            if (c === '{') depth++;
            else if (c === '}') {
              depth--;
              if (depth === 0) return noMarkdown.slice(start, i + 1);
            }
          }
          return null;
        }

        const parseResponse = (text: string): OptimizationMemo | null => {
          const raw = extractJson(text) ?? text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
          try {
            const parsed = JSON.parse(raw) as Record<string, unknown>;
            if (!parsed || typeof parsed.summary !== 'string') return null;
            return {
              summary: parsed.summary,
              site_context: (parsed.site_context && typeof parsed.site_context === 'object') ? {
                location: String((parsed.site_context as Record<string, unknown>).location ?? 'Site vicinity'),
                construction_constraints: Array.isArray((parsed.site_context as Record<string, unknown>).construction_constraints) ? (parsed.site_context as Record<string, unknown>).construction_constraints as SiteContext['construction_constraints'] : [],
                transit_context: Array.isArray((parsed.site_context as Record<string, unknown>).transit_context) ? (parsed.site_context as Record<string, unknown>).transit_context as SiteContext['transit_context'] : [],
                sources: Array.isArray((parsed.site_context as Record<string, unknown>).sources) ? (parsed.site_context as Record<string, unknown>).sources as SiteContext['sources'] : [],
              } : { location: 'Site vicinity', construction_constraints: [], transit_context: [], sources: [] },
              diagnosis: (parsed.diagnosis && typeof parsed.diagnosis === 'object') ? {
                why_traffic_is_high: Array.isArray((parsed.diagnosis as Record<string, unknown>).why_traffic_is_high) ? (parsed.diagnosis as Record<string, unknown>).why_traffic_is_high as string[] : [],
                why_transit_is_high_or_low: Array.isArray((parsed.diagnosis as Record<string, unknown>).why_transit_is_high_or_low) ? (parsed.diagnosis as Record<string, unknown>).why_transit_is_high_or_low as string[] : [],
                why_infrastructure_is_high: Array.isArray((parsed.diagnosis as Record<string, unknown>).why_infrastructure_is_high) ? (parsed.diagnosis as Record<string, unknown>).why_infrastructure_is_high as string[] : [],
              } : { why_traffic_is_high: [], why_transit_is_high_or_low: [], why_infrastructure_is_high: [] },
              recommended_actions: Array.isArray(parsed.recommended_actions) ? parsed.recommended_actions as OptimizationMemo['recommended_actions'] : [],
            };
          } catch {
            return null;
          }
        };

        let response = await model.generateContent(prompt);
        let text = response?.response?.text?.() ?? '';
        memo = parseResponse(text);

        if (!memo && text && text.length > 50) {
          const fixPrompt = `Fix this JSON so it is valid. Return ONLY the corrected JSON object, no other text.\n\n${text.slice(0, 12000)}`;
          response = await model.generateContent(fixPrompt);
          text = response?.response?.text?.() ?? '';
          memo = parseResponse(text);
        }
      } catch (geminiError) {
        console.warn('Optimize: Gemini failed, using fallback', geminiError);
        memo = null;
      }
    }

    if (!memo) {
      const requiredUpgrades = computeRequiredUpgrades({
        trafficScore,
        transitLoadScore,
        transitAccessibilityScore,
        infrastructureIndex,
        financialScore,
        nearbyProjectsCount: computed?.nearbyProjects?.length ?? 0,
        matchedCorridors: computed?.matchedCorridors,
      });
      return NextResponse.json({
        memo: null,
        useFallback: true,
        requiredUpgrades,
        sources,
      });
    }

    if (memo.site_context && Array.isArray(memo.site_context.sources) && memo.site_context.sources.length === 0 && sources.length > 0) {
      memo.site_context.sources = sources;
    }

    return NextResponse.json({
      memo,
      useFallback: false,
      requiredUpgrades: null,
      sources,
    });
  } catch (error) {
    console.error('Optimize API error:', error);
    return NextResponse.json(
      { error: 'Optimization failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

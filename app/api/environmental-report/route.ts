import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { getGeminiApiKey, isGeminiConfigured } from '@/lib/geminiEnv';
import {
  findProjectsNear,
  getRoutes,
  filterRoutesActiveOn,
  matchRoutesByCorridor,
  computeTransitAccessibilityScore,
  classifyConstructionConstraint,
  getCorridorsForSite,
  dedupeByRouteId,
  getMatchedCorridorNames,
  DEFAULT_PROJECT_RADIUS_KM,
} from '@/lib/impactReportData';

interface PlacedBuilding {
  id: string;
  lat: number;
  lng: number;
  scale: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
  modelPath?: string;
  timeline?: { zoneType?: string; startDate?: string; durationDays?: number };
}

interface EnvironmentalReport {
  summary: string;
  buildings: BuildingImpact[];
  overallImpact: OverallImpact;
  transportationImpact: string;
  transitImpact: string;
  infrastructureStrain: string;
  financialImpact: string;
  relevantYorkRegionProjects: string[];
  recommendations: string[];
  /** Optional 0–100 scores for Key Metrics cards (from Gemini) */
  trafficScore?: number;
  transitLoadScore?: number;
  infrastructureIndex?: number;
  financialScore?: number;
}

/** Serializable payload for report UI: nearby projects and routes (from CSVs). */
export interface ImpactReportComputed {
  transitAccessibilityScore: number;
  constructionConstraint: { level: 'Low' | 'Medium' | 'High'; summary: string };
  /** Corridor keywords that had at least one matching route (for UI). */
  matchedCorridors: string[];
  nearbyProjects: Array<{
    projectName: string;
    location: string;
    projectSubtype: string;
    status: string;
    distanceKm: number;
    webLink: string;
  }>;
  /** Top routes near site (max 8), active on report date, corridor-matched. */
  nearbyRoutes: Array<{
    routeShortName: string;
    routeLongName: string;
    scheduleStart: string;
    scheduleEnd: string;
  }>;
}

interface BuildingImpact {
  id: string;
  coordinates: { lat: number; lng: number };
  locationDescription: string;
  societalImpact: {
    trafficIncrease: string;
    communityEffect: string;
    economicImpact: string;
  };
  riskLevel: 'low' | 'medium' | 'high';
  mitigationMeasures: string[];
}

interface OverallImpact {
  environmentalScore: number;
  societalScore: number;
  sustainabilityRating: string;
}

interface MetricsSnapshot {
  timelineDate: string;
  co2Emissions: number;
  energyConsumption: number;
  waterUsage: number;
  totalFootprint: number;
  materialComplexity: string;
  sustainabilityScore: number;
  populationHappiness: number;
  avgDb: number;
  activeCount: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { buildings: PlacedBuilding[]; snapshot?: MetricsSnapshot };
    const { buildings, snapshot } = body;

    if (!buildings || buildings.length === 0) {
      return NextResponse.json({ error: 'No buildings provided for analysis' }, { status: 400 });
    }

    const apiKey = getGeminiApiKey();
    if (!isGeminiConfigured() || !apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured. Add GEMINI_API_KEY to .env.local and restart the dev server.' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const buildingDetails = buildings.map((b, i) => {
      const footprint = Math.round(b.scale.x * b.scale.z * 100);
      const heightM = Math.round(b.scale.y * 3);
      const zoneType = b.timeline?.zoneType ?? 'unknown';
      const buildingType = b.modelPath?.includes('custom') || b.modelPath?.includes('editor')
        ? 'Custom building (user-designed)'
        : b.modelPath?.includes('let_me_sleep') ? 'Default model (Let Me Sleep Building)' : 'Placed building';
      return `
Building ${i + 1}:
- ID: ${b.id}
- GPS: ${b.lat.toFixed(6)}°N, ${b.lng.toFixed(6)}°W
- Dimensions: scale X=${b.scale.x.toFixed(1)} Y=${b.scale.y.toFixed(1)} Z=${b.scale.z.toFixed(1)} (Y = height axis)
- Approximate footprint: ${footprint} sq meters
- Approximate height: ~${heightM} m
- Zoning: ${zoneType}
- Building type: ${buildingType}
`;
    }).join('\n');

    const snapshotContext = snapshot
      ? `
CURRENT METRICS SNAPSHOT (as of ${new Date(snapshot.timelineDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}):
- Active construction sites: ${snapshot.activeCount}
- Total footprint (sq m): ${snapshot.totalFootprint.toFixed(0)}
- Material complexity: ${snapshot.materialComplexity}

Use this to align your impact narrative with the current timeline state where relevant.
`
      : '';

    // Site centroid for project/route matching
    const centroidLat = buildings.reduce((s, b) => s + b.lat, 0) / buildings.length;
    const centroidLng = buildings.reduce((s, b) => s + b.lng, 0) / buildings.length;
    const reportDate = snapshot?.timelineDate ? new Date(snapshot.timelineDate) : new Date();

    const nearbyProjects = findProjectsNear(centroidLat, centroidLng, DEFAULT_PROJECT_RADIUS_KM);
    const topProjects = nearbyProjects.slice(0, 5);
    const constructionConstraint = classifyConstructionConstraint(nearbyProjects);

    const corridorsForSite = getCorridorsForSite(centroidLat, centroidLng);
    const allRoutes = getRoutes();
    const activeRoutes = filterRoutesActiveOn(allRoutes, reportDate);
    const dedupedRoutes = dedupeByRouteId(activeRoutes);
    const matchedRoutes = matchRoutesByCorridor(dedupedRoutes, corridorsForSite);
    const matchedCorridors = getMatchedCorridorNames(matchedRoutes, corridorsForSite);
    const transitAccessibilityScore = computeTransitAccessibilityScore(matchedRoutes);

    const nearbyProjectsList = topProjects
      .map(
        (p) =>
          `- ${p.projectName || p.location || 'Unnamed'} | ${p.projectSubtype} | ${p.status} | ${(p.distanceKm ?? 0).toFixed(2)} km${p.webLink ? ` | ${p.webLink}` : ''}`
      )
      .join('\n');
    const nearbyRoutesList = matchedRoutes
      .map((r) => `- ${r.routeLongName || r.routeShortName} (${r.scheduleStart} to ${r.scheduleEnd})`)
      .join('\n');

    const computed: ImpactReportComputed = {
      transitAccessibilityScore,
      constructionConstraint,
      matchedCorridors,
      nearbyProjects: topProjects.map((p) => ({
        projectName: p.projectName || p.location || 'Unnamed',
        location: p.location,
        projectSubtype: p.projectSubtype,
        status: p.status,
        distanceKm: p.distanceKm ?? 0,
        webLink: p.webLink || '',
      })),
      nearbyRoutes: matchedRoutes.map((r) => ({
        routeShortName: r.routeShortName,
        routeLongName: r.routeLongName,
        scheduleStart: r.scheduleStart,
        scheduleEnd: r.scheduleEnd,
      })),
    };

    const allowedProjectNames = topProjects.map((p) => p.projectName || p.location || 'Unnamed').filter(Boolean);

    const prompt = `You are an urban planning expert analyzing proposed building developments in Markham, Ontario, Canada (York Region).

PROPOSED BUILDINGS FOR ANALYSIS:
${buildingDetails}
${snapshotContext}

COMPUTED IMPACT METRICS (use these numbers in your narrative; do not invent others):
- Transit Accessibility Score (0–100): ${transitAccessibilityScore}
- Construction Constraint: ${constructionConstraint.level} — ${constructionConstraint.summary}
- Nearby York Region infrastructure/construction projects (from official data; you may ONLY reference these):
${nearbyProjectsList}
- Nearby YRT bus routes (active on report date; use for transit narrative):
${nearbyRoutesList}

INSTRUCTIONS:
- Focus on: traffic/congestion (transportation impact), transit/route load (transit impact), infrastructure strain (composite: water, sewer, roads), and financial impact (municipal servicing, development charges).
- For each building provide: locationDescription (brief), societalImpact with trafficIncrease, communityEffect, economicImpact only. No carbon, habitat, water, air quality, or noise sections.
- In relevantYorkRegionProjects list ONLY project names from the "Nearby York Region infrastructure/construction projects" list above. Do NOT invent or add any other projects.
- Write "Transit Accessibility" narrative grounded in the transit score (${transitAccessibilityScore}) and the listed routes. Write "Nearby Infrastructure/Construction Projects" narrative grounded only in the listed projects.
- Keep summary short (2-3 sentences). Recommendations should be short and actionable.
- Provide numeric scores (0–100) for: trafficScore (traffic/congestion), transitLoadScore (transit demand), infrastructureIndex (infrastructure strain), financialScore (financial impact).

You MUST respond with valid JSON in this exact format (no other fields):
{
  "summary": "2-3 sentence executive summary of overall development impact",
  "buildings": [
    {
      "id": "building-id",
      "coordinates": { "lat": 43.856, "lng": -79.263 },
      "locationDescription": "Brief description of the specific location",
      "societalImpact": {
        "trafficIncrease": "Expected traffic and congestion changes",
        "communityEffect": "Impact on nearby residents and businesses",
        "economicImpact": "Jobs, property values, local economy"
      },
      "riskLevel": "low|medium|high",
      "mitigationMeasures": ["Actionable measure 1", "Measure 2"]
    }
  ],
  "overallImpact": {
    "environmentalScore": 75,
    "societalScore": 68,
    "sustainabilityRating": "B+ (Good with room for improvement)"
  },
  "trafficScore": 70,
  "transitLoadScore": 65,
  "infrastructureIndex": 60,
  "financialScore": 72,
  "transportationImpact": "1-2 paragraphs on congestion and road capacity, tied to the development scale and location.",
  "transitImpact": "1-2 paragraphs on transit/route load and transit accessibility, using the provided score and route list.",
  "infrastructureStrain": "1-2 paragraphs on composite infrastructure strain (water, sewer, roads).",
  "financialImpact": "1 short paragraph on municipal servicing and development charge (DC) estimate.",
  "relevantYorkRegionProjects": ["Only use names from the nearby projects list above"],
  "recommendations": ["Short actionable recommendation 1", "Recommendation 2", "Recommendation 3"]
}

SCORING:
- environmentalScore: 100 = no impact, 0 = devastating (based on infrastructure/land use only).
- societalScore: 100 = highly beneficial, 0 = highly detrimental.
- sustainabilityRating: letter grade plus short label.
- trafficScore, transitLoadScore, infrastructureIndex, financialScore: 0–100 each.

Be specific about Markham, Ontario (York Region). Reference the supplied project and route lists only; do not invent projects or routes.

Respond ONLY with the JSON object, no additional text.`;

    let result;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (fetchError) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw fetchError;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    if (!result) {
      throw new Error('Failed to get response after retries');
    }

    const response = result.response;
    const text = response.text();

    let report: EnvironmentalReport;
    try {
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      report = JSON.parse(cleanedText);
      if (!Array.isArray(report.relevantYorkRegionProjects)) {
        report.relevantYorkRegionProjects = [];
      }
      report.relevantYorkRegionProjects = report.relevantYorkRegionProjects.filter((name) =>
        allowedProjectNames.includes(name)
      );
      if (!report.transportationImpact) report.transportationImpact = '';
      if (!report.transitImpact) report.transitImpact = '';
      if (!report.infrastructureStrain) report.infrastructureStrain = '';
      if (!report.financialImpact) report.financialImpact = '';
    } catch {
      console.error('Failed to parse Gemini response:', text);
      return NextResponse.json({
        error: 'Failed to parse AI response',
        rawResponse: text
      }, { status: 500 });
    }

    return NextResponse.json({
      report,
      computed,
      generatedAt: new Date().toISOString(),
      buildingCount: buildings.length,
      snapshotDate: snapshot?.timelineDate ?? null,
    });

  } catch (error) {
    console.error('Environmental report error:', error);
    return NextResponse.json({
      error: 'Failed to generate environmental report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

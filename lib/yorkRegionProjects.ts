/**
 * Hardcoded list of known York Region / Markham area projects for impact report context.
 * Match by corridor/road name keywords to show "Related projects" near a site.
 */
export interface YorkRegionProject {
  name: string;
  /** Road/corridor keywords for matching (e.g. "16th", "Kennedy", "McCowan") */
  corridorKeywords: string[];
  /** Short date or range for display */
  date: string;
  /** Brief description for tooltip/list */
  description?: string;
}

export const YORK_REGION_PROJECTS: YorkRegionProject[] = [
  { name: "16th Avenue Widening", corridorKeywords: ["16th", "16th Ave"], date: "2024–2028", description: "Widening and capacity improvements along 16th Avenue corridor" },
  { name: "Kennedy Road BRT", corridorKeywords: ["Kennedy", "Kennedy Rd"], date: "2025–2029", description: "Bus rapid transit on Kennedy Road" },
  { name: "McCowan Road Widening", corridorKeywords: ["McCowan", "McCowan Rd"], date: "2023–2027", description: "McCowan Road capacity and transit upgrades" },
  { name: "Highway 7 BRT / Viva", corridorKeywords: ["Highway 7", "Hwy 7"], date: "Ongoing", description: "Viva BRT and Highway 7 corridor improvements" },
  { name: "Major Mackenzie Drive Improvements", corridorKeywords: ["Major Mackenzie", "Major Mac"], date: "2024–2027", description: "Major Mackenzie Drive corridor upgrades" },
  { name: "Unionville GO Station Area", corridorKeywords: ["Unionville", "GO"], date: "2025–2030", description: "Transit-oriented development and station area" },
  { name: "Markham Centre Transit", corridorKeywords: ["Markham Centre", "Downtown Markham"], date: "Ongoing", description: "Markham Centre transit and road network" },
];

/**
 * Return projects whose corridor keywords appear in the given text (e.g. location description or address).
 */
export function getRelevantYorkRegionProjects(text: string): YorkRegionProject[] {
  const lower = text.toLowerCase();
  return YORK_REGION_PROJECTS.filter((p) =>
    p.corridorKeywords.some((k) => lower.includes(k.toLowerCase()))
  );
}

/**
 * Return projects relevant to any of the building location descriptions.
 */
export function getRelevantProjectsForBuildings(locationDescriptions: string[]): YorkRegionProject[] {
  const seen = new Set<string>();
  const out: YorkRegionProject[] = [];
  for (const desc of locationDescriptions) {
    const projects = getRelevantYorkRegionProjects(desc);
    for (const p of projects) {
      if (!seen.has(p.name)) {
        seen.add(p.name);
        out.push(p);
      }
    }
  }
  return out;
}

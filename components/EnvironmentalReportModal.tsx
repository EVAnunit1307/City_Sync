"use client";

import { useState } from "react";
import {
  X,
  Leaf,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Car,
  Users,
  DollarSign,
  MapPin,
  Download,
  Loader2,
  Building2,
  Train,
  Zap,
  FileText,
  Bus,
  Construction,
} from "lucide-react";
import type { ImpactReportComputed } from "@/app/api/environmental-report/route";

interface PlacedBuilding {
  id: string;
  lat: number;
  lng: number;
  scale: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
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
  riskLevel: "low" | "medium" | "high";
  mitigationMeasures: string[];
}

interface OverallImpact {
  environmentalScore: number;
  societalScore: number;
  sustainabilityRating: string;
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
  trafficScore?: number;
  transitLoadScore?: number;
  infrastructureIndex?: number;
  financialScore?: number;
}

export interface MetricsSnapshot {
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

interface EnvironmentalReportModalProps {
  visible: boolean;
  onClose: () => void;
  buildings: PlacedBuilding[];
  snapshot?: MetricsSnapshot | null;
}

export default function EnvironmentalReportModal({
  visible,
  onClose,
  buildings,
  snapshot = null,
}: EnvironmentalReportModalProps) {
  const [report, setReport] = useState<EnvironmentalReport | null>(null);
  const [computed, setComputed] = useState<ImpactReportComputed | null>(null);
  const [reportSnapshotDate, setReportSnapshotDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBuildingIndex, setSelectedBuildingIndex] = useState(0);

  const generateReport = async () => {
    if (buildings.length === 0) {
      setError("No buildings active at the current timeline date. Move the timeline to a date with active construction.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/environmental-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildings, snapshot: snapshot ?? undefined }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate report");
      }

      const data = await response.json();
      setReport(data.report);
      setComputed(data.computed ?? null);
      setReportSnapshotDate(data.snapshotDate ?? snapshot?.timelineDate ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!report) return;

    const asOfLabel = reportSnapshotDate
      ? `Report snapshot as of: ${new Date(reportSnapshotDate).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}`
      : "";
    const nearbySection =
      computed?.nearbyProjects && computed.nearbyProjects.length > 0
        ? computed.nearbyProjects.map(
            (p) => `- ${p.projectName} | ${p.distanceKm.toFixed(2)} km | ${p.status} | ${p.projectSubtype}${p.webLink ? ` | ${p.webLink}` : ""}`
          ).join("\n")
        : "None within range (2 km).";
    const reportText = `
IMPACT ASSESSMENT REPORT — YORK REGION
${asOfLabel ? asOfLabel + "\n" : ""}Generated: ${new Date().toLocaleDateString()}
Location: Markham, Ontario, Canada (York Region)

================================================================================
EXECUTIVE SUMMARY
================================================================================
${report.summary}

================================================================================
KEY METRICS
================================================================================
Traffic: ${report.trafficScore ?? "—"}/100 | Transit Load: ${report.transitLoadScore ?? "—"}/100
Transit Accessibility: ${computed?.transitAccessibilityScore ?? "—"}/100 | Infrastructure Index: ${report.infrastructureIndex ?? "—"}/100 | Financial: ${report.financialScore ?? "—"}/100
Construction Constraint: ${computed?.constructionConstraint?.level ?? "—"} — ${computed?.constructionConstraint?.summary ?? ""}

================================================================================
TRANSPORTATION IMPACT
================================================================================
${report.transportationImpact}

================================================================================
TRANSIT IMPACT
================================================================================
${report.transitImpact}

================================================================================
INFRASTRUCTURE STRAIN
================================================================================
${report.infrastructureStrain}

================================================================================
FINANCIAL IMPACT
================================================================================
${report.financialImpact}

================================================================================
NEARBY YORK REGION PROJECTS (from data)
================================================================================
${nearbySection}

================================================================================
BUILDING ASSESSMENTS
================================================================================
${report.buildings
  .map(
    (b, i) => `
Building ${i + 1}: ${b.id}
Coordinates: ${b.coordinates.lat.toFixed(6)}°N, ${b.coordinates.lng.toFixed(6)}°W
Location: ${b.locationDescription}
Risk Level: ${b.riskLevel.toUpperCase()}

Societal Impact:
- Traffic: ${b.societalImpact.trafficIncrease}
- Community: ${b.societalImpact.communityEffect}
- Economic: ${b.societalImpact.economicImpact}

Mitigation:
${b.mitigationMeasures.map((m) => `- ${m}`).join("\n")}
`
  )
  .join("\n")}

================================================================================
RECOMMENDATIONS
================================================================================
${report.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}

================================================================================
END OF REPORT
================================================================================
`;

    const blob = new Blob([reportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `impact-report-${reportSnapshotDate ? reportSnapshotDate : new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!visible) return null;

  const getRiskColor = (level: "low" | "medium" | "high") => {
    switch (level) {
      case "low":
        return "text-emerald-600 bg-emerald-50 border-emerald-200";
      case "medium":
        return "text-amber-600 bg-amber-50 border-amber-200";
      case "high":
        return "text-red-600 bg-red-50 border-red-200";
    }
  };

  const getRiskIcon = (level: "low" | "medium" | "high") => {
    switch (level) {
      case "low":
        return <CheckCircle size={16} />;
      case "medium":
        return <AlertTriangle size={16} />;
      case "high":
        return <XCircle size={16} />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const selectedBuilding = report?.buildings[selectedBuildingIndex];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <FileText className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Impact Assessment Report
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Markham, Ontario (York Region)
                {reportSnapshotDate && (
                  <span className="block text-emerald-600 font-medium">
                    Snapshot: {new Date(reportSnapshotDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {report && (
              <button
                onClick={exportReport}
                className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 text-sm font-medium transition-colors"
              >
                <Download size={16} />
                Export
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!report && !loading && !error && (
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <Leaf className="text-emerald-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Generate Impact Report
              </h3>
              <p className="text-slate-500 mb-8 max-w-md mx-auto text-sm">
                {snapshot
                  ? `Generate a report using the current timeline (${new Date(snapshot.timelineDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}). ${buildings.length} active building${buildings.length !== 1 ? "s" : ""} will be included.`
                  : `Analyze the impact of ${buildings.length} proposed building${buildings.length !== 1 ? "s" : ""} in Markham, Ontario (York Region).`}
              </p>
              <button
                onClick={generateReport}
                disabled={buildings.length === 0}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-colors"
              >
                {buildings.length === 0 ? "No Buildings to Analyze" : "Generate Impact Report"}
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-16">
              <Loader2 className="w-10 h-10 mx-auto mb-4 text-emerald-600 animate-spin" />
              <p className="text-slate-600 font-medium text-sm">Analyzing impacts…</p>
              <p className="text-slate-400 text-xs mt-1">This may take a few moments</p>
            </div>
          )}

          {error && (
            <div className="text-center py-16 px-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="text-red-500" size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Report generation failed</h3>
              <p className="text-red-600 text-sm mb-5">{error}</p>
              <button
                onClick={generateReport}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium text-sm"
              >
                Try again
              </button>
            </div>
          )}

          {report && (
            <div className="p-6 space-y-8">
              {/* Executive Summary */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Executive Summary
                </h3>
                <p className="text-slate-700 text-sm leading-relaxed">{report.summary}</p>
              </section>

              {/* Key Metrics — Traffic, Transit Load, Transit Accessibility, Infrastructure, Financial */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Key Metrics
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <MetricCard
                    icon={<Car size={14} />}
                    label="Traffic"
                    value={report.trafficScore ?? report.overallImpact.societalScore}
                    max={100}
                  />
                  <MetricCard
                    icon={<Train size={14} />}
                    label="Transit Load"
                    value={report.transitLoadScore ?? report.overallImpact.societalScore}
                    max={100}
                  />
                  <MetricCard
                    icon={<Bus size={14} />}
                    label="Transit Accessibility"
                    value={computed?.transitAccessibilityScore ?? 0}
                    max={100}
                  />
                  <MetricCard
                    icon={<Zap size={14} />}
                    label="Infrastructure Index"
                    value={report.infrastructureIndex ?? report.overallImpact.environmentalScore}
                    max={100}
                  />
                  <MetricCard
                    icon={<DollarSign size={14} />}
                    label="Financial"
                    value={report.financialScore ?? report.overallImpact.societalScore}
                    max={100}
                  />
                </div>
                {computed?.constructionConstraint && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2">
                    <Construction size={16} className="text-slate-500 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-600 uppercase">
                        Construction constraint: {computed.constructionConstraint.level}
                      </span>
                      <p className="text-xs text-slate-600 mt-0.5">{computed.constructionConstraint.summary}</p>
                    </div>
                  </div>
                )}
              </section>

              {/* Key impacts — bullet cards */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Key Impacts
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {report.buildings.slice(0, 4).map((b, i) => (
                    <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold text-slate-500">Building {i + 1}</span>
                        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${getRiskColor(b.riskLevel)} flex items-center gap-1`}>
                          {getRiskIcon(b.riskLevel)}
                          {b.riskLevel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 mb-2">{b.locationDescription}</p>
                      <ul className="text-xs text-slate-600 space-y-1">
                        <li><strong className="text-slate-700">Traffic:</strong> {b.societalImpact.trafficIncrease.slice(0, 80)}{b.societalImpact.trafficIncrease.length > 80 ? "…" : ""}</li>
                        <li><strong className="text-slate-700">Economic:</strong> {b.societalImpact.economicImpact.slice(0, 60)}{b.societalImpact.economicImpact.length > 60 ? "…" : ""}</li>
                      </ul>
                    </div>
                  ))}
                </div>
              </section>

              {/* Transportation Impact */}
              {report.transportationImpact && (
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Car size={14} />
                    Transportation Impact
                  </h3>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{report.transportationImpact}</p>
                  </div>
                </section>
              )}

              {/* Transit Accessibility — score, matched corridors, top routes (max 8) */}
              {computed != null && (
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Bus size={14} />
                    Transit Accessibility
                  </h3>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-slate-800">{computed.transitAccessibilityScore}</span>
                      <span className="text-slate-500 text-sm">/ 100</span>
                    </div>
                    {computed.matchedCorridors && computed.matchedCorridors.length > 0 && (
                      <p className="text-xs text-slate-500">
                        Matched corridors: {computed.matchedCorridors.join(", ")}
                      </p>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-2">Top routes near site</p>
                      {computed.nearbyRoutes && computed.nearbyRoutes.length > 0 ? (
                        <ul className="space-y-1.5">
                          {computed.nearbyRoutes.map((r, i) => (
                            <li key={i} className="text-sm text-slate-700 flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{r.routeLongName || r.routeShortName}</span>
                              <span className="text-slate-400 text-xs">
                                {r.scheduleStart?.slice(0, 10)} – {r.scheduleEnd?.slice(0, 10)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-500 italic">No nearby routes found with current data.</p>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* Transit Impact (narrative from Gemini) */}
              {report.transitImpact && (
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Train size={14} />
                    Transit Impact
                  </h3>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{report.transitImpact}</p>
                  </div>
                </section>
              )}

              {/* Infrastructure Strain */}
              {report.infrastructureStrain && (
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Zap size={14} />
                    Infrastructure Strain
                  </h3>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{report.infrastructureStrain}</p>
                  </div>
                </section>
              )}

              {/* Financial Impact */}
              {report.financialImpact && (
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <DollarSign size={14} />
                    Financial Impact
                  </h3>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{report.financialImpact}</p>
                  </div>
                </section>
              )}

              {/* Nearby York Region Projects — from CSV data */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Building2 size={14} />
                  Nearby York Region Projects
                </h3>
                {computed?.nearbyProjects && computed.nearbyProjects.length > 0 ? (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-left">
                          <th className="px-4 py-2 font-semibold text-slate-600">Name</th>
                          <th className="px-4 py-2 font-semibold text-slate-600">Distance</th>
                          <th className="px-4 py-2 font-semibold text-slate-600">Status</th>
                          <th className="px-4 py-2 font-semibold text-slate-600">Subtype</th>
                          <th className="px-4 py-2 font-semibold text-slate-600">Link</th>
                        </tr>
                      </thead>
                      <tbody>
                        {computed.nearbyProjects.map((p, i) => (
                          <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                            <td className="px-4 py-2 text-slate-800 font-medium">{p.projectName}</td>
                            <td className="px-4 py-2 text-slate-600">{p.distanceKm.toFixed(2)} km</td>
                            <td className="px-4 py-2 text-slate-600">{p.status}</td>
                            <td className="px-4 py-2 text-slate-600">{p.projectSubtype}</td>
                            <td className="px-4 py-2">
                              {p.webLink ? (
                                <a href={p.webLink} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline text-xs">
                                  View
                                </a>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No York Region construction projects within range of the site (2 km).</p>
                )}
              </section>

              {/* Per-building detail (optional expand) */}
              {report.buildings.length > 1 && (
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Building Details
                  </h3>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {report.buildings.map((b, i) => (
                      <button
                        key={b.id}
                        onClick={() => setSelectedBuildingIndex(i)}
                        className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedBuildingIndex === i ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Building {i + 1}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {selectedBuilding && (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-slate-400" />
                      <span className="text-xs font-mono text-slate-600">
                        {selectedBuilding.coordinates.lat.toFixed(5)}°N, {Math.abs(selectedBuilding.coordinates.lng).toFixed(5)}°W
                      </span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase flex items-center gap-1 ${getRiskColor(selectedBuilding.riskLevel)}`}>
                      {getRiskIcon(selectedBuilding.riskLevel)}
                      {selectedBuilding.riskLevel}
                    </span>
                  </div>
                  <div className="p-4 space-y-4">
                    <p className="text-sm text-slate-700">{selectedBuilding.locationDescription}</p>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <ImpactCard icon={<Car size={14} />} label="Traffic" value={selectedBuilding.societalImpact.trafficIncrease} />
                      <ImpactCard icon={<Users size={14} />} label="Community" value={selectedBuilding.societalImpact.communityEffect} />
                      <ImpactCard icon={<DollarSign size={14} />} label="Economic" value={selectedBuilding.societalImpact.economicImpact} />
                    </div>
                    {selectedBuilding.mitigationMeasures.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Mitigation</p>
                        <ul className="text-sm text-slate-700 space-y-1">
                          {selectedBuilding.mitigationMeasures.map((m, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-emerald-500 mt-0.5">•</span>
                              {m}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CheckCircle size={14} />
                  Recommendations
                </h3>
                <ol className="space-y-2">
                  {report.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold">
                        {i + 1}
                      </span>
                      {rec}
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  max = 100,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  max?: number;
}) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  const color =
    pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-red-600";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
      <div className="flex items-center justify-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase mb-1">
        {icon}
        {label}
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-400">/ {max}</p>
    </div>
  );
}

function ImpactCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
      <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase mb-1">
        {icon}
        {label}
      </div>
      <p className="text-xs text-slate-700 leading-snug">{value}</p>
    </div>
  );
}

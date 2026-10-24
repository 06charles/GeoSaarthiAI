"use client";

import React, { useState } from "react";
import {
  RecommendationResult,
} from "@/types/recommendation";
import {
  Award,
  Navigation,
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Compass,
  Layers,
} from "lucide-react";

interface RecommendationCardProps {
  recommendation: RecommendationResult;
  rank: number;
  isSelected?: boolean;
  onSelect: () => void;
  onCompare: () => void;
}

export function RecommendationCard({
  recommendation,
  rank,
  isSelected,
  onSelect,
  onCompare,
}: RecommendationCardProps) {
  const [showDetails, setShowDetails] = useState(rank === 1);
  const { place, compositeScore, scoreBreakdown, warnings, reasonsForRecommendation, bestTimeSlots, route } =
    recommendation;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#10b981";
    if (score >= 65) return "#06b6d4";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const scoreColor = getScoreColor(compositeScore);

  return (
    <div
      className="glass-card"
      style={{
        padding: "18px 20px",
        marginBottom: "14px",
        border: isSelected ? "1.5px solid #10b981" : undefined,
        boxShadow: isSelected ? "0 0 20px rgba(16, 185, 129, 0.2)" : undefined,
      }}
    >
      {/* Card Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "800",
                padding: "2px 8px",
                borderRadius: "6px",
                background: rank === 1 ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.08)",
                color: rank === 1 ? "#34d399" : "#cbd5e1",
                border: rank === 1 ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              #{rank} Recommended
            </span>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>{place.area}</span>
            {place.verified && (
              <span style={{ fontSize: "11px", color: "#38bdf8", display: "flex", alignItems: "center", gap: "3px" }}>
                <CheckCircle size={12} /> Ground-Verified
              </span>
            )}
          </div>
          <h3
            onClick={onSelect}
            style={{
              fontSize: "17px",
              fontWeight: "700",
              color: "#ffffff",
              cursor: "pointer",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#34d399")}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#ffffff")}
          >
            {place.name}
          </h3>
          <p style={{ fontSize: "12px", color: "#cbd5e1", marginTop: "3px" }}>
            {place.category} • {place.facilityDetails?.surface || "Outdoor natural area"}
          </p>
        </div>

        {/* Score Badge */}
        <div style={{ textAlign: "right", minWidth: "75px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: `${scoreColor}20`,
              border: `1.5px solid ${scoreColor}`,
              color: scoreColor,
              fontWeight: "800",
              fontSize: "18px",
            }}
          >
            {compositeScore}
          </div>
          <span style={{ display: "block", fontSize: "10px", color: "#94a3b8", marginTop: "3px", textTransform: "uppercase" }}>
            Suitability
          </span>
        </div>
      </div>

      {/* Key Quick Metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "10px",
          marginTop: "14px",
          padding: "10px 14px",
          borderRadius: "10px",
          background: "rgba(15, 23, 42, 0.6)",
          fontSize: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Navigation size={14} color="#38bdf8" />
          <span>Distance: <strong>{place.distanceKm ? `${place.distanceKm} km` : "Nearby"}</strong></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Clock size={14} color="#a78bfa" />
          <span>Optimal: <strong>{bestTimeSlots[0]?.startTime || "06:00"}</strong></span>
        </div>
        {route && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Compass size={14} color="#34d399" />
            <span>Route: <strong>~{route.estimatedDurationMins}m ({route.provider})</strong></span>
          </div>
        )}
      </div>

      {/* Safety Warnings if any */}
      {warnings.length > 0 && (
        <div style={{ marginTop: "12px" }}>
          {warnings.map((warn, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "8px",
                background: warn.severity === "severe" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                border: `1px solid ${warn.severity === "severe" ? "rgba(239, 68, 68, 0.4)" : "rgba(245, 158, 11, 0.4)"}`,
                fontSize: "12px",
                color: warn.severity === "severe" ? "#fca5a5" : "#fcd34d",
                marginBottom: "6px",
              }}
            >
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong>{warn.title}: </strong>
                <span>{warn.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Collapsible Detailed Breakdown */}
      {showDetails && (
        <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
          {/* Score Decomposition */}
          <div style={{ marginBottom: "12px" }}>
            <h4 style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", marginBottom: "8px" }}>
              Transparent Scoring Breakdown
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "8px", fontSize: "11px" }}>
              <div style={{ padding: "6px 8px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "6px" }}>
                <span style={{ color: "#94a3b8" }}>Weather:</span> <b>{scoreBreakdown.weatherScore}/100</b>
              </div>
              <div style={{ padding: "6px 8px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "6px" }}>
                <span style={{ color: "#94a3b8" }}>Air Quality:</span> <b>{scoreBreakdown.airQualityScore}/100</b>
              </div>
              <div style={{ padding: "6px 8px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "6px" }}>
                <span style={{ color: "#94a3b8" }}>Venue Surface:</span> <b>{scoreBreakdown.placeSuitabilityScore}/100</b>
              </div>
              <div style={{ padding: "6px 8px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "6px" }}>
                <span style={{ color: "#94a3b8" }}>Timing/Light:</span> <b>{scoreBreakdown.timingScore}/100</b>
              </div>
            </div>
          </div>

          {/* Verification Reasons */}
          <div style={{ marginBottom: "12px" }}>
            <h4 style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px" }}>
              Why This Venue is Recommended:
            </h4>
            <ul style={{ paddingLeft: "18px", fontSize: "12px", color: "#cbd5e1", lineHeight: "1.5" }}>
              {reasonsForRecommendation.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </div>

          {/* Time Slot Recommendations */}
          {bestTimeSlots.length > 0 && (
            <div>
              <h4 style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px" }}>
                Forecast Time Windows:
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {bestTimeSlots.map((slot, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "6px",
                      background: "rgba(30, 41, 59, 0.5)",
                      fontSize: "11px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong style={{ color: "#ffffff" }}>{slot.label}</strong>
                      <span style={{ color: "#94a3b8", marginLeft: "8px" }}>{slot.tempRange} • AQI ~{slot.aqiEstimate}</span>
                    </div>
                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: "10px",
                        background: slot.suitabilityScore >= 80 ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                        color: slot.suitabilityScore >= 80 ? "#34d399" : "#fbbf24",
                        fontWeight: "700",
                      }}
                    >
                      Score {slot.suitabilityScore}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Card Footer Actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "14px", paddingTop: "10px" }}>
        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            background: "none",
            border: "none",
            color: "#94a3b8",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            cursor: "pointer",
          }}
        >
          {showDetails ? (
            <>
              Hide details <ChevronUp size={14} />
            </>
          ) : (
            <>
              View breakdown & times <ChevronDown size={14} />
            </>
          )}
        </button>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={onCompare}
            style={{
              padding: "5px 10px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#cbd5e1",
              fontSize: "11px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Compare
          </button>
          <button
            onClick={onSelect}
            style={{
              padding: "5px 12px",
              borderRadius: "8px",
              background: isSelected ? "rgba(16, 185, 129, 0.3)" : "rgba(16, 185, 129, 0.15)",
              border: "1px solid #10b981",
              color: "#34d399",
              fontSize: "11px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            {isSelected ? "Selected on Map" : "Highlight on Map"}
          </button>
        </div>
      </div>
    </div>
  );
}

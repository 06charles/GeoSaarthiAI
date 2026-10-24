"use client";

import React from "react";
import { X, Check, AlertTriangle, Layers, Navigation, Clock, Gauge, CloudSun } from "lucide-react";
import { RecommendationResult } from "@/types/recommendation";

interface PlaceComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendations: RecommendationResult[];
}

export function PlaceComparisonModal({
  isOpen,
  onClose,
  recommendations,
}: PlaceComparisonModalProps) {
  if (!isOpen) return null;

  const topPlaces = recommendations.slice(0, 3);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "850px",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "24px",
          background: "#0f172a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff" }}>
              Venue Suitability Comparison
            </h2>
            <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
              Side-by-side comparative analysis of top candidate venues in Mumbai
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Comparison Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                <th style={{ textAlign: "left", padding: "12px", color: "#94a3b8", width: "160px" }}>Feature</th>
                {topPlaces.map((rec, i) => (
                  <th key={i} style={{ textAlign: "left", padding: "12px", color: i === 0 ? "#34d399" : "#ffffff" }}>
                    <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Rank #{i + 1}</div>
                    <div style={{ fontSize: "15px", fontWeight: "700" }}>{rec.place.name}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>{rec.place.area}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Composite Score */}
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <td style={{ padding: "12px", color: "#94a3b8", fontWeight: "600" }}>Suitability Score</td>
                {topPlaces.map((rec, i) => (
                  <td key={i} style={{ padding: "12px" }}>
                    <span
                      style={{
                        fontSize: "16px",
                        fontWeight: "800",
                        color: rec.compositeScore >= 80 ? "#34d399" : "#38bdf8",
                      }}
                    >
                      {rec.compositeScore}/100
                    </span>
                  </td>
                ))}
              </tr>

              {/* Surface & Ground Details */}
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <td style={{ padding: "12px", color: "#94a3b8", fontWeight: "600" }}>Surface Type</td>
                {topPlaces.map((rec, i) => (
                  <td key={i} style={{ padding: "12px", color: "#cbd5e1" }}>
                    {rec.place.facilityDetails?.surface || "Natural / Mixed Terrain"}
                  </td>
                ))}
              </tr>

              {/* Distance from Anchor */}
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <td style={{ padding: "12px", color: "#94a3b8", fontWeight: "600" }}>Distance</td>
                {topPlaces.map((rec, i) => (
                  <td key={i} style={{ padding: "12px", color: "#cbd5e1" }}>
                    ~{rec.place.distanceKm || 0} km
                  </td>
                ))}
              </tr>

              {/* Route & Travel Duration */}
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <td style={{ padding: "12px", color: "#94a3b8", fontWeight: "600" }}>Route Estimate</td>
                {topPlaces.map((rec, i) => (
                  <td key={i} style={{ padding: "12px", color: "#cbd5e1" }}>
                    {rec.route ? `~${rec.route.estimatedDurationMins} mins (${rec.route.distanceKm} km via ${rec.route.provider})` : "Direct access"}
                  </td>
                ))}
              </tr>

              {/* Optimal Time Window */}
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <td style={{ padding: "12px", color: "#94a3b8", fontWeight: "600" }}>Optimal Time</td>
                {topPlaces.map((rec, i) => (
                  <td key={i} style={{ padding: "12px", color: "#cbd5e1" }}>
                    {rec.bestTimeSlots[0]?.label || "Morning Golden Hour"}
                  </td>
                ))}
              </tr>

              {/* Environmental Proxies */}
              <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <td style={{ padding: "12px", color: "#94a3b8", fontWeight: "600" }}>Environmental Proxy</td>
                {topPlaces.map((rec, i) => (
                  <td key={i} style={{ padding: "12px", color: "#cbd5e1" }}>
                    {rec.place.environmentalContext?.isWaterfront ? "Waterfront coastal breeze" : rec.place.environmentalContext?.isGreenSpace ? "Dense botanical canopy" : "Urban open space"}
                  </td>
                ))}
              </tr>

              {/* Warnings */}
              <tr>
                <td style={{ padding: "12px", color: "#94a3b8", fontWeight: "600" }}>Active Warnings</td>
                {topPlaces.map((rec, i) => (
                  <td key={i} style={{ padding: "12px" }}>
                    {rec.warnings.length > 0 ? (
                      <span style={{ color: "#fbbf24", display: "flex", alignItems: "center", gap: "4px" }}>
                        <AlertTriangle size={14} /> {rec.warnings[0].title}
                      </span>
                    ) : (
                      <span style={{ color: "#34d399", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Check size={14} /> Normal parameters
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: "24px", textAlign: "right" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              borderRadius: "10px",
              background: "#334155",
              color: "#ffffff",
              border: "none",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import {
  CloudSun,
  Wind,
  Droplets,
  Gauge,
  RefreshCw,
  Sun,
  MapPin,
  ChevronDown,
  ChevronUp,
  Radio,
  Info,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { WeatherData, AirQualityData, Coordinates } from "@/types/recommendation";

interface WeatherAQIBadgeProps {
  weather?: WeatherData;
  airQuality?: AirQualityData;
  targetArea: string;
  coordinates?: Coordinates;
  isUserLocation?: boolean;
  isGps?: boolean;
  originName?: string;
  venueName?: string;
  activeMode?: "origin" | "venue";
  onModeChange?: (mode: "origin" | "venue") => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function WeatherAQIBadge({
  weather,
  airQuality,
  targetArea,
  coordinates,
  isUserLocation,
  isGps,
  originName,
  venueName,
  activeMode = "origin",
  onModeChange,
  onRefresh,
  isRefreshing,
}: WeatherAQIBadgeProps) {
  const [showPollutantDetails, setShowPollutantDetails] = useState(false);
  const [showStandardExplanation, setShowStandardExplanation] = useState(false);
  // Default to Indian National CPCB standard for Mumbai / Indian context
  const [aqiStandard, setAqiStandard] = useState<"cpcb" | "epa">("cpcb");

  if (!weather || !airQuality) return null;

  const w = weather.current;
  const aqi = airQuality.current;

  // Clean location labels to prevent nested parentheses e.g. "My Location (Current Location (Taloja))"
  const cleanLabel = (raw?: string) => {
    if (!raw) return "";
    return raw
      .replace(/^Current Location \((.*)\)$/i, "$1")
      .replace(/^GPS Location \((.*)\)$/i, "$1")
      .replace(/^My Current Location \((.*)\)$/i, "$1")
      .replace(/\s*\(\d+\.\d+°N.*?\)/g, "")
      .trim();
  };

  const cleanOrigin = cleanLabel(originName) || "My Location";
  const cleanVenue = cleanLabel(venueName);
  const cleanDisplayArea = cleanLabel(targetArea);

  // Active AQI calculations based on selected standard
  const activeAqi = aqiStandard === "cpcb" ? (aqi.indianAqi ?? aqi.usAqi) : aqi.usAqi;
  const activeCategory =
    aqiStandard === "cpcb" ? (aqi.indianCategory ?? aqi.aqiCategory) : aqi.aqiCategory;

  const getAqiColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "good":
        return "#10b981"; // emerald
      case "satisfactory":
        return "#34d399"; // light emerald
      case "moderate":
        return "#f59e0b"; // amber
      case "unhealthy for sensitive groups":
      case "poor":
        return "#f97316"; // orange
      case "unhealthy":
      case "very poor":
        return "#ef4444"; // red
      case "very unhealthy":
      case "severe":
      case "hazardous":
        return "#a855f7"; // purple
      default:
        return "#10b981";
    }
  };

  const aqiColor = getAqiColor(activeCategory);

  // Health recommendation based on PM2.5 and AQI
  const getOutdoorHealthTip = () => {
    if (activeAqi > 200 || aqi.pm25 > 90) {
      return {
        severity: "warning",
        text: "Elevated particulate pollution (PM2.5). Sensitive individuals and runners should consider a mask or lighter aerobic workouts.",
      };
    }
    if (activeAqi > 100 || aqi.pm25 > 60) {
      return {
        severity: "moderate",
        text: "Moderate air quality. Good for general outdoor activities, but sensitive groups should take occasional hydration breaks.",
      };
    }
    return {
      severity: "good",
      text: "Clean, healthy air conditions. Optimal for intense outdoor sports, jogging, and outdoor fitness.",
    };
  };

  const healthTip = getOutdoorHealthTip();

  return (
    <div
      className="glass-card"
      style={{
        padding: "16px 20px",
        marginBottom: "20px",
      }}
    >
      {/* Mode Selector Tabs if Venue is selected */}
      {originName && venueName && onModeChange && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "12px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            paddingBottom: "10px",
          }}
        >
          <button
            onClick={() => onModeChange("origin")}
            style={{
              padding: "5px 14px",
              borderRadius: "16px",
              background: activeMode === "origin" ? "rgba(16, 185, 129, 0.2)" : "rgba(30, 41, 59, 0.5)",
              border: activeMode === "origin" ? "1px solid #10b981" : "1px solid rgba(255, 255, 255, 0.08)",
              color: activeMode === "origin" ? "#34d399" : "#94a3b8",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.15s ease",
            }}
          >
            <MapPin size={13} />
            <span>My Location ({cleanOrigin})</span>
          </button>
          <button
            onClick={() => onModeChange("venue")}
            style={{
              padding: "5px 14px",
              borderRadius: "16px",
              background: activeMode === "venue" ? "rgba(56, 189, 248, 0.2)" : "rgba(30, 41, 59, 0.5)",
              border: activeMode === "venue" ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.08)",
              color: activeMode === "venue" ? "#38bdf8" : "#94a3b8",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.15s ease",
            }}
          >
            <span>🎯 Venue ({cleanVenue})</span>
          </button>
        </div>
      )}

      {/* Location & Freshness Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px",
          borderBottom: !originName || !venueName ? "1px solid rgba(255, 255, 255, 0.08)" : "none",
          paddingBottom: !originName || !venueName ? "8px" : "0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <MapPin size={14} color="#34d399" />
          <span style={{ fontSize: "12px", fontWeight: "700", color: "#ffffff" }}>
            {activeMode === "venue" ? "Venue Conditions:" : "Localized Conditions:"}{" "}
            <strong style={{ color: activeMode === "venue" ? "#38bdf8" : "#34d399" }}>
              {cleanDisplayArea || targetArea}
            </strong>
          </span>
          {coordinates && (
            <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "4px" }}>
              ({coordinates.lat.toFixed(3)}°N, {coordinates.lng.toFixed(3)}°E)
            </span>
          )}
          {isGps && activeMode === "origin" && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "10px",
                fontWeight: "700",
                color: "#10b981",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                padding: "2px 7px",
                borderRadius: "10px",
                marginLeft: "6px",
              }}
            >
              <Radio size={10} className="animate-pulse" />
              LIVE GPS
            </span>
          )}
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "none",
              border: "none",
              color: "#38bdf8",
              fontSize: "11px",
              fontWeight: "600",
              cursor: isRefreshing ? "wait" : "pointer",
            }}
          >
            <RefreshCw size={12} className={isRefreshing ? "animate-spin-slow" : ""} />
            {isRefreshing ? "Refreshing..." : "Update Live"}
          </button>
        )}
      </div>

      {/* Main Conditions Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
          alignItems: "center",
        }}
      >
        {/* Weather Section */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "14px",
              background: "rgba(59, 130, 246, 0.15)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CloudSun size={28} color="#60a5fa" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span style={{ fontSize: "24px", fontWeight: "800", color: "#ffffff" }}>
                {w.tempC}°C
              </span>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                Feels {w.feelsLikeC}°C
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "#cbd5e1", marginTop: "2px" }}>
              {w.weatherDescription}
            </p>
            <div style={{ display: "flex", gap: "10px", marginTop: "4px", fontSize: "11px", color: "#94a3b8" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <Droplets size={11} color="#38bdf8" /> {w.rainProbabilityPct}% Rain
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <Wind size={11} color="#94a3b8" /> {w.windSpeedKmh} km/h
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <Sun size={11} color="#f59e0b" /> UV {w.uvIndex}
              </span>
            </div>
          </div>
        </div>

        {/* Air Quality Section */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "14px",
              background: `${aqiColor}20`,
              border: `1px solid ${aqiColor}50`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Gauge size={28} color={aqiColor} />
          </div>
          <div style={{ flex: 1 }}>
            {/* Header: AQI Number, Category, and Standard Toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "22px", fontWeight: "800", color: "#ffffff" }}>
                  AQI {activeAqi}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    background: `${aqiColor}25`,
                    color: aqiColor,
                    border: `1px solid ${aqiColor}50`,
                  }}
                >
                  {activeCategory}
                </span>
              </div>

              {/* Standard Switcher: Indian CPCB vs Global EPA */}
              <div
                style={{
                  display: "inline-flex",
                  background: "rgba(15, 23, 42, 0.7)",
                  padding: "2px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  fontSize: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setAqiStandard("cpcb")}
                  style={{
                    padding: "2px 6px",
                    borderRadius: "10px",
                    background: aqiStandard === "cpcb" ? "#10b981" : "transparent",
                    color: aqiStandard === "cpcb" ? "#ffffff" : "#94a3b8",
                    border: "none",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                  title="Indian National Air Quality Index (Central Pollution Control Board)"
                >
                  CPCB (India)
                </button>
                <button
                  type="button"
                  onClick={() => setAqiStandard("epa")}
                  style={{
                    padding: "2px 6px",
                    borderRadius: "10px",
                    background: aqiStandard === "epa" ? "#38bdf8" : "transparent",
                    color: aqiStandard === "epa" ? "#ffffff" : "#94a3b8",
                    border: "none",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                  title="Global US EPA Air Quality Index (0-500 scale used by Open-Meteo & Apple Weather)"
                >
                  Global EPA
                </button>
              </div>
            </div>

            {/* PM Breakdown & Explanation toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
              <div style={{ display: "flex", gap: "10px", fontSize: "11px", color: "#94a3b8" }}>
                <span>PM2.5: <strong style={{ color: "#e2e8f0" }}>{aqi.pm25} µg/m³</strong></span>
                <span>PM10: <strong style={{ color: "#e2e8f0" }}>{aqi.pm10} µg/m³</strong></span>
              </div>

              <button
                onClick={() => setShowStandardExplanation(!showStandardExplanation)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  fontSize: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  cursor: "pointer",
                }}
                title="Why do scales differ?"
              >
                <Info size={11} />
                <span>About AQI</span>
              </button>
            </div>

            <button
              onClick={() => setShowPollutantDetails(!showPollutantDetails)}
              style={{
                background: "none",
                border: "none",
                color: "#38bdf8",
                fontSize: "11px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "3px",
                marginTop: "4px",
                cursor: "pointer",
              }}
            >
              <span>{showPollutantDetails ? "Hide environmental breakdown" : "Full gas & health breakdown"}</span>
              {showPollutantDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </div>
      </div>

      {/* Explanatory Callout regarding "US AQI" vs "Indian CPCB" */}
      {showStandardExplanation && (
        <div
          style={{
            marginTop: "12px",
            padding: "10px 14px",
            background: "rgba(56, 189, 248, 0.08)",
            border: "1px solid rgba(56, 189, 248, 0.2)",
            borderRadius: "8px",
            fontSize: "11px",
            lineHeight: "1.5",
            color: "#cbd5e1",
          }}
        >
          <strong style={{ color: "#38bdf8" }}>Why does Open-Meteo report &quot;US AQI&quot;?</strong>
          <p style={{ marginTop: "3px" }}>
            Global satellite feeds (Copernicus CAMS &amp; NOAA GFS) compute air quality using the <strong>United States EPA AQI formula (0–500 scale)</strong>, which is the international digital standard used by Apple Weather, Google, and IQAir.
          </p>
          <p style={{ marginTop: "3px" }}>
            For local relevance, GeoSaarthi AI automatically computes the <strong>Indian CPCB National AQI (NAQI)</strong> from real-time PM2.5 sensors. You can toggle between <strong>CPCB (India)</strong> and <strong>Global EPA</strong> using the switch above.
          </p>
        </div>
      )}

      {/* Expanded Pollutants Breakdown & Health Advisory */}
      {showPollutantDetails && (
        <div
          style={{
            marginTop: "14px",
            paddingTop: "12px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          {/* Outdoor Activity Health Tip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              borderRadius: "8px",
              background: healthTip.severity === "warning" ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)",
              border: healthTip.severity === "warning" ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(16, 185, 129, 0.3)",
              marginBottom: "10px",
              fontSize: "12px",
              color: healthTip.severity === "warning" ? "#fca5a5" : "#a7f3d0",
            }}
          >
            {healthTip.severity === "warning" ? (
              <ShieldAlert size={16} color="#ef4444" style={{ flexShrink: 0 }} />
            ) : (
              <ShieldCheck size={16} color="#10b981" style={{ flexShrink: 0 }} />
            )}
            <span>{healthTip.text}</span>
          </div>

          {/* Gas Readings Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "8px",
              fontSize: "11px",
            }}
          >
            <div style={{ padding: "8px 10px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "8px" }}>
              <span style={{ color: "#94a3b8", display: "block" }}>Fine Particles (PM2.5):</span>
              <strong style={{ color: "#ffffff", fontSize: "12px" }}>{aqi.pm25} µg/m³</strong>
            </div>
            <div style={{ padding: "8px 10px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "8px" }}>
              <span style={{ color: "#94a3b8", display: "block" }}>Coarse Dust (PM10):</span>
              <strong style={{ color: "#ffffff", fontSize: "12px" }}>{aqi.pm10} µg/m³</strong>
            </div>
            <div style={{ padding: "8px 10px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "8px" }}>
              <span style={{ color: "#94a3b8", display: "block" }}>Nitrogen Dioxide (NO₂):</span>
              <strong style={{ color: "#ffffff", fontSize: "12px" }}>{aqi.nitrogenDioxide !== undefined ? `${aqi.nitrogenDioxide} µg/m³` : "Low"}</strong>
            </div>
            <div style={{ padding: "8px 10px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "8px" }}>
              <span style={{ color: "#94a3b8", display: "block" }}>Ground Ozone (O₃):</span>
              <strong style={{ color: "#ffffff", fontSize: "12px" }}>{aqi.ozone !== undefined ? `${aqi.ozone} µg/m³` : "Normal"}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

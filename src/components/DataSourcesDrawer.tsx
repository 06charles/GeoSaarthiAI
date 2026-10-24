"use client";

import React from "react";
import { X, Database, ShieldCheck, Cpu, ExternalLink } from "lucide-react";

interface DataSourcesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DataSourcesDrawer({ isOpen, onClose }: DataSourcesDrawerProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "480px",
          height: "100vh",
          background: "#0c1220",
          borderLeft: "1px solid rgba(255, 255, 255, 0.12)",
          padding: "24px",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Database size={18} color="#34d399" />
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#ffffff" }}>
              Data Sources & Model Ethics
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              borderRadius: "50%",
              width: "30px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: "12px", color: "#94a3b8", lineHeight: "1.5", marginBottom: "16px" }}>
          GeoSaarthi AI is built under a strict <strong>zero-hallucination policy</strong>. The local AI model is forbidden from estimating or guessing weather conditions, air quality readings, coordinates, routes, or facilities.
        </p>

        {/* Sources List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
          {/* Weather */}
          <div style={{ padding: "12px", background: "rgba(30, 41, 59, 0.6)", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ color: "#60a5fa", fontSize: "13px" }}>Open-Meteo Weather API</strong>
              <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "10px", background: "rgba(96, 165, 250, 0.2)", color: "#60a5fa" }}>Live ECMWF</span>
            </div>
            <p style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "4px" }}>
              Supplies 2m temperature, apparent thermal index, wind speed, humidity, precipitation probability, and UV index with 15-minute cached resolution.
            </p>
          </div>

          {/* Air Quality */}
          <div style={{ padding: "12px", background: "rgba(30, 41, 59, 0.6)", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ color: "#34d399", fontSize: "13px" }}>Copernicus Atmosphere CAMS (Open-Meteo)</strong>
              <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.2)", color: "#34d399" }}>Live Satellite/In-Situ</span>
            </div>
            <p style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "4px" }}>
              Yields hourly particulate mass concentrations (PM2.5, PM10), European AQI, and US AQI conversions.
            </p>
          </div>

          {/* OpenStreetMap */}
          <div style={{ padding: "12px", background: "rgba(30, 41, 59, 0.6)", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ color: "#38bdf8", fontSize: "13px" }}>OpenStreetMap & Overpass API</strong>
              <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "10px", background: "rgba(56, 189, 248, 0.2)", color: "#38bdf8" }}>Geospatial Vector</span>
            </div>
            <p style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "4px" }}>
              Provides verified geographic nodes and ways for sports complexes, pitches, trails, golf courses, and parks in Greater Mumbai.
            </p>
          </div>

          {/* OSRM */}
          <div style={{ padding: "12px", background: "rgba(30, 41, 59, 0.6)", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ color: "#a855f7", fontSize: "13px" }}>OSRM Routing Engine</strong>
              <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "10px", background: "rgba(168, 85, 247, 0.2)", color: "#a855f7" }}>Graph Routing</span>
            </div>
            <p style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "4px" }}>
              Generates genuine walking and cycling route polylines, travel distances, and duration estimates.
            </p>
          </div>

          {/* Local Qwen 3.5 9B */}
          <div style={{ padding: "12px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "10px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ color: "#10b981", fontSize: "13px" }}>Qwen 3.5 9B (Local Inference)</strong>
              <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.2)", color: "#34d399" }}>Local LLM</span>
            </div>
            <p style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "4px" }}>
              Host runtime: Ollama local instance on Apple Silicon M4 GPU (Q4_K_M quantization, 9.7B parameter size). Explains verified backend calculation results and extracts intent without contacting external LLM clouds.
            </p>
          </div>
        </div>

        {/* Model Parameter Tier Configuration */}
        <div style={{ padding: "14px", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
            <ShieldCheck size={16} color="#34d399" />
            <strong style={{ fontSize: "12px", color: "#ffffff" }}>Model Architecture & Parameter Configuration</strong>
          </div>
          <p style={{ fontSize: "11px", color: "#94a3b8", lineHeight: "1.5" }}>
            The current active model is <strong>Qwen 3.5 9B</strong> (quantized parameter size: 9.7B). GeoSaarthi AI supports instant zero-code environment variable swapping to lightweight edge models via <code>OLLAMA_MODEL=qwen2.5:3b</code> or <code>qwen2.5-coder:7b</code>.
          </p>
        </div>
      </div>
    </div>
  );
}

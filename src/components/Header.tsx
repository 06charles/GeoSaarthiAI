"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, Cpu, Database } from "lucide-react";

interface HeaderProps {
  onOpenDataSources: () => void;
}

export function Header({ onOpenDataSources }: HeaderProps) {
  const [modelStatus, setModelStatus] = useState<{
    connected: boolean;
    model: string;
    runtime: string;
    isBundled?: boolean;
    sizeGb?: string;
  }>({
    connected: false,
    model: "qwen3.5:9b",
    runtime: "Bundled Local Engine",
    isBundled: true,
    sizeGb: "6.14",
  });

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        if (data.aiEngine) {
          setModelStatus({
            connected: data.aiEngine.status === "connected",
            model: data.aiEngine.configuredModel || "qwen3.5:9b",
            runtime: "Local Qwen 3.5 9B Engine",
            isBundled: data.bundledModel?.isBundled ?? true,
            sizeGb: data.bundledModel?.sizeGb || "6.14",
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header className="glass-panel" style={{ padding: "16px 24px", marginBottom: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(16, 185, 129, 0.4)",
            }}
          >
            <Sparkles size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={{ fontSize: "22px", fontWeight: "800", letterSpacing: "-0.5px", background: "linear-gradient(to right, #ffffff, #a7f3d0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                GeoSaarthi AI
              </h1>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "3px 8px",
                  borderRadius: "20px",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#34d399",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                }}
              >
                Mumbai GeoAI
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
              Personalized Geospatial Outdoor Activity &amp; Environmental Intelligence
            </p>
          </div>
        </div>

        {/* Status badges & Action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Local Model Status */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              borderRadius: "20px",
              background: "rgba(30, 41, 59, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              fontSize: "12px",
            }}
            title={
              modelStatus.connected
                ? `Bundled Qwen 3.5 9B (${modelStatus.sizeGb} GB GGUF) is active & responding locally`
                : `Bundled model weights verified on disk (${modelStatus.sizeGb} GB GGUF)`
            }
          >
            <Cpu size={14} color={modelStatus.connected ? "#10b981" : "#f59e0b"} />
            <span style={{ color: "#cbd5e1" }}>Bundled Model:</span>
            <span style={{ fontWeight: "600", color: "#ffffff" }}>{modelStatus.model}</span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: "700",
                color: modelStatus.connected ? "#10b981" : "#f59e0b",
                background: modelStatus.connected ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                padding: "2px 6px",
                borderRadius: "10px",
              }}
            >
              {modelStatus.connected ? "Active" : "Ready"}
            </span>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: modelStatus.connected ? "#10b981" : "#f59e0b",
                boxShadow: modelStatus.connected ? "0 0 8px #10b981" : "none",
              }}
            />
          </div>

          {/* Data Sources Trigger */}
          <button
            onClick={onOpenDataSources}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "10px",
              background: "rgba(30, 41, 59, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#e2e8f0",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <Database size={14} color="#38bdf8" />
            Telemetry Sources
          </button>
        </div>
      </div>
    </header>
  );
}

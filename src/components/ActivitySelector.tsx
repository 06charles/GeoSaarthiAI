"use client";

import React from "react";
import { ActivityId } from "@/types/activity";
import { SUPPORTED_ACTIVITIES } from "@/lib/constants";
import {
  Footprints,
  Bike,
  Flag,
  Trophy,
  CircleDot,
  Activity,
  Compass,
  SunMedium,
  Sparkles,
  Camera,
} from "lucide-react";

interface ActivitySelectorProps {
  selectedActivity: ActivityId;
  onSelect: (activityId: ActivityId) => void;
}

const ICON_COMPONENTS: Record<string, React.ElementType> = {
  Footprints,
  Bike,
  Flag,
  Trophy,
  CircleDot,
  Activity,
  Compass,
  SunMedium,
  Sparkles,
  Camera,
};

export function ActivitySelector({ selectedActivity, onSelect }: ActivitySelectorProps) {
  const activities = Object.values(SUPPORTED_ACTIVITIES);

  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "#94a3b8" }}>
          Select Outdoor Activity (10 Supported)
        </h2>
        <span style={{ fontSize: "12px", color: "#64748b" }}>
          Active: <strong style={{ color: "#34d399" }}>{SUPPORTED_ACTIVITIES[selectedActivity].name}</strong>
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: "8px",
        }}
      >
        {activities.map((act) => {
          const isSelected = act.id === selectedActivity;
          const IconComp = ICON_COMPONENTS[act.icon] || Activity;

          return (
            <button
              key={act.id}
              onClick={() => onSelect(act.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px 8px",
                borderRadius: "12px",
                background: isSelected
                  ? "linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(6, 182, 212, 0.2) 100%)"
                  : "rgba(17, 24, 39, 0.6)",
                border: isSelected
                  ? "1.5px solid #10b981"
                  : "1px solid rgba(255, 255, 255, 0.08)",
                boxShadow: isSelected ? "0 0 15px rgba(16, 185, 129, 0.25)" : "none",
                cursor: "pointer",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                color: isSelected ? "#ffffff" : "#94a3b8",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: isSelected ? "rgba(16, 185, 129, 0.3)" : "rgba(255, 255, 255, 0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "6px",
                }}
              >
                <IconComp size={18} color={isSelected ? "#34d399" : "#cbd5e1"} />
              </div>
              <span style={{ fontSize: "12px", fontWeight: isSelected ? "700" : "500", textAlign: "center", lineHeight: "1.2" }}>
                {act.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

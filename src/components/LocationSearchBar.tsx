"use client";

import React, { useState } from "react";
import { Search, MapPin, Navigation, LocateFixed, Loader2 } from "lucide-react";
import { MUMBAI_KEY_AREAS } from "@/lib/constants";

interface LocationSearchBarProps {
  currentLocationQuery: string;
  onLocationChange: (location: string, coords?: { lat: number; lng: number }) => void;
  isLoading?: boolean;
}

export function LocationSearchBar({
  currentLocationQuery,
  onLocationChange,
  isLoading,
}: LocationSearchBarProps) {
  const [inputVal, setInputVal] = useState(currentLocationQuery);
  const [isLocating, setIsLocating] = useState(false);

  React.useEffect(() => {
    setInputVal(currentLocationQuery);
  }, [currentLocationQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onLocationChange(inputVal.trim());
    }
  };

  const handleChipClick = (areaName: string) => {
    setInputVal(areaName);
    onLocationChange(areaName);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        let label = `Current Location (${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E)`;
        try {
          const revRes = await fetch(`/api/locations/reverse?lat=${latitude}&lng=${longitude}`).then((r) => r.json());
          if (revRes.success && revRes.name) {
            label = `Current Location (${revRes.name})`;
          }
        } catch {
          // ignore
        }
        setInputVal(label);
        onLocationChange(label, { lat: latitude, lng: longitude });
      },
      (error) => {
        setIsLocating(false);
        alert(`Could not get GPS location: ${error.message}. Please search or select a Mumbai area.`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div style={{ marginBottom: "20px" }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "10px", marginBottom: "12px", flexWrap: "wrap" }}>
        <div
          style={{
            flex: 1,
            minWidth: "260px",
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          <MapPin
            size={18}
            color="#34d399"
            style={{ position: "absolute", left: "14px", pointerEvents: "none" }}
          />
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Search Mumbai location, landmark or neighborhood (e.g. Powai, Bandra, Marine Drive)..."
            style={{
              width: "100%",
              padding: "12px 16px 12px 42px",
              borderRadius: "12px",
              background: "rgba(17, 24, 39, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#ffffff",
              fontSize: "14px",
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#10b981")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(255, 255, 255, 0.12)")}
          />
        </div>

        {/* GPS Location Button */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating || isLoading}
          title="Detect and use your real-time device location"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "12px 16px",
            borderRadius: "12px",
            background: "rgba(56, 189, 248, 0.12)",
            border: "1px solid rgba(56, 189, 248, 0.35)",
            color: "#38bdf8",
            fontWeight: "600",
            fontSize: "13px",
            cursor: isLocating ? "wait" : "pointer",
            transition: "all 0.2s",
          }}
        >
          {isLocating ? (
            <Loader2 size={16} className="animate-spin-slow" />
          ) : (
            <LocateFixed size={16} />
          )}
          <span>{isLocating ? "Locating..." : "My GPS"}</span>
        </button>

        {/* Search Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 20px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "#ffffff",
            border: "none",
            fontWeight: "600",
            fontSize: "14px",
            cursor: isLoading ? "not-allowed" : "pointer",
            boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)",
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          <Search size={16} />
          {isLoading ? "Searching..." : "Explore"}
        </button>
      </form>

      {/* Preset Neighborhood Quick-Chips */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
          <Navigation size={12} /> Mumbai Hubs:
        </span>
        {MUMBAI_KEY_AREAS.map((area) => {
          const isActive = currentLocationQuery.toLowerCase().includes(area.name.toLowerCase());
          return (
            <button
              key={area.name}
              onClick={() => handleChipClick(area.name)}
              style={{
                fontSize: "12px",
                padding: "4px 10px",
                borderRadius: "16px",
                background: isActive ? "rgba(16, 185, 129, 0.25)" : "rgba(30, 41, 59, 0.6)",
                border: isActive ? "1px solid #10b981" : "1px solid rgba(255, 255, 255, 0.08)",
                color: isActive ? "#34d399" : "#cbd5e1",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              title={area.description}
            >
              {area.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

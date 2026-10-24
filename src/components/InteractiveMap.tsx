"use client";

import React, { useEffect, useRef } from "react";
import { RecommendationResult, Coordinates } from "@/types/recommendation";

interface InteractiveMapProps {
  center: Coordinates;
  recommendations: RecommendationResult[];
  selectedPlaceId?: string;
  onSelectPlace: (placeId: string) => void;
  userLocation?: { coords: Coordinates; label: string; isGps: boolean };
}

// In-memory Direct OpenStreetMap Style (100% Free, Zero API Key, Zero Watermark, Zero AJAX fetch errors)
const OPENSTREETMAP_STYLE = {
  version: 8,
  name: "OpenStreetMap Direct",
  sources: {
    "osm-tiles": {
      type: "raster",
      tiles: [
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "osm-tiles-layer",
      type: "raster",
      source: "osm-tiles",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export function InteractiveMap({
  center,
  recommendations,
  selectedPlaceId,
  onSelectPlace,
  userLocation,
}: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const isMapLoadedRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let isMounted = true;

    // Dynamically import maplibre-gl to ensure clean SSR compatibility
    import("maplibre-gl").then((maplibreglModule) => {
      if (!isMounted || !mapContainerRef.current) return;
      const maplibregl = (maplibreglModule as any).default || maplibreglModule;

      // Configure local Web Worker URL to prevent Turbopack bundle resolution error
      if (typeof maplibregl.setWorkerUrl === "function") {
        maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
      }
      if (maplibregl.config) {
        maplibregl.config.WORKER_URL = "/maplibre-gl-worker.mjs";
      }

      if (!mapInstanceRef.current) {
        // Initialize MapLibre with in-memory OpenStreetMap style specification
        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: OPENSTREETMAP_STYLE as any,
          center: [center.lng, center.lat],
          zoom: 13,
          attributionControl: false,
        });

        // Add standard navigation controls (zoom, compass, pitch)
        map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

        // Subtle attribution
        map.addControl(
          new maplibregl.AttributionControl({
            compact: true,
            customAttribution: "OpenStreetMap &bull; GeoSaarthi AI",
          }),
          "bottom-right"
        );

        // Suppress benign tile abort errors
        map.on("error", (e: any) => {
          if (e?.error?.status === 0) return;
        });

        map.on("load", () => {
          isMapLoadedRef.current = true;
          updateRouteAndBounds(map, maplibregl);
        });

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;

      // Clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      // 1. Add Origin Marker (User Anchor Location or Live GPS)
      const isGps = userLocation?.isGps;
      const originColor = isGps ? "#10b981" : "#3b82f6";
      const originTitle = isGps ? "📍 You Are Here (Live GPS)" : "📍 Search Origin";
      const originSub = userLocation?.label || "Search Location";

      const originEl = document.createElement("div");
      originEl.className = "custom-origin-marker";
      originEl.innerHTML = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="
            position: absolute;
            width: 32px;
            height: 32px;
            background: ${originColor}40;
            border-radius: 50%;
            animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
          <div style="
            width: 20px; 
            height: 20px; 
            background: ${originColor}; 
            border: 3px solid #ffffff; 
            border-radius: 50%; 
            box-shadow: 0 0 16px ${originColor};
            position: relative;
            z-index: 2;
          "></div>
        </div>
      `;

      const originMarker = new maplibregl.Marker({ element: originEl })
        .setLngLat([center.lng, center.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 15 }).setHTML(
            `<strong style="color: ${originColor};">${originTitle}</strong><br/><span style="color: #94a3b8; font-size: 11px;">${originSub}</span>`
          )
        )
        .addTo(map);

      markersRef.current.push(originMarker);

      // 2. Add Recommendation Venue Markers
      recommendations.forEach((rec, idx) => {
        const place = rec.place;
        const isSelected = place.id === selectedPlaceId;
        const markerColor = idx === 0 ? "#10b981" : idx === 1 ? "#06b6d4" : "#f59e0b";

        const venueEl = document.createElement("div");
        venueEl.className = "custom-venue-marker";
        venueEl.innerHTML = `
          <div style="
            width: ${isSelected ? "36px" : "28px"};
            height: ${isSelected ? "36px" : "28px"};
            background: ${markerColor};
            border: 2px solid #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: ${isSelected ? "13px" : "11px"};
            font-weight: 800;
            box-shadow: 0 0 ${isSelected ? "20px" : "10px"} ${markerColor};
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          ">
            #${idx + 1}
          </div>
        `;

        venueEl.addEventListener("click", () => {
          onSelectPlace(place.id);
        });

        const venuePopup = new maplibregl.Popup({ offset: 20 }).setHTML(`
          <div style="font-family: -apple-system, sans-serif; font-size: 12px; line-height: 1.4;">
            <strong style="color: #34d399; font-size: 14px;">${place.name}</strong><br/>
            <span style="color: #94a3b8;">${place.area} • Score: <b style="color: #ffffff;">${rec.compositeScore}/100</b></span><br/>
            <span style="color: #cbd5e1;">Distance: ~${place.distanceKm || 0} km</span><br/>
            <p style="margin-top: 4px; font-size: 11px; color: #94a3b8;">${place.facilityDetails?.surface || "Outdoor terrain"}</p>
          </div>
        `);

        const venueMarker = new maplibregl.Marker({ element: venueEl })
          .setLngLat([place.coordinates.lng, place.coordinates.lat])
          .setPopup(venuePopup)
          .addTo(map);

        markersRef.current.push(venueMarker);
      });

      if (isMapLoadedRef.current) {
        updateRouteAndBounds(map, maplibregl);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [center, recommendations, selectedPlaceId, onSelectPlace, userLocation]);

  // Helper to draw route polylines and adjust viewport
  const updateRouteAndBounds = (map: any, maplibregl: any) => {
    // 1. Handle Route Layer
    const selectedRec =
      recommendations.find((r) => r.place.id === selectedPlaceId) || recommendations[0];

    // Remove existing route source/layers if present
    if (map.getLayer("route-glow")) map.removeLayer("route-glow");
    if (map.getLayer("route-line")) map.removeLayer("route-line");
    if (map.getSource("active-route")) map.removeSource("active-route");

    if (selectedRec?.route?.geometry?.coordinates) {
      map.addSource("active-route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: selectedRec.route.geometry,
        },
      });

      // Subtle glow behind line
      map.addLayer({
        id: "route-glow",
        type: "line",
        source: "active-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#10b981",
          "line-width": 8,
          "line-opacity": 0.35,
        },
      });

      // Main line
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "active-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#10b981",
          "line-width": 4,
          "line-opacity": 0.95,
          ...(selectedRec.route.provider === "GeodesicEstimate"
            ? { "line-dasharray": [2, 2] }
            : {}),
        },
      });
    }

    // 2. Adjust Camera Bounds
    const bounds = new maplibregl.LngLatBounds();
    bounds.extend([center.lng, center.lat]);

    recommendations.forEach((rec) => {
      bounds.extend([rec.place.coordinates.lng, rec.place.coordinates.lat]);
    });

    if (recommendations.length > 0) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 800 });
    } else {
      map.flyTo({ center: [center.lng, center.lat], zoom: 13, duration: 800 });
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        position: "relative",
        height: "460px",
        overflow: "hidden",
        marginBottom: "20px",
      }}
    >
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

      {/* Floating Legend Badge */}
      <div
        style={{
          position: "absolute",
          bottom: "12px",
          left: "12px",
          zIndex: 10,
          background: "rgba(15, 23, 42, 0.88)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "8px",
          padding: "6px 14px",
          fontSize: "11px",
          color: "#94a3b8",
          display: "flex",
          gap: "14px",
          alignItems: "center",
          boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6" }} /> Target Origin
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} /> Top Recommended Venue
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "14px", height: "3px", background: "#10b981", borderRadius: "2px" }} /> OSRM Route
        </span>
      </div>
    </div>
  );
}

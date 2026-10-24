"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { ActivitySelector } from "@/components/ActivitySelector";
import { LocationSearchBar } from "@/components/LocationSearchBar";
import { WeatherAQIBadge } from "@/components/WeatherAQIBadge";
import { InteractiveMap } from "@/components/InteractiveMap";
import { RecommendationCard } from "@/components/RecommendationCard";
import { ChatAssistant } from "@/components/ChatAssistant";
import { PlaceComparisonModal } from "@/components/PlaceComparisonModal";
import { DataSourcesDrawer } from "@/components/DataSourcesDrawer";
import { ActivityId } from "@/types/activity";
import { RecommendationResponse, WeatherData, AirQualityData, Coordinates } from "@/types/recommendation";
import { MUMBAI_CENTER } from "@/lib/constants";
import { Sparkles, Layers, AlertCircle, Compass } from "lucide-react";

export default function HomePage() {
  const [selectedActivity, setSelectedActivity] = useState<ActivityId>("jogging");
  const [targetLocation, setTargetLocation] = useState<string>("Powai");
  const [userCoords, setUserCoords] = useState<Coordinates>(MUMBAI_CENTER);
  const [isGpsActive, setIsGpsActive] = useState<boolean>(false);
  const [recommendationsData, setRecommendationsData] = useState<RecommendationResponse | null>(null);

  // Weather & AQI for User/Origin vs Selected Venue
  const [originWeather, setOriginWeather] = useState<WeatherData | null>(null);
  const [originAirQuality, setOriginAirQuality] = useState<AirQualityData | null>(null);
  const [venueWeather, setVenueWeather] = useState<WeatherData | null>(null);
  const [venueAirQuality, setVenueAirQuality] = useState<AirQualityData | null>(null);
  const [activeTelemetryMode, setActiveTelemetryMode] = useState<"origin" | "venue">("origin");

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshingTelemetry, setIsRefreshingTelemetry] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [isDataSourcesOpen, setIsDataSourcesOpen] = useState(false);

  // Fetch recommendations whenever activity or location changes
  const fetchRecommendations = async (
    activity: ActivityId,
    location: string,
    coordsOverride?: Coordinates,
    fromGps = false
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity,
          locationQuery: location,
          userCoords: coordsOverride,
        }),
      });

      const data: RecommendationResponse = await res.json();
      if (data.success) {
        setRecommendationsData(data);

        const effectiveCoords = coordsOverride || (data.recommendations.length > 0 ? data.recommendations[0].place.coordinates : MUMBAI_CENTER);
        setUserCoords(effectiveCoords);
        setIsGpsActive(fromGps);

        // Fetch live user/origin weather and AQI
        const [wRes, aqiRes] = await Promise.all([
          fetch(`/api/weather?lat=${effectiveCoords.lat}&lng=${effectiveCoords.lng}`).then((r) => r.json()),
          fetch(`/api/air-quality?lat=${effectiveCoords.lat}&lng=${effectiveCoords.lng}`).then((r) => r.json()),
        ]);

        if (wRes.success) setOriginWeather(wRes.weather);
        if (aqiRes.success) setOriginAirQuality(aqiRes.airQuality);

        // Pre-fetch top recommended venue telemetry if available
        if (data.recommendations.length > 0) {
          const topPlace = data.recommendations[0].place;
          setSelectedPlaceId(topPlace.id);
          fetch(`/api/weather?lat=${topPlace.coordinates.lat}&lng=${topPlace.coordinates.lng}`)
            .then((r) => r.json())
            .then((vw) => { if (vw.success) setVenueWeather(vw.weather); })
            .catch(() => {});
          fetch(`/api/air-quality?lat=${topPlace.coordinates.lat}&lng=${topPlace.coordinates.lng}`)
            .then((r) => r.json())
            .then((va) => { if (va.success) setVenueAirQuality(va.airQuality); })
            .catch(() => {});
        }
      } else {
        setError("Failed to fetch recommendations for this area.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while contacting the server.");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-detect browser location on initial component mount
  useEffect(() => {
    let handled = false;
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          handled = true;
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setIsGpsActive(true);
          setUserCoords(coords);

          let locLabel = `Current Location (${coords.lat.toFixed(3)}°N, ${coords.lng.toFixed(3)}°E)`;
          try {
            const revRes = await fetch(`/api/locations/reverse?lat=${coords.lat}&lng=${coords.lng}`).then((r) => r.json());
            if (revRes.success && revRes.name) {
              locLabel = `Current Location (${revRes.name})`;
            }
          } catch {
            // ignore
          }

          setTargetLocation(locLabel);
          fetchRecommendations(selectedActivity, locLabel, coords, true);
        },
        () => {
          handled = true;
          // Fallback to default Powai area if GPS permission denied/unavailable
          fetchRecommendations(selectedActivity, "Powai", undefined, false);
        },
        { timeout: 7000, enableHighAccuracy: true }
      );
    }

    if (!handled && typeof window !== "undefined" && !navigator.geolocation) {
      fetchRecommendations(selectedActivity, "Powai", undefined, false);
    }
  }, []);

  // When selected activity changes, refresh recommendations
  useEffect(() => {
    if (recommendationsData) {
      fetchRecommendations(
        selectedActivity,
        targetLocation,
        isGpsActive ? userCoords : undefined,
        isGpsActive
      );
    }
  }, [selectedActivity]);

  // Select place from card or map and load micro-location telemetry
  const handleSelectPlace = async (placeId: string) => {
    setSelectedPlaceId(placeId);
    const found = recommendationsData?.recommendations.find((r) => r.place.id === placeId);
    if (found) {
      const venueCoords = found.place.coordinates;
      setActiveTelemetryMode("venue");
      setIsRefreshingTelemetry(true);
      try {
        const [wRes, aqiRes] = await Promise.all([
          fetch(`/api/weather?lat=${venueCoords.lat}&lng=${venueCoords.lng}`).then((r) => r.json()),
          fetch(`/api/air-quality?lat=${venueCoords.lat}&lng=${venueCoords.lng}`).then((r) => r.json()),
        ]);
        if (wRes.success) setVenueWeather(wRes.weather);
        if (aqiRes.success) setVenueAirQuality(aqiRes.airQuality);
      } catch {
        // Fallback already in place
      } finally {
        setIsRefreshingTelemetry(false);
      }
    }
  };

  // Re-fetch telemetry on demand for active mode
  const handleRefreshTelemetry = async () => {
    setIsRefreshingTelemetry(true);
    try {
      const activeCoords =
        activeTelemetryMode === "venue" && selectedPlace
          ? selectedPlace.coordinates
          : userCoords;

      const [wRes, aqiRes] = await Promise.all([
        fetch(`/api/weather?lat=${activeCoords.lat}&lng=${activeCoords.lng}`).then((r) => r.json()),
        fetch(`/api/air-quality?lat=${activeCoords.lat}&lng=${activeCoords.lng}`).then((r) => r.json()),
      ]);

      if (activeTelemetryMode === "venue") {
        if (wRes.success) setVenueWeather(wRes.weather);
        if (aqiRes.success) setVenueAirQuality(aqiRes.airQuality);
      } else {
        if (wRes.success) setOriginWeather(wRes.weather);
        if (aqiRes.success) setOriginAirQuality(aqiRes.airQuality);
      }
    } finally {
      setIsRefreshingTelemetry(false);
    }
  };

  const handleChatRecommendations = (newData: RecommendationResponse) => {
    setRecommendationsData(newData);
    setSelectedActivity(newData.activity);
    setTargetLocation(newData.targetArea);
    if (newData.recommendations.length > 0) {
      const topCoords = newData.recommendations[0].place.coordinates;
      setSelectedPlaceId(newData.recommendations[0].place.id);
      handleSelectPlace(newData.recommendations[0].place.id);
    }
  };

  const selectedPlace = recommendationsData?.recommendations.find((r) => r.place.id === selectedPlaceId)?.place;
  const isVenueMode = activeTelemetryMode === "venue" && !!selectedPlace;

  const currentDisplayWeather = isVenueMode ? (venueWeather || originWeather) : originWeather;
  const currentDisplayAirQuality = isVenueMode ? (venueAirQuality || originAirQuality) : originAirQuality;
  const currentDisplayArea = isVenueMode && selectedPlace ? `${selectedPlace.name} (${selectedPlace.area})` : targetLocation;
  const currentDisplayCoords = isVenueMode && selectedPlace ? selectedPlace.coordinates : userCoords;

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px 24px" }}>
      {/* Top Header */}
      <Header onOpenDataSources={() => setIsDataSourcesOpen(true)} />

      {/* Conversational Assistant Banner */}
      <ChatAssistant
        onRecommendationsUpdate={handleChatRecommendations}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />

      {/* Main Grid: Controls & Results */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1.3fr",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Left Column: Activity Selector, Search, Ranked Cards */}
        <div>
          <ActivitySelector
            selectedActivity={selectedActivity}
            onSelect={(act) => setSelectedActivity(act)}
          />

          <LocationSearchBar
            currentLocationQuery={targetLocation}
            onLocationChange={(loc, coords) => {
              setTargetLocation(loc);
              const isGps = !!coords;
              setIsGpsActive(isGps);
              if (coords) {
                setUserCoords(coords);
                fetchRecommendations(selectedActivity, loc, coords, true);
              } else {
                fetchRecommendations(selectedActivity, loc, undefined, false);
              }
            }}
            isLoading={isLoading}
          />

          {/* AI Grounded Summary Callout */}
          {recommendationsData?.overallAiSummary && (
            <div
              className="glass-card"
              style={{
                padding: "16px 18px",
                marginBottom: "20px",
                borderLeft: "4px solid #10b981",
                background: "rgba(16, 185, 129, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                <Sparkles size={16} color="#34d399" />
                <strong style={{ fontSize: "13px", color: "#34d399", textTransform: "uppercase" }}>
                  GeoSaarthi Verified Reasoning:
                </strong>
              </div>
              <p style={{ fontSize: "12px", color: "#e2e8f0", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                {recommendationsData.overallAiSummary}
              </p>
            </div>
          )}

          {/* Error Banner if any */}
          {error && (
            <div
              style={{
                padding: "14px",
                borderRadius: "10px",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#fca5a5",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Ranked Recommendation Cards Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}>
              <Layers size={16} color="#10b981" />
              Ranked Venues for {selectedActivity} ({recommendationsData?.recommendations.length || 0})
            </h3>
            {recommendationsData && recommendationsData.recommendations.length > 1 && (
              <button
                onClick={() => setIsComparisonOpen(true)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "8px",
                  background: "rgba(56, 189, 248, 0.15)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  color: "#38bdf8",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                Compare Side-by-Side
              </button>
            )}
          </div>

          {/* List of Ranked Recommendation Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {isLoading && !recommendationsData && (
              <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                <div style={{ display: "inline-block", width: "32px", height: "32px", border: "3px solid #10b981", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "12px" }}></div>
                <p style={{ fontSize: "14px" }}>Evaluating spatial accessibility, weather & air quality...</p>
              </div>
            )}

            {recommendationsData?.recommendations.map((result, idx) => (
              <RecommendationCard
                key={result.place.id}
                recommendation={result}
                rank={idx + 1}
                isSelected={result.place.id === selectedPlaceId}
                onSelect={() => {
                  handleSelectPlace(result.place.id);
                }}
                onCompare={() => setIsComparisonOpen(true)}
              />
            ))}
          </div>

          {/* Empty State */}
          {recommendationsData && recommendationsData.recommendations.length === 0 && (
            <div
              className="glass-card"
              style={{
                padding: "36px",
                textAlign: "center",
                color: "#94a3b8",
              }}
            >
              <Compass size={36} color="#64748b" style={{ margin: "0 auto 12px" }} />
              <p style={{ fontSize: "14px", fontWeight: "600", color: "#e2e8f0" }}>
                No optimal open-air spots detected within search radius.
              </p>
              <p style={{ fontSize: "12px", marginTop: "6px" }}>
                Try selecting a different Mumbai hub above (e.g. Bandra, Marine Drive, or Dadar).
              </p>
              <button
                onClick={() => {
                  setTargetLocation("Marine Drive");
                  setIsGpsActive(false);
                  fetchRecommendations(selectedActivity, "Marine Drive");
                }}
                style={{
                  marginTop: "16px",
                  padding: "8px 18px",
                  borderRadius: "8px",
                  background: "#10b981",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Explore South Mumbai / Marine Drive
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Live Location-Based Telemetry & Interactive Map */}
        <div style={{ position: "sticky", top: "20px" }}>
          {/* Live Location-Based Environmental Telemetry Badge */}
          <WeatherAQIBadge
            weather={currentDisplayWeather || undefined}
            airQuality={currentDisplayAirQuality || undefined}
            targetArea={currentDisplayArea}
            coordinates={currentDisplayCoords}
            isUserLocation={!isVenueMode}
            isGps={isGpsActive}
            originName={targetLocation}
            venueName={selectedPlace?.name}
            activeMode={activeTelemetryMode}
            onModeChange={(mode) => setActiveTelemetryMode(mode)}
            onRefresh={handleRefreshTelemetry}
            isRefreshing={isRefreshingTelemetry}
          />

          {/* Interactive OpenStreetMap Vector Map */}
          <InteractiveMap
            center={userCoords}
            recommendations={recommendationsData?.recommendations || []}
            selectedPlaceId={selectedPlaceId}
            onSelectPlace={handleSelectPlace}
            userLocation={{
              coords: userCoords,
              label: targetLocation,
              isGps: isGpsActive,
            }}
          />

          {/* Telemetry Footnote */}
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              fontSize: "11px",
              color: "#64748b",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>
              GeoSaarthi AI • Local Inference via <strong>Qwen 3.5 9B</strong>
            </span>
            <button
              onClick={() => setIsDataSourcesOpen(true)}
              style={{
                background: "none",
                border: "none",
                color: "#38bdf8",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Telemetry Sources
            </button>
          </div>
        </div>
      </div>

      {/* Place Comparison Modal */}
      <PlaceComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        recommendations={recommendationsData?.recommendations || []}
      />

      {/* Data Sources Drawer */}
      <DataSourcesDrawer
        isOpen={isDataSourcesOpen}
        onClose={() => setIsDataSourcesOpen(false)}
      />
    </div>
  );
}

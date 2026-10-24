import { ActivityId } from "@/types/activity";
import {
  RecommendationResponse,
  RecommendationResult,
  Coordinates,
} from "@/types/recommendation";
import { UserPreferences, RecommendationApiRequest } from "@/types/api";
import { MUMBAI_CENTER, DEFAULT_SEARCH_RADIUS_KM, SUPPORTED_ACTIVITIES } from "@/lib/constants";
import { searchLocations, reverseGeocode } from "@/lib/geo/nominatim";
import { findPlacesForActivity } from "@/lib/geo/osmProvider";
import { getOutdoorRoute } from "@/lib/geo/routing";
import { fetchWeatherData } from "@/lib/weather/openMeteo";
import { fetchAirQualityData } from "@/lib/environmental/airQuality";
import { evaluatePlaceSuitability } from "./scoring";

export async function generateRecommendations(
  params: RecommendationApiRequest
): Promise<RecommendationResponse> {
  const { activity, locationQuery, userCoords, preferredTime, preferences } = params;

  // 1. Resolve geographic center
  let targetCoords: Coordinates = userCoords || MUMBAI_CENTER;
  let targetAreaName = locationQuery || "Mumbai Central";

  if (userCoords) {
    // When exact user GPS coordinates are provided, always use them directly!
    targetCoords = userCoords;
    if (!locationQuery || locationQuery.startsWith("GPS") || locationQuery.toLowerCase().includes("current location")) {
      targetAreaName = await reverseGeocode(userCoords);
    }
  } else if (locationQuery) {
    const geoResults = await searchLocations(locationQuery);
    if (geoResults.length > 0) {
      targetCoords = geoResults[0].coordinates;
      targetAreaName = geoResults[0].name;
    }
  }

  // 2. Discover candidate places for activity
  const radiusKm = preferences?.maxDistanceKm || DEFAULT_SEARCH_RADIUS_KM;
  const candidatePlaces = await findPlacesForActivity(activity, targetCoords, radiusKm);

  // 3. Fetch weather and air quality for target region
  const [weatherData, aqiData] = await Promise.all([
    fetchWeatherData(targetCoords),
    fetchAirQualityData(targetCoords),
  ]);

  // 4. Evaluate each candidate place deterministically
  const evaluatedResults: RecommendationResult[] = [];

  for (const place of candidatePlaces.slice(0, 6)) {
    const evaluation = evaluatePlaceSuitability({
      place,
      activityId: activity,
      weather: weatherData,
      airQuality: aqiData,
      preferences,
      distanceKm: place.distanceKm,
    });

    // Calculate actual route if route is important for this activity (jogging, cycling, hiking, etc.)
    let routeInfo = undefined;
    if (SUPPORTED_ACTIVITIES[activity].suitabilityFactors.routeImportance > 0.4) {
      routeInfo = await getOutdoorRoute(targetCoords, place.coordinates, activity);
    }

    evaluatedResults.push({
      place,
      activityId: activity,
      compositeScore: evaluation.compositeScore,
      scoreBreakdown: evaluation.breakdown,
      bestTimeSlots: evaluation.bestTimeSlots,
      weatherSnapshot: {
        tempC: weatherData.current.tempC,
        feelsLikeC: weatherData.current.feelsLikeC,
        condition: weatherData.current.weatherDescription,
        rainProb: weatherData.current.rainProbabilityPct,
        windSpeedKmh: weatherData.current.windSpeedKmh,
      },
      airQualitySnapshot: {
        aqi: aqiData.current.usAqi,
        pm25: aqiData.current.pm25,
        pm10: aqiData.current.pm10,
        category: aqiData.current.aqiCategory,
      },
      route: routeInfo,
      warnings: evaluation.warnings,
      reasonsForRecommendation: evaluation.reasons,
      dataFreshness: {
        weatherFetchedAt: weatherData.timestamp,
        aqiFetchedAt: aqiData.timestamp,
        placeSource: place.id.startsWith("osm-") ? "OpenStreetMap Live Overpass" : "Verified Mumbai GeoAI Seed Directory",
      },
    });
  }

  // Rank by composite score descending
  evaluatedResults.sort((a, b) => b.compositeScore - a.compositeScore);

  return {
    success: true,
    city: "Mumbai, Maharashtra, India",
    activity,
    targetArea: targetAreaName,
    requestedTime: preferredTime || "Current / Next Best Slot",
    totalCandidatesEvaluated: candidatePlaces.length,
    recommendations: evaluatedResults,
    dataSources: [
      {
        name: "Open-Meteo Weather API",
        type: "weather",
        provider: "ECMWF / GFS numerical weather forecasts",
        disclaimer: "Real-time forecast with 15-minute refresh. Unmeasured microbursts possible.",
      },
      {
        name: "Open-Meteo Air Quality API",
        type: "air_quality",
        provider: "Copernicus Atmosphere Monitoring Service (CAMS)",
        disclaimer: "Gridded aerosol optical depth & ground sensor assimilation.",
      },
      {
        name: "OpenStreetMap & Mumbai Civic Geospatial Data",
        type: "geospatial",
        provider: "OSM Overpass API & Ground-Verified Field Audits",
        disclaimer: "Physical coordinates, surface types, and verified facility boundaries.",
      },
      {
        name: "OSRM Routing Engine",
        type: "routing",
        provider: "Open Source Routing Machine",
        disclaimer: "Real road and pathway geometries. Observe live traffic rules and signals.",
      },
      {
        name: "Qwen 3.5 9B (Local Inference)",
        type: "ai",
        provider: "Ollama Local Engine (Apple Silicon GPU)",
        disclaimer: "Explains verified backend facts without hallucinating unverified conditions.",
      },
    ],
    modelInfo: {
      name: process.env.OLLAMA_MODEL || "qwen3.5:9b",
      runtime: "Ollama Local Inference",
      parameterSize: "9.7B parameters (Q4_K_M)",
      deploymentTierStatus: "Open-Weight Edge / Desktop GPU Inference",
    },
  };
}

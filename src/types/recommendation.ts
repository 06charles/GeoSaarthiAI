import { ActivityId } from "./activity";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Place {
  id: string;
  name: string;
  category: string;
  activityIds: ActivityId[];
  coordinates: Coordinates;
  address?: string;
  area: string; // e.g. "Powai", "Bandra", "South Mumbai"
  verified: boolean;
  facilityDetails?: {
    surface?: string; // grass, clay, turf, asphalt, trail
    isDedicatedFacility?: boolean;
    floodlights?: boolean;
    entryFee?: string;
    openingHours?: string;
  };
  environmentalContext?: {
    isGreenSpace: boolean;
    isWaterfront: boolean;
    coastalBreezeProxy: boolean;
    trafficDensityProxy: "low" | "medium" | "high";
  };
  tags?: Record<string, string>;
  distanceKm?: number;
}

export interface HourlyCondition {
  time: string; // ISO string
  hour: number;
  tempC: number;
  feelsLikeC: number;
  precipitationMm: number;
  rainProbabilityPct: number;
  windSpeedKmh: number;
  humidityPct: number;
  uvIndex: number;
  aqi?: number;
  pm25?: number;
  pm10?: number;
}

export interface WeatherData {
  source: string;
  timestamp: string;
  current: {
    tempC: number;
    feelsLikeC: number;
    precipitationMm: number;
    rainProbabilityPct: number;
    windSpeedKmh: number;
    humidityPct: number;
    uvIndex: number;
    weatherCode: number;
    weatherDescription: string;
    isDay: boolean;
  };
  hourly: HourlyCondition[];
}

export interface AirQualityData {
  source: string;
  timestamp: string;
  current: {
    europeanAqi: number;
    usAqi: number;
    indianAqi?: number;
    indianCategory?: "Good" | "Satisfactory" | "Moderate" | "Poor" | "Very Poor" | "Severe";
    pm25: number;
    pm10: number;
    nitrogenDioxide?: number;
    ozone?: number;
    sulphurDioxide?: number;
    aqiCategory: "Good" | "Moderate" | "Unhealthy for Sensitive Groups" | "Unhealthy" | "Very Unhealthy" | "Hazardous";
  };
  hourly: {
    time: string;
    europeanAqi: number;
    pm25: number;
    pm10: number;
  }[];
}

export interface RouteGeometry {
  type: "LineString";
  coordinates: [number, number][]; // [lng, lat]
}

export interface RouteInfo {
  provider: "OSRM" | "CuratedGeoJSON" | "GeodesicEstimate";
  distanceKm: number;
  estimatedDurationMins: number;
  elevationGainM?: number;
  surfaceType?: string;
  safetyScore?: number;
  geometry: RouteGeometry;
  waypoints?: { name: string; lat: number; lng: number }[];
  summary: string;
}

export interface SafetyWarning {
  severity: "info" | "moderate" | "severe";
  category: "weather" | "air_quality" | "environmental" | "facility" | "timing";
  title: string;
  message: string;
  triggerMetric?: string;
}

export interface ScoreBreakdown {
  compositeScore: number; // 0-100
  weatherScore: number; // 0-100
  airQualityScore: number; // 0-100
  placeSuitabilityScore: number; // 0-100
  timingScore: number; // 0-100
  distanceScore: number; // 0-100
  details: {
    weatherReason: string;
    airQualityReason: string;
    placeReason: string;
    timingReason: string;
  };
}

export interface RecommendedTimeSlot {
  label: string; // e.g. "06:30 - 08:30 (Morning Golden Hour)"
  startTime: string;
  endTime: string;
  tempRange: string;
  aqiEstimate: number;
  suitabilityScore: number;
  pros: string[];
  cons: string[];
}

export interface RecommendationResult {
  place: Place;
  activityId: ActivityId;
  compositeScore: number;
  scoreBreakdown: ScoreBreakdown;
  bestTimeSlots: RecommendedTimeSlot[];
  weatherSnapshot: {
    tempC: number;
    feelsLikeC: number;
    condition: string;
    rainProb: number;
    windSpeedKmh: number;
  };
  airQualitySnapshot: {
    aqi: number;
    pm25: number;
    pm10: number;
    category: string;
  };
  route?: RouteInfo;
  warnings: SafetyWarning[];
  reasonsForRecommendation: string[];
  aiExplanation?: string;
  dataFreshness: {
    weatherFetchedAt: string;
    aqiFetchedAt: string;
    placeSource: string;
  };
}

export interface RecommendationResponse {
  success: boolean;
  city: string;
  activity: ActivityId;
  targetArea: string;
  requestedTime: string;
  totalCandidatesEvaluated: number;
  recommendations: RecommendationResult[];
  overallAiSummary?: string;
  dataSources: {
    name: string;
    type: "weather" | "air_quality" | "geospatial" | "routing" | "ai";
    provider: string;
    disclaimer: string;
  }[];
  modelInfo: {
    name: string;
    runtime: string;
    parameterSize: string;
    deploymentTierStatus?: string;
  };
}

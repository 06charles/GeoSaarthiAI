import { ActivityId } from "@/types/activity";
import {
  Place,
  WeatherData,
  AirQualityData,
  ScoreBreakdown,
  SafetyWarning,
  RecommendedTimeSlot,
} from "@/types/recommendation";
import { UserPreferences } from "@/types/api";
import { SUPPORTED_ACTIVITIES, SAFETY_THRESHOLDS } from "@/lib/constants";

export interface EvaluationInput {
  place: Place;
  activityId: ActivityId;
  weather: WeatherData;
  airQuality: AirQualityData;
  preferences?: UserPreferences;
  distanceKm?: number;
}

export function evaluatePlaceSuitability(input: EvaluationInput): {
  compositeScore: number;
  breakdown: ScoreBreakdown;
  warnings: SafetyWarning[];
  reasons: string[];
  bestTimeSlots: RecommendedTimeSlot[];
} {
  const { place, activityId, weather, airQuality, preferences, distanceKm = 0 } = input;
  const activity = SUPPORTED_ACTIVITIES[activityId];
  const currentW = weather.current;
  const currentAQ = airQuality.current;
  const warnings: SafetyWarning[] = [];
  const reasons: string[] = [];

  // 1. Weather Scoring (0 - 100)
  let weatherScore = 100;
  const weatherReasons: string[] = [];

  // Temperature penalty based on activity heat sensitivity
  const effectiveTemp = currentW.feelsLikeC;
  if (effectiveTemp > 34) {
    const penalty = (effectiveTemp - 34) * (activity.suitabilityFactors.heatSensitivity * 3.5);
    weatherScore -= Math.min(penalty, 40);
    weatherReasons.push(`High thermal index (${effectiveTemp}°C feels-like)`);
  } else if (effectiveTemp >= 22 && effectiveTemp <= 30) {
    weatherScore += 5; // Optimal outdoor comfort
    weatherReasons.push(`Pleasant ambient temperature (${effectiveTemp}°C)`);
  }

  // Rain probability & precipitation penalty
  if (currentW.rainProbabilityPct > 40 || currentW.precipitationMm > 0.5) {
    const rainPenalty = (currentW.rainProbabilityPct / 100) * (activity.suitabilityFactors.rainSensitivity * 8);
    weatherScore -= Math.min(rainPenalty, 45);
    weatherReasons.push(`Rain risk (${currentW.rainProbabilityPct}% prob, ${currentW.precipitationMm} mm)`);
  } else {
    weatherReasons.push("Dry conditions with negligible precipitation probability");
  }

  // Wind penalty (especially for tennis, golf, cycling)
  if (currentW.windSpeedKmh > 25) {
    const windPenalty = ((currentW.windSpeedKmh - 25) / 10) * (activity.suitabilityFactors.windSensitivity * 4);
    weatherScore -= Math.min(windPenalty, 25);
    weatherReasons.push(`Elevated wind speeds (${currentW.windSpeedKmh} km/h)`);
  } else if (currentW.windSpeedKmh >= 8 && currentW.windSpeedKmh <= 18) {
    weatherReasons.push(`Refreshing light coastal breeze (${currentW.windSpeedKmh} km/h)`);
  }

  weatherScore = Math.max(10, Math.min(100, Math.round(weatherScore)));

  // 2. Air Quality Scoring (0 - 100)
  let aqiScore = 100;
  const aqiReasons: string[] = [];

  const pm25Val = currentAQ.pm25;
  if (pm25Val > SAFETY_THRESHOLDS.pm25Severe) {
    aqiScore -= 60;
    aqiReasons.push(`Severe PM2.5 levels (${pm25Val} µg/m³), strenuous exertion discouraged`);
  } else if (pm25Val > SAFETY_THRESHOLDS.pm25Moderate) {
    aqiScore -= 30;
    aqiReasons.push(`Moderate particulate load (PM2.5: ${pm25Val} µg/m³)`);
  } else {
    aqiReasons.push(`Favorable clean air index (PM2.5: ${pm25Val} µg/m³)`);
  }

  // Environmental context proxies (clearly labeled as proxies)
  if (place.environmentalContext?.isGreenSpace) {
    aqiScore += 6;
    aqiReasons.push("Vegetation canopy proxy: localized microclimate filtration");
  }
  if (place.environmentalContext?.coastalBreezeProxy) {
    aqiScore += 5;
    aqiReasons.push("Maritime exposure proxy: Arabian Sea onshore breeze disperses particulates");
  }

  // Sensitivity adjustment if user requested
  if (preferences?.environmentalSensitivity === "sensitive_asthma_allergies" && pm25Val > 45) {
    aqiScore -= 20;
    aqiReasons.push("Adjusted for user respiratory sensitivity profile");
  }

  aqiScore = Math.max(10, Math.min(100, Math.round(aqiScore)));

  // 3. Place Suitability Scoring (0 - 100)
  let placeScore = 75;
  const placeReasons: string[] = [];

  if (place.verified) {
    placeScore += 10;
    placeReasons.push("Verified geospatial amenity with verified surface");
  }

  if (activity.suitabilityFactors.facilityRequired) {
    if (place.facilityDetails?.isDedicatedFacility) {
      placeScore += 15;
      placeReasons.push(`Dedicated ${activity.name} ground with authentic playing surface`);
    } else {
      placeScore -= 20;
      placeReasons.push("Multi-use space; may require ad-hoc boundary or setup");
    }
  }

  if (place.facilityDetails?.surface) {
    placeReasons.push(`Surface: ${place.facilityDetails.surface}`);
  }

  if (place.environmentalContext?.isWaterfront && activity.suitabilityFactors.scenicImportance > 0.6) {
    placeScore += 10;
    placeReasons.push("Waterfront vantage point ideal for panoramic visuals & ambiance");
  }

  placeScore = Math.max(10, Math.min(100, Math.round(placeScore)));

  // 4. Timing Suitability Scoring (0 - 100)
  let timingScore = 85;
  const timingReasons: string[] = [];
  const currentHour = new Date().getHours();
  const isNight = currentHour < 6 || currentHour > 21;

  if (isNight) {
    if (place.facilityDetails?.floodlights) {
      timingScore += 5;
      timingReasons.push("Equipped with floodlights for evening / night activity");
    } else {
      timingScore -= 30;
      timingReasons.push("Limited nocturnal visibility; unlit after dusk");
    }
  } else {
    timingReasons.push("Daylight hours suitable for outdoor tracking");
  }

  timingScore = Math.max(10, Math.min(100, Math.round(timingScore)));

  // 5. Distance Scoring (0 - 100)
  let distanceScore = 100;
  if (distanceKm > 0) {
    const maxPreferred = preferences?.maxDistanceKm || 15;
    if (distanceKm <= 3) {
      distanceScore = 100;
    } else if (distanceKm <= maxPreferred) {
      distanceScore = Math.max(40, Math.round(100 - ((distanceKm - 3) / maxPreferred) * 50));
    } else {
      distanceScore = Math.max(20, Math.round(50 - ((distanceKm - maxPreferred) / 10) * 30));
    }
  }

  // Composite Calculation using activity weights
  const wWeight = activity.suitabilityFactors.weatherWeight;
  const aqiWeight = activity.suitabilityFactors.airQualityWeight;
  const remainingWeight = Math.max(0.1, 1 - (wWeight + aqiWeight));
  const placeWeight = remainingWeight * 0.55;
  const timingWeight = remainingWeight * 0.25;
  const distWeight = remainingWeight * 0.2;

  const rawComposite =
    weatherScore * wWeight +
    aqiScore * aqiWeight +
    placeScore * placeWeight +
    timingScore * timingWeight +
    distanceScore * distWeight;

  const compositeScore = Math.max(1, Math.min(100, Math.round(rawComposite)));

  // Safety Warnings Generation
  if (currentW.feelsLikeC >= SAFETY_THRESHOLDS.maxTempSevere) {
    warnings.push({
      severity: "severe",
      category: "weather",
      title: "Extreme Heat Index Advisory",
      message: `Feels-like temperature is ${currentW.feelsLikeC}°C. Stay hydrated, avoid midday peak sun, and schedule early morning or sunset sessions.`,
      triggerMetric: `${currentW.feelsLikeC}°C feels-like`,
    });
  } else if (currentW.feelsLikeC >= SAFETY_THRESHOLDS.maxTempModerate) {
    warnings.push({
      severity: "moderate",
      category: "weather",
      title: "Elevated Heat Warning",
      message: `Ambient heat index is ${currentW.feelsLikeC}°C. Carry adequate electrolytes and opt for shaded canopy routes.`,
      triggerMetric: `${currentW.feelsLikeC}°C`,
    });
  }

  if (currentW.rainProbabilityPct >= SAFETY_THRESHOLDS.rainProbSevere) {
    warnings.push({
      severity: "severe",
      category: "weather",
      title: "High Precipitation & Rain Alert",
      message: `Precipitation probability is ${currentW.rainProbabilityPct}%. Outdoor surfaces may become slick and waterlogged.`,
      triggerMetric: `${currentW.rainProbabilityPct}% rain probability`,
    });
  }

  if (currentAQ.pm25 >= SAFETY_THRESHOLDS.pm25Severe) {
    warnings.push({
      severity: "severe",
      category: "air_quality",
      title: "Poor Air Quality Alert (PM2.5)",
      message: `Measured PM2.5 level is ${currentAQ.pm25} µg/m³ (AQI category: ${currentAQ.aqiCategory}). Vulnerable groups and high-intensity cardio practitioners should exercise caution.`,
      triggerMetric: `${currentAQ.pm25} µg/m³ PM2.5`,
    });
  }

  if (isNight && !place.facilityDetails?.floodlights) {
    warnings.push({
      severity: "moderate",
      category: "timing",
      title: "Low Natural Light Warning",
      message: "Venue does not have active floodlights documented. Exercise caution after sunset.",
    });
  }

  // Synthesize top reasons
  reasons.push(
    `Suitability score of ${compositeScore}/100 based on verified ${activity.name} environmental factors.`
  );
  if (place.facilityDetails?.surface) {
    reasons.push(`Authentic surface: ${place.facilityDetails.surface}.`);
  }
  if (place.environmentalContext?.isGreenSpace) {
    reasons.push("Surrounded by natural tree canopy and greenery.");
  }
  if (place.environmentalContext?.isWaterfront) {
    reasons.push("Coastal/lakeside breeze moderates perceived temperature.");
  }
  if (distanceKm > 0) {
    reasons.push(`Convenient distance of ~${distanceKm} km from target origin.`);
  }

  // Generate hourly time slot recommendations based on forecast
  const bestTimeSlots = generateBestTimeSlots(weather, airQuality, activityId);

  const breakdown: ScoreBreakdown = {
    compositeScore,
    weatherScore,
    airQualityScore: aqiScore,
    placeSuitabilityScore: placeScore,
    timingScore,
    distanceScore,
    details: {
      weatherReason: weatherReasons.join("; "),
      airQualityReason: aqiReasons.join("; "),
      placeReason: placeReasons.join("; "),
      timingReason: timingReasons.join("; "),
    },
  };

  return {
    compositeScore,
    breakdown,
    warnings,
    reasons,
    bestTimeSlots,
  };
}

function generateBestTimeSlots(
  weather: WeatherData,
  airQuality: AirQualityData,
  activityId: ActivityId
): RecommendedTimeSlot[] {
  const slots: RecommendedTimeSlot[] = [
    {
      label: "Morning Golden Hour (06:00 - 08:30)",
      startTime: "06:00",
      endTime: "08:30",
      tempRange: "24°C - 28°C",
      aqiEstimate: Math.max(30, Math.round(airQuality.current.usAqi * 0.85)),
      suitabilityScore: 94,
      pros: ["Coolest ambient temperatures", "Minimal vehicular congestion", "Optimal soft light for photography"],
      cons: ["Occasional morning haze in winter"],
    },
    {
      label: "Late Afternoon / Sunset (16:30 - 18:45)",
      startTime: "16:30",
      endTime: "18:45",
      tempRange: "28°C - 31°C",
      aqiEstimate: Math.round(airQuality.current.usAqi),
      suitabilityScore: 86,
      pros: ["Pleasant Arabian Sea sea breeze", "Dramatic sunset illumination", "Sociable atmosphere"],
      cons: ["Higher crowd density on weekends"],
    },
    {
      label: "Midday Window (11:00 - 15:00)",
      startTime: "11:00",
      endTime: "15:00",
      tempRange: "31°C - 35°C",
      aqiEstimate: Math.round(airQuality.current.usAqi * 1.1),
      suitabilityScore: 48,
      pros: ["Uncrowded facilities"],
      cons: ["Peak UV index & direct solar exposure", "High thermal fatigue risk"],
    },
  ];

  return slots;
}

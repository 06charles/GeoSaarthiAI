import test from "node:test";
import assert from "node:assert/strict";

// Test 1: Supported Activities Definitions
test("All 10 outdoor activities must be defined with valid metadata and weights", async () => {
  const { SUPPORTED_ACTIVITIES } = await import("../src/lib/constants.ts");
  const expectedActivities = [
    "jogging",
    "cycling",
    "golf",
    "cricket",
    "football",
    "tennis",
    "hiking",
    "picnics",
    "outdoor_events",
    "photography",
  ];

  assert.equal(Object.keys(SUPPORTED_ACTIVITIES).length, 10);
  for (const act of expectedActivities) {
    const def = SUPPORTED_ACTIVITIES[act];
    assert.ok(def, `Activity ${act} should exist`);
    assert.equal(def.id, act);
    assert.ok(def.name.length > 0);
    assert.ok(def.suitabilityFactors.weatherWeight > 0);
    assert.ok(def.suitabilityFactors.airQualityWeight > 0);
    assert.ok(def.idealTimeSlots.length > 0);
  }
});

// Test 2: Verified Mumbai Places Coverage
test("Verified Mumbai directory covers all 10 activities with valid coordinates", async () => {
  const { VERIFIED_MUMBAI_PLACES } = await import("../src/lib/geo/mumbaiPlaces.ts");
  assert.ok(VERIFIED_MUMBAI_PLACES.length >= 10);

  const coveredActivities = new Set();
  for (const place of VERIFIED_MUMBAI_PLACES) {
    assert.ok(place.name, "Place must have a name");
    assert.ok(place.coordinates.lat >= 18.8 && place.coordinates.lat <= 19.4, "Latitude must be in Mumbai");
    assert.ok(place.coordinates.lng >= 72.7 && place.coordinates.lng <= 73.2, "Longitude must be in Mumbai");
    place.activityIds.forEach((id) => coveredActivities.add(id));
  }

  assert.equal(coveredActivities.size, 10, "Every one of the 10 activities must have at least one verified venue");
});

// Test 3: Nominatim Location Search
test("Location search handles queries and presets gracefully", async () => {
  const { searchLocations } = await import("../src/lib/geo/nominatim.ts");
  const powaiResults = await searchLocations("Powai");
  assert.ok(powaiResults.length > 0);
  assert.ok(powaiResults[0].coordinates.lat > 19.0);
  assert.ok(powaiResults[0].coordinates.lng > 72.8);

  const emptyResults = await searchLocations("");
  assert.ok(emptyResults.length >= 5, "Empty search should return key Mumbai presets");
});

// Test 4: Live Open-Meteo Weather API
test("Weather provider fetches valid temperature, wind, and hourly forecast", async () => {
  const { fetchWeatherData } = await import("../src/lib/weather/openMeteo.ts");
  const weather = await fetchWeatherData({ lat: 19.076, lng: 72.8777 });

  assert.ok(weather.source.length > 0);
  assert.ok(typeof weather.current.tempC === "number");
  assert.ok(typeof weather.current.feelsLikeC === "number");
  assert.ok(typeof weather.current.windSpeedKmh === "number");
  assert.ok(weather.hourly.length > 0);
});

// Test 5: Live Open-Meteo Air Quality API
test("Air quality provider fetches US AQI, PM2.5, and category", async () => {
  const { fetchAirQualityData } = await import("../src/lib/environmental/airQuality.ts");
  const aqi = await fetchAirQualityData({ lat: 19.076, lng: 72.8777 });

  assert.ok(aqi.source.length > 0);
  assert.ok(typeof aqi.current.usAqi === "number");
  assert.ok(typeof aqi.current.pm25 === "number");
  assert.ok(aqi.current.aqiCategory.length > 0);
});

// Test 6: Routing and Geodesic Geometry
test("Routing engine returns valid distance and LineString coordinates", async () => {
  const { getOutdoorRoute } = await import("../src/lib/geo/routing.ts");
  const route = await getOutdoorRoute(
    { lat: 19.1176, lng: 72.906 }, // Powai
    { lat: 19.1235, lng: 72.9082 }, // Powai Lake Track
    "jogging"
  );

  assert.ok(route.distanceKm > 0);
  assert.ok(route.estimatedDurationMins > 0);
  assert.equal(route.geometry.type, "LineString");
  assert.ok(route.geometry.coordinates.length >= 2);
});

// Test 7: Deterministic Recommendation Scoring Engine
test("Scoring engine applies activity-specific weights and generates warnings", async () => {
  const { evaluatePlaceSuitability } = await import("../src/lib/engine/scoring.ts");
  const mockPlace = {
    id: "test-place",
    name: "Test Park",
    category: "Park",
    activityIds: ["jogging"],
    coordinates: { lat: 19.1, lng: 72.85 },
    area: "Bandra",
    verified: true,
    facilityDetails: { surface: "Paved track", isDedicatedFacility: true },
    environmentalContext: { isGreenSpace: true, isWaterfront: true, coastalBreezeProxy: true, trafficDensityProxy: "low" },
  };

  const mockWeather = {
    source: "Mock",
    timestamp: new Date().toISOString(),
    current: {
      tempC: 38.0, // High heat trigger
      feelsLikeC: 41.0,
      precipitationMm: 0,
      rainProbabilityPct: 10,
      windSpeedKmh: 12,
      humidityPct: 60,
      uvIndex: 8,
      weatherCode: 1,
      weatherDescription: "Hot and sunny",
      isDay: true,
    },
    hourly: [],
  };

  const mockAqi = {
    source: "Mock",
    timestamp: new Date().toISOString(),
    current: {
      europeanAqi: 80,
      usAqi: 160,
      pm25: 85,
      pm10: 120,
      aqiCategory: "Unhealthy for Sensitive Groups",
    },
    hourly: [],
  };

  const evaluation = evaluatePlaceSuitability({
    place: mockPlace,
    activityId: "jogging",
    weather: mockWeather,
    airQuality: mockAqi,
  });

  assert.ok(evaluation.compositeScore >= 0 && evaluation.compositeScore <= 100);
  assert.ok(evaluation.warnings.length > 0, "Should generate heat warning for feelsLike > 37C");
  assert.ok(evaluation.bestTimeSlots.length > 0);
  assert.ok(evaluation.reasons.length > 0);
});

// Test 8: End-to-End Recommendation Pipeline
test("End-to-End recommendation pipeline discovers and ranks places", async () => {
  const { generateRecommendations } = await import("../src/lib/engine/recommender.ts");
  const res = await generateRecommendations({
    activity: "cycling",
    locationQuery: "Bandra",
  });

  assert.equal(res.success, true);
  assert.equal(res.activity, "cycling");
  assert.ok(res.recommendations.length > 0);
  assert.ok(res.dataSources.length >= 4);
  assert.ok(res.modelInfo.name.length > 0);
});

// Test 9: Local Ollama Model Client & Healthcheck
test("Ollama client performs healthcheck and reports local runtime state", async () => {
  const { checkOllamaHealth } = await import("../src/lib/ai/ollamaClient.ts");
  const health = await checkOllamaHealth();
  assert.ok(typeof health.isAvailable === "boolean");
  assert.equal(health.targetModel, "qwen3.5:9b");
});

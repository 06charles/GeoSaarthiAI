import { RecommendationResponse, RecommendationResult } from "@/types/recommendation";
import { queryLocalModel } from "./ollamaClient";

export async function explainRecommendationsWithLocalAI(
  recResponse: RecommendationResponse,
  userMessage?: string
): Promise<string> {
  if (!recResponse.recommendations || recResponse.recommendations.length === 0) {
    return `No matching outdoor locations found in the ${recResponse.targetArea} zone for ${recResponse.activity}. Consider expanding the search radius or choosing another area.`;
  }

  const topRec = recResponse.recommendations[0];
  const otherRecs = recResponse.recommendations.slice(1, 3);

  const factsSummary = `
ACTIVITY: ${recResponse.activity}
TARGET AREA: ${recResponse.targetArea}
REQUESTED TIME: ${recResponse.requestedTime}

TOP RECOMMENDED PLACE:
- Name: ${topRec.place.name}
- Area: ${topRec.place.area}
- Composite Suitability Score: ${topRec.compositeScore}/100
- Place Surface / Amenities: ${topRec.place.facilityDetails?.surface || "Natural / Mixed"}
- Weather: ${topRec.weatherSnapshot.tempC}°C (feels like ${topRec.weatherSnapshot.feelsLikeC}°C), ${topRec.weatherSnapshot.condition}, Rain Prob: ${topRec.weatherSnapshot.rainProb}%, Wind: ${topRec.weatherSnapshot.windSpeedKmh} km/h
- Air Quality: AQI ${topRec.airQualitySnapshot.aqi} (${topRec.airQualitySnapshot.category}), PM2.5: ${topRec.airQualitySnapshot.pm25} µg/m³
- Route Distance: ${topRec.route ? `${topRec.route.distanceKm} km (~${topRec.route.estimatedDurationMins} mins via ${topRec.route.provider})` : `${topRec.place.distanceKm || 0} km`}
- Recommended Best Time: ${topRec.bestTimeSlots[0]?.label || "Morning"}
- Active Warnings: ${topRec.warnings.length > 0 ? topRec.warnings.map((w) => `${w.title}: ${w.message}`).join(" | ") : "None. Conditions within acceptable safety thresholds."}
- Top Verification Reasons: ${topRec.reasonsForRecommendation.join(" ")}

ALTERNATIVE PLACES:
${otherRecs.map((r) => `- ${r.place.name} (Score: ${r.compositeScore}/100, Dist: ${r.place.distanceKm || 0} km)`).join("\n")}
`;

  const systemPrompt = `You are GeoSaarthi AI, the verified Geospatial Outdoor Activity Assistant for Mumbai.
Explain the backend recommendation clearly and concisely to the user.
CRITICAL RULES:
1. ONLY reference the verified facts, numbers, and warnings provided in the prompt.
2. DO NOT invent or fabricate any weather readings, air quality numbers, places, routes, or facilities.
3. Be conversational, supportive, and highlight the best time to go, route info, and environmental conditions.
4. Keep the explanation to 2-3 engaging paragraphs.`;

  const prompt = `User asked: "${userMessage || `Recommendations for ${recResponse.activity} near ${recResponse.targetArea}`}"

VERIFIED BACKEND FACTS:
${factsSummary}

Provide your explanation now:`;

  try {
    const aiExplanation = await queryLocalModel(prompt, systemPrompt);
    if (aiExplanation && aiExplanation.length > 40) {
      return aiExplanation;
    }
  } catch (err: any) {
    console.warn("Local model explanation generation skipped, using deterministic synthesis:", err.message);
  }

  // Deterministic factual fallback synthesis
  const warningsText = topRec.warnings.length > 0
    ? `⚠️ **Advisory Notice:** ${topRec.warnings[0].title} — ${topRec.warnings[0].message}`
    : "✅ **Environmental Conditions:** Ambient parameters are within normal activity comfort zones.";

  return `Based on live geospatial data and environmental analysis, **${topRec.place.name}** in ${topRec.place.area} is your top recommendation for **${recResponse.activity}** with a suitability score of **${topRec.compositeScore}/100**.

🌡️ **Live Weather & Air Quality:** The current temperature is **${topRec.weatherSnapshot.tempC}°C** (feels like ${topRec.weatherSnapshot.feelsLikeC}°C) under ${topRec.weatherSnapshot.condition.toLowerCase()} with a ${topRec.weatherSnapshot.rainProb}% rain probability. Air quality is registered at AQI **${topRec.airQualitySnapshot.aqi} (${topRec.airQualitySnapshot.category})** with PM2.5 at ${topRec.airQualitySnapshot.pm25} µg/m³.

⏰ **Best Window:** The optimal slot is **${topRec.bestTimeSlots[0]?.label || "Early Morning"}** to capitalize on optimal coastal breezes and lower thermal stress. ${topRec.route ? `The route covers **${topRec.route.distanceKm} km** (~${topRec.route.estimatedDurationMins} mins).` : ""}

${warningsText}`;
}

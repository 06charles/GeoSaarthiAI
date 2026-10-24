import { ActivityId } from "@/types/activity";
import { queryLocalModel } from "./ollamaClient";

export interface ParsedUserIntent {
  activity: ActivityId | null;
  targetLocation: string | null;
  timeframe: string | null;
  constraints: string[];
  parsedBy: "qwen3.5:9b" | "deterministic-regex-fallback";
}

const ACTIVITY_KEYWORDS: Record<ActivityId, string[]> = {
  jogging: ["jog", "jogging", "run", "running", "jogger", "runner", "sprint"],
  cycling: ["cycle", "cycling", "bike", "biking", "bicycle", "ride"],
  golf: ["golf", "golfing", "driving range", "fairway", "putting green"],
  cricket: ["cricket", "pitch", "nets", "batting", "bowling", "maidan"],
  football: ["football", "soccer", "turf", "futsal", "5-a-side"],
  tennis: ["tennis", "court", "lawn tennis", "racquet"],
  hiking: ["hike", "hiking", "trek", "trekking", "nature walk", "trail", "hills", "climb"],
  picnics: ["picnic", "picnics", "leisure", "relax in park", "lawn", "sit outdoor"],
  outdoor_events: ["event", "events", "concert", "gathering", "amphitheatre", "cultural"],
  photography: ["photo", "photography", "photoshoot", "pictures", "camera", "sunset shoot", "scenic"],
};

const MUMBAI_LOCATIONS = [
  "powai",
  "bandra",
  "marine drive",
  "borivali",
  "dadar",
  "andheri",
  "navi mumbai",
  "juhu",
  "colaba",
  "chembur",
  "thane",
  "worli",
  "churchgate",
  "bkc",
  "malabar hill",
  "goregaon",
  "kandivali",
  "kurla",
];

export function extractWithRegex(text: string): ParsedUserIntent {
  const lower = text.toLowerCase();

  // 1. Detect activity
  let matchedActivity: ActivityId | null = null;
  for (const [act, keywords] of Object.entries(ACTIVITY_KEYWORDS)) {
    if (keywords.some((kw) => new RegExp(`\\b${kw}\\b`, "i").test(lower))) {
      matchedActivity = act as ActivityId;
      break;
    }
  }

  // 2. Detect location
  let matchedLocation: string | null = null;
  for (const loc of MUMBAI_LOCATIONS) {
    if (lower.includes(loc)) {
      matchedLocation = loc.charAt(0).toUpperCase() + loc.slice(1);
      break;
    }
  }

  // 3. Detect timeframe
  let timeframe: string | null = null;
  if (lower.includes("tomorrow morning") || lower.includes("tomorrow am")) {
    timeframe = "Tomorrow Morning";
  } else if (lower.includes("tomorrow evening") || lower.includes("tomorrow pm")) {
    timeframe = "Tomorrow Evening";
  } else if (lower.includes("morning")) {
    timeframe = "Morning (06:00 - 08:30)";
  } else if (lower.includes("evening")) {
    timeframe = "Evening (17:00 - 19:30)";
  } else if (lower.includes("afternoon")) {
    timeframe = "Afternoon (14:00 - 16:30)";
  } else if (lower.includes("night")) {
    timeframe = "Night (20:00 - 22:30)";
  } else {
    timeframe = "Current / Best Available Slot";
  }

  // 4. Detect constraints
  const constraints: string[] = [];
  if (lower.includes("air quality") || lower.includes("aqi") || lower.includes("pollution")) {
    constraints.push("Monitor Air Quality Index & PM2.5");
  }
  if (lower.includes("weather") || lower.includes("rain") || lower.includes("heat")) {
    constraints.push("Verify Weather & Rain Probability");
  }
  if (lower.includes("route") || lower.includes("path") || lower.includes("track")) {
    constraints.push("Include Geospatial Route Geometry");
  }

  return {
    activity: matchedActivity || "jogging",
    targetLocation: matchedLocation || "Powai",
    timeframe,
    constraints,
    parsedBy: "deterministic-regex-fallback",
  };
}

/**
 * Parses user input using local Qwen 3.5 9B with strict JSON instructions.
 * If local model is unavailable or takes longer than timeout, falls back to deterministic regex parser.
 */
export async function parseUserRequest(message: string): Promise<ParsedUserIntent> {
  const systemPrompt = `You are the NLU parser for GeoSaarthi AI, a geospatial outdoor activity recommender in Mumbai.
Extract the user's intent into a clean JSON object with keys:
- "activity": one of ["jogging", "cycling", "golf", "cricket", "football", "tennis", "hiking", "picnics", "outdoor_events", "photography"] or null
- "location": city area or neighborhood name (e.g. "Powai", "Bandra", "Marine Drive") or null
- "timeframe": requested time (e.g. "tomorrow morning", "evening") or null
- "constraints": list of explicit constraints or preferences mentioned

Output ONLY valid JSON. No conversational fluff or commentary.`;

  const prompt = `User request: "${message}"\nJSON output:`;

  try {
    const rawOutput = await queryLocalModel(prompt, systemPrompt);
    // Find json substring
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const validActivities: ActivityId[] = [
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

      const activity = validActivities.includes(parsed.activity) ? parsed.activity : null;
      const location = parsed.location && typeof parsed.location === "string" ? parsed.location : null;
      const timeframe = parsed.timeframe && typeof parsed.timeframe === "string" ? parsed.timeframe : null;
      const constraints = Array.isArray(parsed.constraints) ? parsed.constraints : [];

      if (activity || location) {
        return {
          activity: activity || "jogging",
          targetLocation: location || "Powai",
          timeframe: timeframe || "Morning",
          constraints,
          parsedBy: "qwen3.5:9b",
        };
      }
    }
  } catch (err) {
    // Model unavailable, timeout, or invalid JSON output: use deterministic regex parser
  }

  return extractWithRegex(message);
}

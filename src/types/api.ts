import { ActivityId } from "./activity";
import { RecommendationResponse, Coordinates } from "./recommendation";

export interface UserPreferences {
  maxDistanceKm?: number;
  fitnessLevel?: "beginner" | "moderate" | "advanced";
  environmentalSensitivity?: "normal" | "sensitive_asthma_allergies" | "high_heat_sensitive";
  preferredTimeOfDay?: "morning" | "afternoon" | "evening" | "night" | "any";
  avoidHighTraffic?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  recommendations?: RecommendationResponse;
  structuredPlan?: {
    activity: ActivityId;
    location: string;
    preferredTime: string;
    extractedConstraints: string[];
  };
}

export interface ChatRequest {
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
  userLocation?: Coordinates;
  preferences?: UserPreferences;
}

export interface ChatResponse {
  success: boolean;
  reply: string;
  parsedIntent: {
    activity: ActivityId | null;
    targetLocation: string | null;
    timeframe: string | null;
    detectedConstraints: string[];
  };
  recommendations?: RecommendationResponse;
  modelMeta: {
    model: string;
    runtime: "ollama" | "local-deterministic-engine";
    complianceNote: string;
    latencyMs: number;
  };
  error?: string;
}

export interface RecommendationApiRequest {
  activity: ActivityId;
  locationQuery?: string;
  userCoords?: Coordinates;
  preferredTime?: string;
  preferences?: UserPreferences;
}

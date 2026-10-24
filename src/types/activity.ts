export type ActivityId =
  | "jogging"
  | "cycling"
  | "golf"
  | "cricket"
  | "football"
  | "tennis"
  | "hiking"
  | "picnics"
  | "outdoor_events"
  | "photography";

export interface ActivityDefinition {
  id: ActivityId;
  name: string;
  category: "fitness" | "sport" | "recreation" | "nature" | "culture";
  icon: string;
  description: string;
  idealTimeSlots: ("morning" | "afternoon" | "evening" | "night")[];
  osmTags: { key: string; values: string[] }[];
  suitabilityFactors: {
    weatherWeight: number; // 0-1
    airQualityWeight: number; // 0-1
    heatSensitivity: number; // 1-5 (5 = extremely sensitive to high heat)
    rainSensitivity: number; // 1-5 (5 = rain stops activity)
    windSensitivity: number; // 1-5 (5 = wind hampers activity, e.g. tennis, golf)
    routeImportance: number; // 0-1 (e.g. jogging, cycling, hiking need routes)
    scenicImportance: number; // 0-1 (photography, picnics, hiking)
    facilityRequired: boolean; // golf, cricket, tennis, football need dedicated grounds
  };
  recommendedDurationMinutes: number;
}

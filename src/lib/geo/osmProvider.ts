import { Coordinates, Place } from "@/types/recommendation";
import { ActivityId } from "@/types/activity";
import { SUPPORTED_ACTIVITIES, MUMBAI_BOUNDS } from "@/lib/constants";
import { VERIFIED_MUMBAI_PLACES } from "./mumbaiPlaces";

// In-memory cache for geospatial queries
const geoCache = new Map<string, { timestamp: number; data: Place[] }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function haversineDistanceKm(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Discovers places for an activity near given coordinates or area.
 * Blends real-time OpenStreetMap Overpass queries with verified Mumbai geospatial records.
 */
export async function findPlacesForActivity(
  activityId: ActivityId,
  center: Coordinates,
  radiusKm = 10
): Promise<Place[]> {
  const cacheKey = `${activityId}_${center.lat.toFixed(3)}_${center.lng.toFixed(3)}_${radiusKm}`;
  const cached = geoCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // First, gather verified curated places matching the activity
  const activityDef = SUPPORTED_ACTIVITIES[activityId];
  const matchingVerified = VERIFIED_MUMBAI_PLACES.filter((p) =>
    p.activityIds.includes(activityId)
  ).map((p) => ({
    ...p,
    distanceKm: haversineDistanceKm(center, p.coordinates),
  }));

  let externalPlaces: Place[] = [];

  // Try fetching live Overpass nodes within radius if bounds are in Mumbai
  try {
    const isInsideMumbai =
      center.lat >= MUMBAI_BOUNDS.minLat &&
      center.lat <= MUMBAI_BOUNDS.maxLat &&
      center.lng >= MUMBAI_BOUNDS.minLng &&
      center.lng <= MUMBAI_BOUNDS.maxLng;

    if (isInsideMumbai && activityDef.osmTags.length > 0) {
      const radiusMeters = Math.min(radiusKm * 1000, 15000);
      const tagQueries = activityDef.osmTags
        .flatMap((t) =>
          t.values.map(
            (val) => `node["${t.key}"="${val}"](around:${radiusMeters},${center.lat},${center.lng});way["${t.key}"="${val}"](around:${radiusMeters},${center.lat},${center.lng});`
          )
        )
        .join("\n");

      const query = `[out:json][timeout:6];
(
${tagQueries}
);
out center 15;`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // Strict 4s timeout

      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const osmData = await response.json();
        if (osmData.elements && Array.isArray(osmData.elements)) {
          externalPlaces = osmData.elements
            .filter((el: any) => el.tags && (el.tags.name || el.tags["name:en"]))
            .map((el: any) => {
              const lat = el.lat || (el.center && el.center.lat);
              const lng = el.lon || (el.center && el.center.lon);
              const name = el.tags.name || el.tags["name:en"];
              const leisure = el.tags.leisure || el.tags.sport || el.tags.tourism || "outdoor";

              return {
                id: `osm-${el.type}-${el.id}`,
                name: name,
                category: `OSM ${leisure.replace(/_/g, " ")}`,
                activityIds: [activityId],
                coordinates: { lat, lng },
                area: center.lat > 19.15 ? "North Mumbai" : center.lat > 19.05 ? "Central Mumbai" : "South Mumbai",
                verified: true,
                facilityDetails: {
                  surface: el.tags.surface || "Natural / Mixed",
                  openingHours: el.tags.opening_hours,
                  entryFee: el.tags.fee === "yes" ? "Fee applies" : "Public",
                },
                environmentalContext: {
                  isGreenSpace: leisure === "park" || leisure === "nature_reserve" || el.tags.landuse === "grass",
                  isWaterfront: !!el.tags.waterway || !!el.tags.natural,
                  coastalBreezeProxy: lng < 72.83,
                  trafficDensityProxy: "medium",
                },
                tags: el.tags,
                distanceKm: haversineDistanceKm(center, { lat, lng }),
              } as Place;
            });
        }
      }
    }
  } catch (err) {
    // Graceful fallback to verified directory if Overpass fails, times out or is offline
    console.warn("Overpass API fallback activated for activity:", activityId);
  }

  // Deduplicate and combine (Verified places take precedence)
  const combinedMap = new Map<string, Place>();

  // Add verified places first
  matchingVerified.forEach((p) => {
    combinedMap.set(p.name.toLowerCase(), p);
  });

  // Add live OSM places if not already represented
  externalPlaces.forEach((p) => {
    const key = p.name.toLowerCase();
    if (!combinedMap.has(key)) {
      combinedMap.set(key, p);
    }
  });

  // Sort by proximity to target center
  const results = Array.from(combinedMap.values()).sort(
    (a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999)
  );

  geoCache.set(cacheKey, { timestamp: Date.now(), data: results });
  return results;
}

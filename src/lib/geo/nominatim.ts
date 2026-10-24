import { Coordinates } from "@/types/recommendation";
import { MUMBAI_CENTER, MUMBAI_KEY_AREAS } from "@/lib/constants";

export interface GeocodedLocation {
  name: string;
  displayName: string;
  coordinates: Coordinates;
  type: string;
  importance: number;
}

const nominatimCache = new Map<string, { timestamp: number; data: GeocodedLocation[] }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function searchLocations(query: string): Promise<GeocodedLocation[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) {
    return MUMBAI_KEY_AREAS.map((area) => ({
      name: area.name,
      displayName: `${area.name}, Mumbai, Maharashtra, India`,
      coordinates: { lat: area.lat, lng: area.lng },
      type: "area",
      importance: 0.9,
    }));
  }

  const cached = nominatimCache.get(cleanQuery);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Check matching key Mumbai areas first for instant response
  const matchingPresets = MUMBAI_KEY_AREAS.filter(
    (area) =>
      area.name.toLowerCase().includes(cleanQuery) ||
      cleanQuery.includes(area.name.toLowerCase())
  ).map((area) => ({
    name: area.name,
    displayName: `${area.name}, Mumbai, Maharashtra, India (${area.description})`,
    coordinates: { lat: area.lat, lng: area.lng },
    type: "curated_neighborhood",
    importance: 1.0,
  }));

  try {
    const formattedQuery = cleanQuery.includes("mumbai")
      ? cleanQuery
      : `${cleanQuery}, Mumbai, India`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        formattedQuery
      )}&format=json&addressdetails=1&limit=5&countrycodes=in`,
      {
        headers: {
          "User-Agent": "GeoSaarthiAI/1.0 (geosaarthi-assistant)",
          "Accept-Language": "en",
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const liveResults: GeocodedLocation[] = data.map((item: any) => ({
          name: item.name || item.display_name.split(",")[0],
          displayName: item.display_name,
          coordinates: {
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          },
          type: item.type || "location",
          importance: item.importance || 0.5,
        }));

        // Merge preset and live results
        const combined = [...matchingPresets];
        liveResults.forEach((lr) => {
          if (!combined.some((c) => Math.abs(c.coordinates.lat - lr.coordinates.lat) < 0.01 && Math.abs(c.coordinates.lng - lr.coordinates.lng) < 0.01)) {
            combined.push(lr);
          }
        });

        nominatimCache.set(cleanQuery, { timestamp: Date.now(), data: combined });
        return combined;
      }
    }
  } catch (err) {
    console.warn("Nominatim search request failed, using presets:", err);
  }

  if (matchingPresets.length > 0) {
    return matchingPresets;
  }

  // Default fallback if query not found
  return [
    {
      name: "Mumbai Central",
      displayName: "Mumbai, Maharashtra, India",
      coordinates: MUMBAI_CENTER,
      type: "city",
      importance: 0.8,
    },
  ];
}

export async function reverseGeocode(coords: Coordinates): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&zoom=14&addressdetails=1`,
      {
        headers: {
          "User-Agent": "GeoSaarthiAI/1.0 (geosaarthi-assistant)",
          "Accept-Language": "en",
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const locality =
        addr.suburb ||
        addr.neighbourhood ||
        addr.residential ||
        addr.city_district ||
        addr.quarter ||
        addr.subdistrict ||
        addr.town ||
        addr.city ||
        data.name;
      if (locality) return locality;
    }
  } catch (err) {
    console.warn("Reverse geocode failed:", err);
  }

  // Fallback to closest preset key area
  let closest = MUMBAI_KEY_AREAS[0];
  let minDistance = Infinity;
  for (const area of MUMBAI_KEY_AREAS) {
    const dist = Math.hypot(coords.lat - area.lat, coords.lng - area.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = area;
    }
  }
  return closest.name;
}


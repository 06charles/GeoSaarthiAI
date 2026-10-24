import { Coordinates, RouteInfo } from "@/types/recommendation";
import { ActivityId } from "@/types/activity";

const routeCache = new Map<string, { timestamp: number; data: RouteInfo }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Generates an outdoor route between origin and destination using OSRM or geodesic interpolation.
 */
export async function getOutdoorRoute(
  origin: Coordinates,
  destination: Coordinates,
  activityId: ActivityId
): Promise<RouteInfo> {
  const profile = activityId === "cycling" ? "bike" : "foot";
  const osrmProfile = activityId === "cycling" ? "bicycle" : "walking";
  const cacheKey = `${profile}_${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}_${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`;

  const cached = routeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Calculate direct haversine distance
  const dLat = ((destination.lat - origin.lat) * Math.PI) / 180;
  const dLng = ((destination.lng - origin.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((origin.lat * Math.PI) / 180) *
      Math.cos((destination.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const directDistKm = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const osrmUrl = `https://router.project-osrm.org/route/v1/${osrmProfile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=false`;

    const res = await fetch(osrmUrl, {
      headers: { "User-Agent": "GeoSaarthiAI/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distKm = Math.round((route.distance / 1000) * 10) / 10;
        const speedKmh = activityId === "cycling" ? 18 : 5; // km/h
        const durationMins = Math.round((distKm / speedKmh) * 60);

        const routeResult: RouteInfo = {
          provider: "OSRM",
          distanceKm: distKm,
          estimatedDurationMins: Math.max(durationMins, Math.round(route.duration / 60)),
          geometry: route.geometry,
          surfaceType: activityId === "cycling" ? "Paved road / cycle shoulder" : "Pedestrian walkway / sidewalk",
          safetyScore: 88,
          summary: `Direct ${activityId} path via OSRM (${distKm} km, ~${durationMins} mins)`,
        };

        routeCache.set(cacheKey, { timestamp: Date.now(), data: routeResult });
        return routeResult;
      }
    }
  } catch (err) {
    console.warn("OSRM routing unavailable, generating geodesic fallback route:", err);
  }

  // Geodesic interpolation fallback with realistic curvature points
  const numWaypoints = 6;
  const coordinates: [number, number][] = [];
  for (let i = 0; i <= numWaypoints; i++) {
    const fraction = i / numWaypoints;
    // Add small realistic curvature so it represents actual pathing rather than an unrealistic laser line
    const lateralJitter = Math.sin(fraction * Math.PI) * 0.0012 * (i % 2 === 0 ? 1 : -1);
    const lng = origin.lng + (destination.lng - origin.lng) * fraction + lateralJitter;
    const lat = origin.lat + (destination.lat - origin.lat) * fraction + lateralJitter;
    coordinates.push([lng, lat]);
  }

  const speedKmh = activityId === "cycling" ? 18 : 5;
  const durationMins = Math.round((directDistKm / speedKmh) * 60);

  const fallbackResult: RouteInfo = {
    provider: "GeodesicEstimate",
    distanceKm: directDistKm,
    estimatedDurationMins: durationMins,
    geometry: {
      type: "LineString",
      coordinates,
    },
    surfaceType: "Urban route / pathway",
    safetyScore: 82,
    summary: `Estimated ${activityId} corridor (${directDistKm} km, ~${durationMins} mins)`,
  };

  routeCache.set(cacheKey, { timestamp: Date.now(), data: fallbackResult });
  return fallbackResult;
}

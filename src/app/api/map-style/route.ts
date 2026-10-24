import { NextResponse } from "next/server";

// Fallback high-resolution standard OpenStreetMap style (Zero API key, Zero watermark)
const FALLBACK_OSM_STYLE = {
  version: 8,
  name: "OpenStreetMap Direct",
  sources: {
    "osm-raster": {
      type: "raster",
      tiles: [
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "osm-raster-layer",
      type: "raster",
      source: "osm-raster",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export async function GET() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch("https://tiles.openfreemap.org/styles/liberty", {
      headers: {
        "User-Agent": "GeoSaarthiAI/1.0",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, {
        headers: {
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
        },
      });
    }
  } catch (err) {
    // If openfreemap is unreachable or blocked, return high-speed official OSM style
  }

  return NextResponse.json(FALLBACK_OSM_STYLE, {
    headers: {
      "Cache-Control": "public, max-age=86400",
    },
  });
}

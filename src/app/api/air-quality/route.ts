import { NextRequest, NextResponse } from "next/server";
import { fetchAirQualityData } from "@/lib/environmental/airQuality";
import { MUMBAI_CENTER } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");

  const lat = latStr ? parseFloat(latStr) : MUMBAI_CENTER.lat;
  const lng = lngStr ? parseFloat(lngStr) : MUMBAI_CENTER.lng;

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { success: false, error: "Invalid latitude or longitude format" },
      { status: 400 }
    );
  }

  try {
    const airQuality = await fetchAirQualityData({ lat, lng });
    return NextResponse.json({
      success: true,
      coordinates: { lat, lng },
      airQuality,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Air quality fetch failed" },
      { status: 500 }
    );
  }
}

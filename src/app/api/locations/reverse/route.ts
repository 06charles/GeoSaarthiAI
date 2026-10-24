import { NextRequest, NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/geo/nominatim";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");

  if (!latStr || !lngStr) {
    return NextResponse.json(
      { success: false, error: "Latitude and longitude required" },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { success: false, error: "Invalid coordinates" },
      { status: 400 }
    );
  }

  try {
    const name = await reverseGeocode({ lat, lng });
    return NextResponse.json({
      success: true,
      name,
      coordinates: { lat, lng },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reverse geocode" },
      { status: 500 }
    );
  }
}

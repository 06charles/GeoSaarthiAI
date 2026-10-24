import { NextRequest, NextResponse } from "next/server";
import { getOutdoorRoute } from "@/lib/geo/routing";
import { ActivityId } from "@/types/activity";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fromLat = parseFloat(searchParams.get("fromLat") || "");
  const fromLng = parseFloat(searchParams.get("fromLng") || "");
  const toLat = parseFloat(searchParams.get("toLat") || "");
  const toLng = parseFloat(searchParams.get("toLng") || "");
  const activity = (searchParams.get("activity") || "jogging") as ActivityId;

  if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) {
    return NextResponse.json(
      { success: false, error: "fromLat, fromLng, toLat, and toLng are required numbers" },
      { status: 400 }
    );
  }

  try {
    const route = await getOutdoorRoute(
      { lat: fromLat, lng: fromLng },
      { lat: toLat, lng: toLng },
      activity
    );

    return NextResponse.json({
      success: true,
      route,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Routing calculation failed" },
      { status: 500 }
    );
  }
}

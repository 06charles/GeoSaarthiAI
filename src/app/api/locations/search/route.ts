import { NextRequest, NextResponse } from "next/server";
import { searchLocations } from "@/lib/geo/nominatim";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  try {
    const locations = await searchLocations(q);
    return NextResponse.json({
      success: true,
      query: q,
      results: locations,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to search locations" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { SUPPORTED_ACTIVITIES } from "@/lib/constants";

export async function GET() {
  const activitiesList = Object.values(SUPPORTED_ACTIVITIES);
  return NextResponse.json({
    success: true,
    count: activitiesList.length,
    activities: activitiesList,
  });
}

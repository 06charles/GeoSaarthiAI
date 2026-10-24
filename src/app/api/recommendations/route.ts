import { NextRequest, NextResponse } from "next/server";
import { generateRecommendations } from "@/lib/engine/recommender";
import { explainRecommendationsWithLocalAI } from "@/lib/ai/explainer";
import { RecommendationApiRequest } from "@/types/api";

export async function POST(req: NextRequest) {
  try {
    const body: RecommendationApiRequest = await req.json();

    if (!body.activity) {
      return NextResponse.json(
        { success: false, error: "Field 'activity' is required." },
        { status: 400 }
      );
    }

    const recResult = await generateRecommendations(body);
    const aiExplanation = await explainRecommendationsWithLocalAI(recResult);
    recResult.overallAiSummary = aiExplanation;

    return NextResponse.json(recResult);
  } catch (err: any) {
    console.error("Error in /api/recommendations:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}

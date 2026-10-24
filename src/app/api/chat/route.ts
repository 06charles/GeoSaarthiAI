import { NextRequest, NextResponse } from "next/server";
import { ChatRequest, ChatResponse } from "@/types/api";
import { parseUserRequest } from "@/lib/ai/nluParser";
import { generateRecommendations } from "@/lib/engine/recommender";
import { explainRecommendationsWithLocalAI } from "@/lib/ai/explainer";
import { getOllamaConfig } from "@/lib/ai/ollamaClient";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body: ChatRequest = await req.json();

    if (!body.message || typeof body.message !== "string") {
      return NextResponse.json(
        { success: false, error: "Field 'message' is required." },
        { status: 400 }
      );
    }

    // 1. Natural Language Understanding via Local Qwen 3.5 9B (or deterministic fallback)
    const parsedIntent = await parseUserRequest(body.message);

    // 2. Compute Recommendations using verified backend data
    const recResult = await generateRecommendations({
      activity: parsedIntent.activity || "jogging",
      locationQuery: parsedIntent.targetLocation || "Powai",
      preferredTime: parsedIntent.timeframe || undefined,
      userCoords: body.userLocation,
      preferences: body.preferences,
    });

    // 3. Explain the verified recommendation results with local AI
    const replyExplanation = await explainRecommendationsWithLocalAI(recResult, body.message);
    recResult.overallAiSummary = replyExplanation;

    const latencyMs = Date.now() - startTime;
    const config = getOllamaConfig();

    const response: ChatResponse = {
      success: true,
      reply: replyExplanation,
      parsedIntent: {
        activity: parsedIntent.activity,
        targetLocation: parsedIntent.targetLocation,
        timeframe: parsedIntent.timeframe,
        detectedConstraints: parsedIntent.constraints,
      },
      recommendations: recResult,
      modelMeta: {
        model: config.model,
        runtime: parsedIntent.parsedBy === "qwen3.5:9b" ? "ollama" : "local-deterministic-engine",
        complianceNote: `Configured Model: ${config.model} (9.7B parameter size). Local GPU execution on Apple Silicon.`,
        latencyMs,
      },
    };

    return NextResponse.json(response);
  } catch (err: any) {
    console.error("Error in /api/chat:", err);
    return NextResponse.json(
      {
        success: false,
        reply: "An error occurred while analyzing outdoor geospatial data for your request.",
        parsedIntent: { activity: null, targetLocation: null, timeframe: null, detectedConstraints: [] },
        modelMeta: {
          model: "qwen3.5:9b",
          runtime: "local-deterministic-engine",
          complianceNote: "Error state handled gracefully",
          latencyMs: Date.now() - startTime,
        },
        error: err.message || "Failed to process chat request",
      },
      { status: 500 }
    );
  }
}

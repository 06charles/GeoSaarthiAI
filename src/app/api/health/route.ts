import { NextResponse } from "next/server";
import { checkOllamaHealth } from "@/lib/ai/ollamaClient";
import fs from "fs";
import path from "path";

export async function GET() {
  const ollamaHealth = await checkOllamaHealth();

  const modelsDir = path.resolve(process.cwd(), "models");
  const ggufPath = path.join(modelsDir, "qwen3.5-9b.gguf");
  const ollamaStorePath = path.join(modelsDir, "ollama");

  let hasGguf = false;
  let ggufSizeGb = "0";

  try {
    if (fs.existsSync(ggufPath)) {
      hasGguf = true;
      const stats = fs.statSync(ggufPath);
      ggufSizeGb = (stats.size / (1024 * 1024 * 1024)).toFixed(2);
    }
  } catch {
    // ignore
  }

  return NextResponse.json({
    status: "ok",
    app: "GeoSaarthi AI",
    version: "1.0.0",
    cityScope: "Mumbai, Maharashtra, India",
    timestamp: new Date().toISOString(),
    bundledModel: {
      isBundled: hasGguf,
      modelName: "qwen3.5:9b",
      filePath: "models/qwen3.5-9b.gguf",
      sizeGb: ggufSizeGb,
      format: "GGUF v3 (Q4_K_M Quantized)",
      hasPreindexedStore: fs.existsSync(ollamaStorePath),
    },
    aiEngine: {
      provider: "Local Qwen 3.5 9B Inference",
      status: ollamaHealth.isAvailable ? "connected" : "unreachable",
      configuredModel: ollamaHealth.targetModel,
      isModelAvailable: ollamaHealth.isTargetModelReady,
      installedModels: ollamaHealth.modelsFound,
      endpoint: ollamaHealth.endpoint,
      error: ollamaHealth.error,
    },
    providers: {
      weather: "Open-Meteo Weather API (Live)",
      airQuality: "Open-Meteo Air Quality API (Live CAMS)",
      geospatial: "OpenStreetMap & Overpass API + Curated Mumbai Ground Truth",
      routing: "OSRM Public Engine with Geodesic Polyline Fallback",
    },
  });
}

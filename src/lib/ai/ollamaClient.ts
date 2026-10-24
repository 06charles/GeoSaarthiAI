export interface OllamaConfig {
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

export function getOllamaConfig(): OllamaConfig {
  return {
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    model: process.env.OLLAMA_MODEL || "qwen3.5:9b",
    timeoutMs: parseInt(process.env.OLLAMA_TIMEOUT_MS || "30000", 10),
  };
}

export interface OllamaHealthStatus {
  isAvailable: boolean;
  modelsFound: string[];
  isTargetModelReady: boolean;
  targetModel: string;
  endpoint: string;
  error?: string;
}

/**
 * Checks connectivity to the local Ollama server and verifies presence of the configured model.
 */
export async function checkOllamaHealth(): Promise<OllamaHealthStatus> {
  const config = getOllamaConfig();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${config.baseUrl}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        isAvailable: false,
        modelsFound: [],
        isTargetModelReady: false,
        targetModel: config.model,
        endpoint: config.baseUrl,
        error: `Ollama returned HTTP status ${res.status}`,
      };
    }

    const data = await res.json();
    const models = Array.isArray(data.models)
      ? data.models.map((m: any) => m.name || m.model)
      : [];

    const isTargetModelReady = models.some(
      (m: string) => m.toLowerCase().includes(config.model.toLowerCase()) || config.model.toLowerCase().includes(m.toLowerCase())
    );

    return {
      isAvailable: true,
      modelsFound: models,
      isTargetModelReady,
      targetModel: config.model,
      endpoint: config.baseUrl,
    };
  } catch (err: any) {
    return {
      isAvailable: false,
      modelsFound: [],
      isTargetModelReady: false,
      targetModel: config.model,
      endpoint: config.baseUrl,
      error: err.name === "AbortError" ? "Connection timed out" : err.message || "Failed to reach Ollama",
    };
  }
}

/**
 * Queries the local Qwen 3.5 9B model with timeout, response validation,
 * and automatic stripping of reasoning/thinking tokens (<think>...</think>).
 */
export async function queryLocalModel(prompt: string, systemPrompt?: string): Promise<string> {
  const config = getOllamaConfig();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const requestBody: any = {
      model: config.model,
      prompt,
      stream: false,
      options: {
        temperature: 0.2, // Low temperature for factual precision
        num_predict: 512,
      },
    };

    if (systemPrompt) {
      requestBody.system = systemPrompt;
    }

    const res = await fetch(`${config.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Ollama API responded with status ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    let text = data.response || "";

    // Strip <think>...</think> blocks if present in reasoning models like Qwen 3.5
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    return text;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error(`Local model request timed out after ${config.timeoutMs}ms.`);
    }
    throw err;
  }
}

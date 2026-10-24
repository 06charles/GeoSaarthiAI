#!/usr/bin/env node

/**
 * GeoSaarthi AI - Universal Cross-Platform Launcher
 * Compatible with Windows, macOS, and Linux.
 * Automatically initializes the bundled Qwen 3.5 9B model and starts the web application.
 */

const { spawn, execSync } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");

const isWin = process.platform === "win32";
const isMac = process.platform === "darwin";
const isLinux = process.platform === "linux";

const ROOT_DIR = path.resolve(__dirname, "..");
const MODELS_DIR = path.join(ROOT_DIR, "models");
const GGUF_PATH = path.join(MODELS_DIR, "qwen3.5-9b.gguf");
const OLLAMA_STORE = path.join(MODELS_DIR, "ollama");
const MODELFILE_PATH = path.join(MODELS_DIR, "Modelfile");

let spawnedOllamaProcess = null;

function log(msg, color = "\x1b[36m") {
  console.log(`${color}[GeoSaarthi AI]\x1b[0m ${msg}`);
}

function logSuccess(msg) {
  console.log(`\x1b[32m[GeoSaarthi AI] ✓ ${msg}\x1b[0m`);
}

function logWarn(msg) {
  console.log(`\x1b[33m[GeoSaarthi AI] ⚠ ${msg}\x1b[0m`);
}

function logError(msg) {
  console.log(`\x1b[31m[GeoSaarthi AI] ✖ ${msg}\x1b[0m`);
}

// 1. Verify bundled model weights
function verifyBundledModel() {
  log("Verifying bundled model weights...");
  if (!fs.existsSync(GGUF_PATH)) {
    logWarn(`Bundled model not found at ${GGUF_PATH}.`);
    return false;
  }
  const stats = fs.statSync(GGUF_PATH);
  const sizeGb = (stats.size / (1024 * 1024 * 1024)).toFixed(2);
  logSuccess(`Found bundled Qwen 3.5 9B model: ${GGUF_PATH} (${sizeGb} GB)`);
  return true;
}

// 2. Check if an LLM server is answering on port 11434
function checkLlmEndpoint(port = 11434) {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/tags",
        timeout: 2000,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const data = JSON.parse(body);
            const models = Array.isArray(data.models)
              ? data.models.map((m) => m.name || m.model || "")
              : [];
            resolve({ available: true, models });
          } catch {
            resolve({ available: true, models: [] });
          }
        });
      }
    );
    req.on("error", () => resolve({ available: false, models: [] }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ available: false, models: [] });
    });
  });
}

// 3. Find Ollama executable on the host system
function findOllamaBinary() {
  const commonPaths = isWin
    ? [
        path.join(process.env.LOCALAPPDATA || "", "Programs", "Ollama", "ollama.exe"),
        path.join(process.env.ProgramFiles || "", "Ollama", "ollama.exe"),
      ]
    : isMac
    ? [
        "/usr/local/bin/ollama",
        "/Applications/Ollama.app/Contents/Resources/ollama",
        "/opt/homebrew/bin/ollama",
      ]
    : [
        "/usr/local/bin/ollama",
        "/usr/bin/ollama",
        path.join(process.env.HOME || "", ".local", "bin", "ollama"),
      ];

  // Try PATH first
  try {
    const whichCmd = isWin ? "where ollama" : "which ollama";
    const out = execSync(whichCmd, { stdio: ["ignore", "pipe", "ignore"], encoding: "utf-8" }).trim();
    if (out) return out.split("\n")[0].trim();
  } catch {
    // ignore
  }

  // Check known standard locations
  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p;
  }

  return null;
}

// 4. Start bundled model inference
async function startModelRuntime() {
  log("Checking local AI runtime status...");
  let status = await checkLlmEndpoint(11434);

  if (status.available) {
    logSuccess("Detected running local LLM engine on port 11434.");
    const hasQwen = status.models.some((m) => m.toLowerCase().includes("qwen3.5"));
    if (hasQwen) {
      logSuccess("Target model 'qwen3.5:9b' is active and loaded!");
      return true;
    }
  }

  const ollamaBin = findOllamaBinary();

  if (!ollamaBin) {
    logWarn("Ollama runtime is not yet installed in system PATH.");
    console.log(`
┌────────────────────────────────────────────────────────────────────────┐
│  PORTABLE MODEL READY: Qwen 3.5 9B (6.6 GB GGUF is bundled in ./models) │
│                                                                        │
│  To enable GPU-accelerated local inference on this system:              │
│    • macOS / Linux:  curl -fsSL https://ollama.com/install.sh | sh     │
│    • Windows:        winget install Ollama.Ollama                      │
│                                                                        │
│  GeoSaarthi AI will launch now with full geospatial recommendations!  │
└────────────────────────────────────────────────────────────────────────┘
`);
    return false;
  }

  log(`Using Ollama binary: ${ollamaBin}`);
  log(`Setting OLLAMA_MODELS to bundled store: ${OLLAMA_STORE}`);

  const env = {
    ...process.env,
    OLLAMA_MODELS: OLLAMA_STORE,
    OLLAMA_HOST: "127.0.0.1:11434",
  };

  if (!status.available) {
    log("Starting background Ollama service with bundled models...");
    spawnedOllamaProcess = spawn(ollamaBin, ["serve"], {
      env,
      stdio: "ignore",
      detached: !isWin,
    });

    // Wait up to 10 seconds for service to answer
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      status = await checkLlmEndpoint(11434);
      if (status.available) break;
    }
  }

  if (status.available) {
    logSuccess("Ollama service initialized successfully.");
    const hasQwen = status.models.some((m) => m.toLowerCase().includes("qwen3.5"));
    if (!hasQwen && fs.existsSync(MODELFILE_PATH)) {
      log("Registering bundled Qwen 3.5 9B from Modelfile (offline)...");
      try {
        execSync(`"${ollamaBin}" create qwen3.5:9b -f "${MODELFILE_PATH}"`, {
          env,
          stdio: "inherit",
          cwd: ROOT_DIR,
        });
        logSuccess("Model 'qwen3.5:9b' registered into local store!");
      } catch (err) {
        logWarn(`Could not auto-register Modelfile: ${err.message}`);
      }
    }
    return true;
  } else {
    logWarn("Could not start background Ollama service automatically.");
    return false;
  }
}

// 5. Start Next.js Web Application
function startWebApp() {
  log("Starting GeoSaarthi AI Web Application...");
  const npmCmd = isWin ? "npm.cmd" : "npm";

  const nextProcess = spawn(npmCmd, ["run", "dev"], {
    cwd: ROOT_DIR,
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: "3000",
    },
  });

  // Open browser after 2.5 seconds
  setTimeout(() => {
    const url = "http://localhost:3000";
    logSuccess(`GeoSaarthi AI is ready at: ${url}`);
    try {
      if (isWin) {
        spawn("cmd", ["/c", "start", url], { stdio: "ignore" });
      } else if (isMac) {
        spawn("open", [url], { stdio: "ignore" });
      } else if (isLinux) {
        spawn("xdg-open", [url], { stdio: "ignore" });
      }
    } catch {
      // ignore
    }
  }, 2500);

  function cleanup() {
    log("Shutting down GeoSaarthi AI...");
    if (spawnedOllamaProcess && !spawnedOllamaProcess.killed) {
      try {
        spawnedOllamaProcess.kill();
      } catch {
        // ignore
      }
    }
    process.exit(0);
  }

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("exit", cleanup);
}

async function main() {
  console.log("\n=======================================================");
  console.log("   GeoSaarthi AI — Portable Full-Stack Package         ");
  console.log("   Combined Website + Bundled Local Qwen 3.5 9B LLM    ");
  console.log("=======================================================\n");

  verifyBundledModel();
  await startModelRuntime();
  startWebApp();
}

main().catch((err) => {
  logError(`Fatal startup error: ${err.stack || err.message}`);
  process.exit(1);
});

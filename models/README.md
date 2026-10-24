# Bundled Local LLM: Qwen 3.5 9B

This directory contains the complete offline weights and metadata for **Qwen 3.5 9B**, bundled directly with GeoSaarthi AI.

## Included Files

- `qwen3.5-9b.gguf` (6.6 GB): The complete standalone GGUF quantized weights (Q4_K_M). Compatible with `llama.cpp`, `llama-server`, `Ollama`, `LM Studio`, `vLLM`, and any standard GGUF runtime.
- `Modelfile`: Ready-to-use Ollama model definition with system prompt templates and `<|im_start|>` / `<|im_end|>` stop token definitions.
- `ollama/`: Pre-indexed Ollama model store containing manifests and layer blobs. Pointing `OLLAMA_MODELS` to this folder allows Ollama to run the model instantly offline without downloading any files from the internet.

## Offline Verification

The model is 100% self-contained. No network connection is needed to initialize, load, or run inference on this model.

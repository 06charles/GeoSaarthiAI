"use client";

import React, { useState } from "react";
import { Send, Bot, User, Sparkles, AlertCircle, Compass, Cpu } from "lucide-react";
import { RecommendationResponse } from "@/types/recommendation";

interface ChatAssistantProps {
  onRecommendationsUpdate: (data: RecommendationResponse) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  parsedSummary?: {
    activity: string | null;
    location: string | null;
    timeframe: string | null;
  };
  modelNote?: string;
}

const PRESET_PROMPTS = [
  "I want to go jogging near Powai tomorrow morning. Find the best place and time, check the weather and air quality, and show me a suitable route.",
  "I want to go cycling near Bandra tomorrow morning. Find a suitable route and tell me the weather and environmental conditions.",
  "Recommend the best cricket ground near Dadar for Sunday morning with pitch surface and air quality.",
  "Find scenic photography spots near Marine Drive with sunset timing and sea breeze conditions.",
];

export function ChatAssistant({
  onRecommendationsUpdate,
  isLoading,
  setIsLoading,
}: ChatAssistantProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-msg",
      role: "assistant",
      text: "Namaste! I am GeoSaarthi AI, your local geospatial outdoor activity assistant for Mumbai. Ask me where to go for jogging, cycling, cricket, photography, hiking, or picnics, and I will cross-reference live weather, air quality, verified surface data, and local Qwen 3.5 9B reasoning.",
    },
  ]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      text: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.recommendations) {
          onRecommendationsUpdate(data.recommendations);
        }

        const assistantMsg: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: data.reply,
          parsedSummary: {
            activity: data.parsedIntent.activity,
            location: data.parsedIntent.targetLocation,
            timeframe: data.parsedIntent.timeframe,
          },
          modelNote: `Inference via ${data.modelMeta.model} (${data.modelMeta.runtime}) in ${data.modelMeta.latencyMs}ms`,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            text: `Error: ${data.error || "Failed to parse outdoor recommendations."}`,
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          text: "Network or model execution error. Please verify the local Ollama service is active.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: "18px 20px", marginBottom: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Bot size={18} color="#34d399" />
          <h3 style={{ fontSize: "14px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "#94a3b8" }}>
            Natural Language Activity Assistant
          </h3>
        </div>
        <span style={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
          <Cpu size={12} color="#10b981" /> Qwen 3.5 9B Local Reasoner
        </span>
      </div>

      {/* Preset Prompts Chips */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
        <span style={{ fontSize: "11px", color: "#64748b" }}>Suggested Inquiries:</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {PRESET_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              disabled={isLoading}
              style={{
                textAlign: "left",
                fontSize: "11px",
                padding: "6px 10px",
                borderRadius: "8px",
                background: "rgba(30, 41, 59, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#cbd5e1",
                cursor: isLoading ? "not-allowed" : "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.borderColor = "#10b981")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.borderColor = "rgba(255, 255, 255, 0.08)")}
            >
              &ldquo;{prompt.slice(0, 52)}...&rdquo;
            </button>
          ))}
        </div>
      </div>

      {/* Messages Stream */}
      <div
        style={{
          maxHeight: "260px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginBottom: "14px",
          paddingRight: "6px",
        }}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "flex-start",
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "92%",
            }}
          >
            {m.role === "assistant" && (
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #10b981, #06b6d4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                <Bot size={15} color="#ffffff" />
              </div>
            )}

            <div
              style={{
                padding: "10px 14px",
                borderRadius: "12px",
                background: m.role === "user" ? "rgba(16, 185, 129, 0.2)" : "rgba(30, 41, 59, 0.7)",
                border: m.role === "user" ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
                color: "#e2e8f0",
                fontSize: "13px",
                lineHeight: "1.5",
              }}
            >
              {/* Parsed Intent Badges if present */}
              {m.parsedSummary && (
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                  {m.parsedSummary.activity && (
                    <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.25)", color: "#34d399", fontWeight: "700" }}>
                      Activity: {m.parsedSummary.activity}
                    </span>
                  )}
                  {m.parsedSummary.location && (
                    <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "10px", background: "rgba(56, 189, 248, 0.25)", color: "#38bdf8", fontWeight: "700" }}>
                      Location: {m.parsedSummary.location}
                    </span>
                  )}
                  {m.parsedSummary.timeframe && (
                    <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "10px", background: "rgba(168, 85, 247, 0.25)", color: "#c084fc", fontWeight: "700" }}>
                      Time: {m.parsedSummary.timeframe}
                    </span>
                  )}
                </div>
              )}

              <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>

              {m.modelNote && (
                <div style={{ fontSize: "10px", color: "#64748b", marginTop: "6px", fontStyle: "italic" }}>
                  {m.modelNote}
                </div>
              )}
            </div>

            {m.role === "user" && (
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "#334155",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                <User size={15} color="#cbd5e1" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#94a3b8", fontSize: "12px" }}>
            <div
              style={{
                width: "20px",
                height: "20px",
                border: "2px solid #10b981",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spinSlow 1s linear infinite",
              }}
            />
            <span>GeoSaarthi reasoning with local Qwen 3.5 9B & fetching live geospatial data...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{ display: "flex", gap: "10px" }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask in natural language (e.g. 'Jogging near Powai tomorrow morning with route and AQI')..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "10px",
            background: "rgba(17, 24, 39, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#ffffff",
            fontSize: "13px",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "10px 16px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "#ffffff",
            border: "none",
            fontWeight: "600",
            fontSize: "13px",
            cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
            opacity: isLoading || !input.trim() ? 0.6 : 1,
          }}
        >
          <Send size={14} />
          Send
        </button>
      </form>
    </div>
  );
}

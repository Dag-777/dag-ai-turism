// DagAI Tourism — Strategist proxy v4.0
// Uses DeepSeek-R1-distill which returns <think> reasoning blocks.
// Extracts thinking separately so the UI can show real AI reasoning.

const PRIMARY_MODEL  = "deepseek-r1-distill-llama-70b";
const FALLBACK_MODEL = "llama-3.3-70b-versatile";
const GROQ_URL       = "https://api.groq.com/openai/v1/chat/completions";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function jsonResponse(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store", ...extraHeaders },
  });
}

function extractThinking(content) {
  if (!content || typeof content !== "string") return { thinking: null, answer: content || "" };
  const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/i);
  const thinking = thinkMatch ? thinkMatch[1].trim() : null;
  const answer = content
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return { thinking, answer };
}

async function callGroq({ model, system, user, apiKey, useJsonMode }) {
  const body = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user",   content: user },
    ],
    max_completion_tokens: 3000,
    temperature: 0.6,
  };
  if (useJsonMode) body.response_format = { type: "json_object" };
  return fetch(GROQ_URL, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return jsonResponse({ error: "GROQ_API_KEY not configured" }, 500);

  let body;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON body" }, 400); }

  const system = typeof body?.system === "string" ? body.system : "";
  const user   = typeof body?.user   === "string" ? body.user   : "";
  if (!system || !user) return jsonResponse({ error: "Missing system/user fields" }, 400);

  let res = await callGroq({ model: PRIMARY_MODEL, system, user, apiKey, useJsonMode: false });
  if (res.status === 429) {
    const wait = Math.min(Math.max(parseFloat(res.headers.get("retry-after") || "1") * 1000, 500), 5000);
    await sleep(wait);
    res = await callGroq({ model: PRIMARY_MODEL, system, user, apiKey, useJsonMode: false });
  }
  if (!res.ok && res.status !== 429) {
    res = await callGroq({ model: FALLBACK_MODEL, system, user, apiKey, useJsonMode: true });
  }

  let data;
  try { data = await res.json(); } catch {
    res = await callGroq({ model: FALLBACK_MODEL, system, user, apiKey, useJsonMode: true });
    try { data = await res.json(); } catch { return jsonResponse({ error: "Bad upstream response" }, 502); }
  }

  const rawContent = data.choices?.[0]?.message?.content || "";
  const { thinking, answer } = extractThinking(rawContent);
  if (data.choices?.[0]?.message) {
    data.choices[0].message.content = answer;
    data.choices[0].message.thinking = thinking;
  }

  const passthrough = {
    "x-rpm-remaining": res.headers.get("x-ratelimit-remaining-requests") || "",
    "x-tpm-remaining": res.headers.get("x-ratelimit-remaining-tokens")   || "",
    "x-rpm-limit":     res.headers.get("x-ratelimit-limit-requests")     || "",
    "x-tpm-limit":     res.headers.get("x-ratelimit-limit-tokens")       || "",
  };
  return jsonResponse(data, res.ok ? 200 : res.status, passthrough);
};

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You convert a Russian, Kazakh, or mixed-language family memory into safe JSON.
Return exactly one JSON object with this shape:
{"schema_version":"mura-web-fallback-v1","language":"ru|kk|mixed","title":"string","summary":"string","people":[{"name":"string","relationship":"string or empty"}],"uncertainties":["string"]}
Do not invent names, relationships, dates, or events. Preserve uncertainty. Keep title and summary in the transcript's language.`;

function configuration() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = (process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com").replace(/\/$/, "");
  const model = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";
  return apiKey ? { apiKey, baseUrl, model } : null;
}

export async function POST(request: NextRequest) {
  const config = configuration();
  if (!config) {
    return NextResponse.json({ error: "deepseek_not_configured" }, { status: 503 });
  }

  let input: { transcript?: unknown; locale?: unknown };
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const transcript = typeof input.transcript === "string" ? input.transcript.trim() : "";
  if (!transcript || transcript.length > 50_000) {
    return NextResponse.json({ error: "invalid_transcript" }, { status: 422 });
  }

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({ locale: input.locale, transcript }),
          },
        ],
        response_format: { type: "json_object" },
        thinking: { type: "disabled" },
        max_tokens: 1200,
        stream: false,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    });
    if (!response.ok) {
      return NextResponse.json({ error: "deepseek_request_failed" }, { status: 502 });
    }
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("empty_content");
    const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const result = JSON.parse(cleaned) as Record<string, unknown>;
    return NextResponse.json({ ...result, source: "browser_speech_deepseek" });
  } catch {
    return NextResponse.json({ error: "deepseek_response_invalid" }, { status: 502 });
  }
}

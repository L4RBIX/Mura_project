import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/mura/extractions/route";
import { extractionResultFixture } from "@/test/mura-fixtures";

beforeEach(() => {
  vi.stubEnv("MURA_MODEL_API_URL", "http://model.internal:8000");
  vi.stubEnv("MURA_MODEL_API_KEY", "server-only-test-secret");
  vi.stubEnv("MURA_MODEL_TIMEOUT_MS", "1000");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Mura server proxy", () => {
  it("adds backend Authorization server-side and forwards a valid result", async () => {
    let forwardedUrl = "";
    let forwardedHeaders = new Headers();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        forwardedUrl = String(input);
        forwardedHeaders = new Headers(init?.headers);
        return Response.json(extractionResultFixture());
      }),
    );

    const response = await POST(
      requestWithTranscript({
        Authorization: "Bearer browser-must-not-control-this",
      }),
    );

    expect(response.status).toBe(200);
    expect(forwardedUrl).toBe(
      "http://model.internal:8000/v1/extractions",
    );
    expect(forwardedHeaders.get("Authorization")).toBe(
      "Bearer server-only-test-secret",
    );
    expect(await response.json()).toEqual(extractionResultFixture());
  });

  it("returns a safe 504 when the backend exceeds the configured timeout", async () => {
    vi.stubEnv("MURA_MODEL_TIMEOUT_MS", "5");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input: string | URL | Request, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener(
              "abort",
              () => reject(new DOMException("aborted", "AbortError")),
              { once: true },
            );
          }),
      ),
    );

    const response = await POST(requestWithTranscript());

    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({
      error: {
        code: "backend_timeout",
        message: "The extraction service timed out.",
      },
    });
  });

  it("normalizes backend errors without exposing their message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            error: {
              code: "provider_error",
              message: "raw provider output and private transcript",
            },
          },
          { status: 502 },
        ),
      ),
    );

    const response = await POST(requestWithTranscript());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({
      error: {
        code: "provider_error",
        message: "The extraction provider is temporarily unavailable.",
      },
    });
    expect(JSON.stringify(body)).not.toContain("private transcript");
  });
});

function requestWithTranscript(headers?: HeadersInit): NextRequest {
  return new NextRequest("http://localhost/api/mura/extractions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...Object.fromEntries(new Headers(headers)),
    },
    body: JSON.stringify({
      recording_id: "rec_test",
      speaker_id: "speaker_test",
      speaker_name: "Айсұлу",
      language_hints: ["kk", "ru"],
      segments: [
        {
          segment_id: "seg_001",
          start: 0,
          end: 4.2,
          text: "Менің әкем Сабыр алма бағында жұмыс істеген.",
        },
      ],
    }),
  });
}

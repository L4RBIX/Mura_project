import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/mura/transcriptions/route";

beforeEach(() => {
  vi.stubEnv("MURA_ASR_API_URL", "https://asr.example");
  vi.stubEnv("MURA_ASR_API_KEY", "server-only-asr-secret");
  vi.stubEnv("MURA_ASR_TIMEOUT_MS", "1000");
  vi.stubEnv("MURA_ASR_MAX_UPLOAD_MB", "10");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Mura ASR server proxy", () => {
  it("keeps Authorization server-side and forwards multipart audio", async () => {
    let forwardedUrl = "";
    let forwardedHeaders = new Headers();
    let forwardedForm: FormData | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        forwardedUrl = String(input);
        forwardedHeaders = new Headers(init?.headers);
        forwardedForm = init?.body as FormData;
        return Response.json(transcriptFixture());
      }),
    );

    const response = await POST(requestWithAudio());

    expect(response.status).toBe(200);
    expect(forwardedUrl).toBe("https://asr.example/v1/transcribe");
    expect(forwardedHeaders.get("Authorization")).toBe(
      "Bearer server-only-asr-secret",
    );
    expect(forwardedHeaders.has("content-type")).toBe(false);
    const capturedForm = forwardedForm as FormData | null;
    expect(capturedForm?.get("recording_id")).toBe("rec_test");
    expect(capturedForm?.get("file")).toBeInstanceOf(File);
    expect(await response.json()).toEqual(transcriptFixture());
  });

  it("returns a safe timeout without exposing the upstream URL", async () => {
    vi.stubEnv("MURA_ASR_TIMEOUT_MS", "5");
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

    const response = await POST(requestWithAudio());
    const body = await response.json();

    expect(response.status).toBe(504);
    expect(body).toEqual({
      error: {
        code: "asr_timeout",
        message: "The transcription service timed out.",
      },
    });
    expect(JSON.stringify(body)).not.toContain("asr.example");
  });

  it("maps a busy worker to a retryable safe error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { detail: "private upstream detail" },
          { status: 429, headers: { "retry-after": "12" } },
        ),
      ),
    );

    const response = await POST(requestWithAudio());

    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("12");
    expect(await response.json()).toEqual({
      error: {
        code: "asr_busy",
        message: "The transcription service is busy. Try again shortly.",
      },
    });
  });

  it("rejects malformed ASR output", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ recording_id: "rec_test" })),
    );

    const response = await POST(requestWithAudio());

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: {
        code: "invalid_asr_response",
        message: "The transcription service returned an invalid response.",
      },
    });
  });
});

function requestWithAudio(): NextRequest {
  const form = new FormData();
  form.append(
    "file",
    new File(["voice"], "rec_test.webm", { type: "audio/webm" }),
  );
  form.append("recording_id", "rec_test");

  return new NextRequest("http://localhost/api/mura/transcriptions", {
    method: "POST",
    body: form,
  });
}

function transcriptFixture() {
  return {
    recording_id: "rec_test",
    duration_seconds: 4.2,
    language_hints: ["kk", "ru"],
    full_text: "Менің әкем Сабыр алма бағында жұмыс істеген.",
    segments: [
      {
        segment_id: "seg_001",
        start: 0,
        end: 4.2,
        text: "Менің әкем Сабыр алма бағында жұмыс істеген.",
        chunk_id: "chunk_001",
      },
    ],
    asr_model: "ai-sage/GigaAM-Multilingual",
    asr_revision: "3905cd51c3ed4e88c8edf33f3302969ba480a327",
    chunker_version: "mura-fixed-overlap-v1",
    processing_seconds: 1.5,
    asr_metadata: {
      device: "cuda:0",
      variant: "large_ctc",
    },
  };
}

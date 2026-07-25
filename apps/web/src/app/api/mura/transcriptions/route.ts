import { NextRequest, NextResponse } from "next/server";
import { isMuraTranscriptEnvelope } from "@/lib/mura-api-types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_TIMEOUT_MS = 295_000;
const DEFAULT_MAX_UPLOAD_MB = 50;
const MAX_UPLOAD_MB = 100;
const RECORDING_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const ALLOWED_EXTENSIONS = new Set([
  ".wav",
  ".mp3",
  ".m4a",
  ".mp4",
  ".aac",
  ".ogg",
  ".opus",
  ".webm",
  ".flac",
]);

type AsrProxyErrorCode =
  | "invalid_request"
  | "asr_not_configured"
  | "asr_unreachable"
  | "asr_timeout"
  | "asr_busy"
  | "unauthorized"
  | "invalid_asr_response"
  | "asr_error";

const ERROR_MESSAGES: Readonly<Record<AsrProxyErrorCode, string>> = {
  invalid_request: "The audio transcription request is invalid.",
  asr_not_configured: "The transcription service is not configured.",
  asr_unreachable: "The transcription service is unavailable.",
  asr_timeout: "The transcription service timed out.",
  asr_busy: "The transcription service is busy. Try again shortly.",
  unauthorized: "The transcription service could not be authorized.",
  invalid_asr_response: "The transcription service returned an invalid response.",
  asr_error: "The audio could not be transcribed.",
};

interface ServerConfiguration {
  endpoint: string;
  apiKey: string;
  timeoutMs: number;
  maxUploadBytes: number;
}

function errorResponse(
  code: AsrProxyErrorCode,
  status: number,
  headers?: HeadersInit,
) {
  return NextResponse.json(
    { error: { code, message: ERROR_MESSAGES[code] } },
    {
      status,
      headers: {
        "cache-control": "no-store",
        ...Object.fromEntries(new Headers(headers)),
      },
    },
  );
}

function parsePositiveInteger(
  rawValue: string | undefined,
  fallback: number,
  maximum: number,
): number | null {
  const value = rawValue?.trim();
  if (!value) return fallback;
  if (!/^\d+$/.test(value)) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maximum
    ? parsed
    : null;
}

function normalizeBaseUrl(rawValue: string | undefined): string | null {
  const value = rawValue?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function configuration(): ServerConfiguration | null {
  const baseUrl = normalizeBaseUrl(process.env.MURA_ASR_API_URL);
  const apiKey = process.env.MURA_ASR_API_KEY?.trim();
  const timeoutMs = parsePositiveInteger(
    process.env.MURA_ASR_TIMEOUT_MS,
    MAX_TIMEOUT_MS,
    MAX_TIMEOUT_MS,
  );
  const maxUploadMb = parsePositiveInteger(
    process.env.MURA_ASR_MAX_UPLOAD_MB,
    DEFAULT_MAX_UPLOAD_MB,
    MAX_UPLOAD_MB,
  );

  if (!baseUrl || !apiKey || timeoutMs === null || maxUploadMb === null) {
    return null;
  }

  return {
    endpoint: `${baseUrl}/v1/transcribe`,
    apiKey,
    timeoutMs,
    maxUploadBytes: maxUploadMb * 1024 * 1024,
  };
}

function extensionForFile(file: File): string {
  const filename = file.name.toLowerCase();
  const dotIndex = filename.lastIndexOf(".");
  return dotIndex >= 0 ? filename.slice(dotIndex) : "";
}

export async function POST(request: NextRequest) {
  const config = configuration();
  if (!config) {
    return errorResponse("asr_not_configured", 503);
  }

  let incomingForm: FormData;
  try {
    incomingForm = await request.formData();
  } catch {
    return errorResponse("invalid_request", 400);
  }

  const file = incomingForm.get("file");
  const rawRecordingId = incomingForm.get("recording_id");
  const recordingId =
    typeof rawRecordingId === "string" ? rawRecordingId.trim() : "";

  if (
    !(file instanceof File) ||
    file.size <= 0 ||
    file.size > config.maxUploadBytes ||
    !ALLOWED_EXTENSIONS.has(extensionForFile(file)) ||
    !RECORDING_ID_PATTERN.test(recordingId)
  ) {
    return errorResponse("invalid_request", 422);
  }

  const upstreamForm = new FormData();
  upstreamForm.append("file", file, file.name);
  upstreamForm.append("recording_id", recordingId);

  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, config.timeoutMs);

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        accept: "application/json",
      },
      body: upstreamForm,
      cache: "no-store",
      signal: controller.signal,
    });

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return errorResponse(
        response.ok ? "invalid_asr_response" : "asr_error",
        502,
      );
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return errorResponse("unauthorized", 401);
      }
      if (response.status === 429) {
        return errorResponse("asr_busy", 503, {
          "retry-after": response.headers.get("retry-after") ?? "10",
        });
      }
      if ([400, 413, 415, 422].includes(response.status)) {
        return errorResponse("invalid_request", 422);
      }
      return errorResponse("asr_error", 502);
    }

    if (
      !isMuraTranscriptEnvelope(payload) ||
      payload.recording_id !== recordingId
    ) {
      return errorResponse("invalid_asr_response", 502);
    }

    return NextResponse.json(payload, {
      status: response.status,
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return timedOut
      ? errorResponse("asr_timeout", 504)
      : errorResponse("asr_unreachable", 502);
  } finally {
    clearTimeout(timeout);
  }
}

"use client";

import {
  isMuraTranscriptEnvelope,
  type MuraTranscriptEnvelope,
} from "@/lib/mura-api-types";

interface AsrErrorPayload {
  error: {
    code: string;
    message: string;
  };
}

export class MuraAsrClientError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "MuraAsrClientError";
    this.code = code;
  }
}

function extensionForMimeType(mimeType: string): string {
  const normalized = mimeType.toLowerCase().split(";", 1)[0]?.trim();
  switch (normalized) {
    case "audio/mp4":
      return ".mp4";
    case "audio/mpeg":
      return ".mp3";
    case "audio/ogg":
      return ".ogg";
    case "audio/wav":
    case "audio/x-wav":
      return ".wav";
    case "audio/aac":
      return ".aac";
    case "audio/flac":
      return ".flac";
    default:
      return ".webm";
  }
}

function isAsrErrorPayload(value: unknown): value is AsrErrorPayload {
  if (typeof value !== "object" || value === null || !("error" in value)) {
    return false;
  }
  const error = value.error;
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof error.code === "string" &&
    error.code.trim().length > 0 &&
    typeof error.message === "string" &&
    error.message.trim().length > 0
  );
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function requestMuraTranscription(
  audio: Blob,
  recordingId: string,
): Promise<MuraTranscriptEnvelope> {
  const extension = extensionForMimeType(audio.type);
  const file = new File(
    [audio],
    `${recordingId}${extension}`,
    { type: audio.type || "audio/webm" },
  );
  const form = new FormData();
  form.append("file", file);
  form.append("recording_id", recordingId);

  let response: Response;
  try {
    response = await fetch("/api/mura/transcriptions", {
      method: "POST",
      body: form,
    });
  } catch {
    throw new MuraAsrClientError(
      "asr_proxy_unreachable",
      "The audio could not reach the transcription service.",
    );
  }

  const payload = await readJson(response);
  if (!response.ok) {
    const code = isAsrErrorPayload(payload)
      ? payload.error.code
      : "asr_error";
    const message = isAsrErrorPayload(payload)
      ? payload.error.message
      : "The audio could not be transcribed.";
    throw new MuraAsrClientError(code, message);
  }

  if (
    !isMuraTranscriptEnvelope(payload) ||
    payload.recording_id !== recordingId
  ) {
    throw new MuraAsrClientError(
      "invalid_asr_response",
      "The transcription service returned an invalid response.",
    );
  }

  return payload;
}

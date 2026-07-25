"use client";

import {
  isMuraApiError,
  isMuraExtractionResult,
  type MuraApiError,
  type MuraExtractionRequest,
  type MuraExtractionResult,
} from "@/lib/mura-api-types";
import {
  completeSavedMemory,
  failSavedMemory,
  getSavedMemory,
  updateSavedMemory,
  type SavedMemory,
} from "@/lib/memory-store";

const inFlightExtractions = new Map<string, Promise<SavedMemory>>();

export class MuraClientError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "MuraClientError";
    this.code = code;
  }
}

export async function requestMuraExtraction(
  request: MuraExtractionRequest,
): Promise<MuraExtractionResult> {
  let response: Response;
  try {
    response = await fetch("/api/mura/extractions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new MuraClientError(
      "proxy_unreachable",
      "The extraction request could not reach the application server.",
    );
  }

  const payload = await readJson(response);
  if (!response.ok) {
    const error = isMuraApiError(payload)
      ? payload
      : fallbackApiError(response.status);
    throw new MuraClientError(error.error.code, error.error.message);
  }
  if (!isMuraExtractionResult(payload) || payload.recording_id !== request.recording_id) {
    throw new MuraClientError(
      "invalid_model_response",
      "The extraction service returned an invalid response.",
    );
  }
  return payload;
}

export function analyzeSavedMemory(memoryId: string): Promise<SavedMemory> {
  const activeRequest = inFlightExtractions.get(memoryId);
  if (activeRequest) return activeRequest;

  const request = performSavedMemoryExtraction(memoryId).finally(() => {
    inFlightExtractions.delete(memoryId);
  });
  inFlightExtractions.set(memoryId, request);
  return request;
}

async function performSavedMemoryExtraction(memoryId: string): Promise<SavedMemory> {
  const memory = getSavedMemory(memoryId);
  if (!memory) {
    throw new MuraClientError("memory_not_found", "The saved memory could not be found.");
  }
  if (!memory.extractionRequest?.segments.length) {
    const error = new MuraClientError(
      "transcript_unavailable",
      "No completed transcript phrases are available for analysis.",
    );
    updateSavedMemory(failSavedMemory(memory, error));
    throw error;
  }

  try {
    const result = await requestMuraExtraction(memory.extractionRequest);
    const completed = completeSavedMemory(memory, result);
    updateSavedMemory(completed);
    return completed;
  } catch (cause) {
    const error = normalizeClientError(cause);
    const latest = getSavedMemory(memoryId) ?? memory;
    updateSavedMemory(failSavedMemory(latest, error));
    throw error;
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    if (response.ok) {
      throw new MuraClientError(
        "invalid_model_response",
        "The extraction service returned an invalid response.",
      );
    }
    return null;
  }
}

function fallbackApiError(status: number): MuraApiError {
  return {
    error: {
      code: status === 504 ? "backend_timeout" : "backend_error",
      message: "The extraction request could not be completed.",
    },
  };
}

function normalizeClientError(cause: unknown): MuraClientError {
  return cause instanceof MuraClientError
    ? cause
    : new MuraClientError(
        "unexpected_error",
        "The extraction request could not be completed.",
      );
}

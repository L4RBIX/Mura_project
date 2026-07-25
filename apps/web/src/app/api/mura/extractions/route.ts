import { NextRequest, NextResponse } from "next/server";
import {
  isMuraApiError,
  isMuraExtractionRequest,
  isMuraExtractionResultForRequest,
  type MuraApiError,
  type MuraApiErrorCode,
} from "@/lib/mura-api-types";

export const runtime = "nodejs";
export const maxDuration = 300;

const CONFIGURED_DEFAULT_TIMEOUT_MS = 300_000;
// Leave a small margin for serializing a safe 504 before the 300s route limit.
const MAX_TIMEOUT_MS = 295_000;

const ERROR_MESSAGES: Readonly<Record<MuraApiErrorCode, string>> = {
  invalid_json: "The extraction request body must be valid JSON.",
  invalid_request: "The extraction request is invalid.",
  backend_not_configured: "The extraction service is not configured.",
  backend_unreachable: "The extraction service is unavailable.",
  backend_timeout: "The extraction service timed out.",
  unauthorized: "The extraction service could not be authorized.",
  provider_error: "The extraction provider is temporarily unavailable.",
  repair_failed: "The model could not produce a valid extraction result.",
  invalid_model_response: "The extraction service returned an invalid response.",
  internal_error: "The extraction request could not be completed.",
  backend_error: "The extraction request could not be completed.",
};

interface ServerConfiguration {
  endpoint: string;
  apiKey: string;
  timeoutMs: number;
}

interface NormalizedError {
  body: MuraApiError;
  status: number;
}

function errorBody(
  code: MuraApiErrorCode,
  validationCodes?: string[],
): MuraApiError {
  return {
    error: {
      code,
      message: ERROR_MESSAGES[code],
      ...(validationCodes === undefined
        ? {}
        : { validation_codes: validationCodes }),
    },
  };
}

function errorResponse(
  code: MuraApiErrorCode,
  status: number,
  validationCodes?: string[],
) {
  return NextResponse.json(errorBody(code, validationCodes), {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function parseTimeout(rawValue: string | undefined): number | null {
  const value = rawValue?.trim();
  if (!value) return Math.min(CONFIGURED_DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS);
  if (!/^\d+$/.test(value)) return null;

  const parsed = Number(value);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed <= 0 ||
    parsed > CONFIGURED_DEFAULT_TIMEOUT_MS
  ) {
    return null;
  }
  return Math.min(parsed, MAX_TIMEOUT_MS);
}

function normalizeBaseUrl(rawValue: string | undefined): string | null {
  const value = rawValue?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
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
  const baseUrl = normalizeBaseUrl(process.env.MURA_MODEL_API_URL);
  const apiKey = process.env.MURA_MODEL_API_KEY?.trim();
  const timeoutMs = parseTimeout(process.env.MURA_MODEL_TIMEOUT_MS);

  if (!baseUrl || !apiKey || timeoutMs === null) return null;
  return {
    endpoint: `${baseUrl}/v1/extractions`,
    apiKey,
    timeoutMs,
  };
}

function statusForCode(
  code: MuraApiErrorCode,
  backendStatus: number,
): number {
  switch (code) {
    case "invalid_json":
      return 400;
    case "invalid_request":
      return 422;
    case "backend_not_configured":
      return 503;
    case "backend_unreachable":
    case "provider_error":
    case "invalid_model_response":
    case "backend_error":
      return 502;
    case "backend_timeout":
      return 504;
    case "unauthorized":
      return 401;
    case "repair_failed":
      return backendStatus === 422 ? 422 : 502;
    case "internal_error":
      return 500;
  }
}

function normalizeBackendError(
  payload: unknown,
  backendStatus: number,
): NormalizedError {
  if (isMuraApiError(payload)) {
    const code = payload.error.code;
    return {
      body: errorBody(code, payload.error.validation_codes),
      status: statusForCode(code, backendStatus),
    };
  }

  if (backendStatus === 401 || backendStatus === 403) {
    return { body: errorBody("unauthorized"), status: 401 };
  }
  if (backendStatus === 400 || backendStatus === 422) {
    return { body: errorBody("invalid_request"), status: 422 };
  }
  return { body: errorBody("backend_error"), status: 502 };
}

export async function POST(request: NextRequest) {
  const config = configuration();
  if (!config) {
    return errorResponse("backend_not_configured", 503);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse("invalid_json", 400);
  }

  if (!isMuraExtractionRequest(payload)) {
    return errorResponse("invalid_request", 422);
  }

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
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });

    let backendPayload: unknown;
    try {
      backendPayload = await response.json();
    } catch {
      if (timedOut) {
        return errorResponse("backend_timeout", 504);
      }
      if (response.ok) {
        return errorResponse("invalid_model_response", 502);
      }
      return errorResponse("backend_error", 502);
    }

    if (!response.ok) {
      const normalized = normalizeBackendError(
        backendPayload,
        response.status,
      );
      return NextResponse.json(normalized.body, {
        status: normalized.status,
        headers: { "cache-control": "no-store" },
      });
    }

    if (!isMuraExtractionResultForRequest(backendPayload, payload)) {
      return errorResponse("invalid_model_response", 502);
    }

    return NextResponse.json(backendPayload, {
      status: response.status,
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return timedOut
      ? errorResponse("backend_timeout", 504)
      : errorResponse("backend_unreachable", 502);
  } finally {
    clearTimeout(timeout);
  }
}

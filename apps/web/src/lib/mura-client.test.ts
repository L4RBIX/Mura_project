import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeSavedMemory } from "@/lib/mura-client";
import {
  getSavedMemory,
  updateSavedMemory,
} from "@/lib/memory-store";
import {
  baseMemory,
  extractionResultFixture,
} from "@/test/mura-fixtures";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("manual extraction retry", () => {
  it("reuses the stored transcript request instead of asking for a new recording", async () => {
    const storage = memoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    const memory = {
      ...baseMemory(),
      status: "failed" as const,
      extractionError: {
        code: "backend_unreachable",
        message: "The extraction service is unavailable.",
      },
    };
    updateSavedMemory(memory);

    let forwardedBody: unknown;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        forwardedBody = JSON.parse(String(init?.body));
        return Response.json(extractionResultFixture());
      }),
    );

    const completed = await analyzeSavedMemory(memory.id);

    expect(forwardedBody).toEqual(memory.extractionRequest);
    expect(completed.status).toBe("completed");
    expect(getSavedMemory(memory.id)?.transcript).toBe(memory.transcript);
    expect(getSavedMemory(memory.id)?.extraction?.events).toHaveLength(2);
  });
});

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

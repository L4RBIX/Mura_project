import { describe, expect, it } from "vitest";
import {
  completeSavedMemory,
  normalizeSavedMemory,
  sortSavedMemoriesNewestFirst,
} from "@/lib/memory-store";
import {
  baseMemory,
  extractionResultFixture,
} from "@/test/mura-fixtures";

describe("saved Mura memories", () => {
  it("persists the complete structured extraction while mapping summary fields", () => {
    const memory = baseMemory();
    const extraction = extractionResultFixture();

    const completed = completeSavedMemory(memory, extraction);

    expect(completed.status).toBe("completed");
    expect(completed.source).toBe("mura_model");
    expect(completed.title).toBe("Воспоминание об отце");
    expect(completed.audioFileName).toBe(
      "Воспоминание-об-отце_2026-07-25_08-00-00.webm",
    );
    expect(completed.summary).toBe("Полная семейная история.");
    expect(completed.extraction).toEqual(extraction);
    expect(completed.extraction?.relationships).toEqual(
      extraction.relationships,
    );
    expect(completed.extraction?.events).toEqual(extraction.events);
    expect(completed.extraction?.review_items).toEqual(
      extraction.review_items,
    );
  });

  it("opens a legacy memory that predates extraction fields", () => {
    const legacy = normalizeSavedMemory({
      id: "legacy-memory",
      createdAt: "2026-07-25T08:00:00.000Z",
      locale: "ru",
      title: "Старая запись",
      summary: "Сохранённое воспоминание",
      transcript: "Старый локальный текст",
      people: [{ name: "Сабыр", relationship: "отец" }],
      durationSec: 42,
    });

    expect(legacy).toMatchObject({
      id: "legacy-memory",
      source: "mura_model",
      status: "completed",
      transcript: "Старый локальный текст",
    });
    expect(legacy?.extraction).toBeUndefined();
    expect(legacy?.audioFileName).toBe(
      "Старая-запись_2026-07-25_08-00-00.webm",
    );
  });

  it("keeps recordings sorted by recording time after later updates", () => {
    const older = {
      ...baseMemory(),
      id: "older",
      createdAt: "2026-07-24T08:00:00.000Z",
    };
    const newer = {
      ...baseMemory(),
      id: "newer",
      createdAt: "2026-07-25T08:00:00.000Z",
    };

    expect(sortSavedMemoriesNewestFirst([older, newer]).map(({ id }) => id))
      .toEqual(["newer", "older"]);
  });
});

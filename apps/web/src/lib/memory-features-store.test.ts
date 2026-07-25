import { describe, expect, it } from "vitest";
import {
  normalizeFavoriteReference,
  normalizePhotoMetadata,
} from "@/lib/memory-features-store";

describe("memory feature persistence", () => {
  it("normalizes durable photo metadata without embedding image data", () => {
    expect(
      normalizePhotoMetadata({
        id: "photo_1",
        memoryId: "memory_1",
        fileName: "school-play.jpg",
        mimeType: "image/jpeg",
        size: 2048,
        createdAt: "2026-07-26T08:00:00.000Z",
        order: 2,
      }),
    ).toEqual({
      id: "photo_1",
      memoryId: "memory_1",
      fileName: "school-play.jpg",
      mimeType: "image/jpeg",
      size: 2048,
      createdAt: "2026-07-26T08:00:00.000Z",
      order: 2,
    });
  });

  it("stores favorites as references to the original memory", () => {
    const reference = normalizeFavoriteReference({
      id: "favorite_1",
      memoryId: "memory_1",
      ownerPersonId: "erbol",
      createdAt: "2026-07-26T08:00:00.000Z",
      copiedTitle: "must not be persisted",
    });

    expect(reference).toEqual({
      id: "favorite_1",
      memoryId: "memory_1",
      ownerPersonId: "erbol",
      createdAt: "2026-07-26T08:00:00.000Z",
    });
  });

  it("rejects incomplete feature metadata", () => {
    expect(normalizePhotoMetadata({ id: "photo_1" })).toBeNull();
    expect(
      normalizeFavoriteReference({
        id: "favorite_1",
        memoryId: "memory_1",
      }),
    ).toBeNull();
  });
});

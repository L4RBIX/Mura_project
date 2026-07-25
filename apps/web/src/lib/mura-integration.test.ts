import { describe, expect, it } from "vitest";
import {
  finalPhrasesToSegments,
  languageHintsForLocale,
  selectPrimaryStory,
} from "@/lib/mura-integration";
import { extractionResultFixture } from "@/test/mura-fixtures";

describe("Mura transcript integration", () => {
  it("creates ordered valid segments from final phrases only", () => {
    const segments = finalPhrasesToSegments([
      {
        text: "Бірінші сөйлем",
        complete: true,
        startSec: 0.4,
        endSec: 1.8,
      },
      {
        text: "әлі айтылып жатыр",
        complete: false,
        startSec: 1.8,
        endSec: 2.1,
      },
      {
        text: "Екінші сөйлем",
        complete: true,
        startSec: 1.2,
        endSec: 1.2,
      },
      {
        text: "   ",
        complete: true,
        startSec: 3,
        endSec: 4,
      },
    ]);

    expect(segments).toHaveLength(2);
    expect(segments.map((segment) => segment.segment_id)).toEqual([
      "seg_001",
      "seg_002",
    ]);
    expect(segments.map((segment) => segment.text)).toEqual([
      "Бірінші сөйлем",
      "Екінші сөйлем",
    ]);
    expect(segments[0].start).toBeGreaterThanOrEqual(0);
    expect(segments[0].end).toBeGreaterThan(segments[0].start);
    expect(segments[1].start).toBeGreaterThanOrEqual(segments[0].end);
    expect(segments[1].end).toBeGreaterThan(segments[1].start);
  });

  it("orders locale hints without dropping the second supported language", () => {
    expect(languageHintsForLocale("kk")).toEqual(["kk", "ru"]);
    expect(languageHintsForLocale("ru")).toEqual(["ru", "kk"]);
  });

  it("selects the story linked to the most events", () => {
    const result = extractionResultFixture();

    expect(selectPrimaryStory(result)?.story_id).toBe("story_primary");
  });
});

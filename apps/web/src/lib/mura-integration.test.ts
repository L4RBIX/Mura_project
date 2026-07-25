import { describe, expect, it } from "vitest";
import {
  createExtractionRequestFromTranscript,
  finalPhrasesToSegments,
  languageHintsForLocale,
  selectPrimaryStory,
} from "@/lib/mura-integration";
import type { MuraTranscriptEnvelope } from "@/lib/mura-api-types";
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

  it("uses GigaAM segments as the extraction source", () => {
    const transcript: MuraTranscriptEnvelope = {
      recording_id: "rec_gigaam",
      duration_seconds: 3.4,
      language_hints: ["ky", "ru"],
      full_text: "Менин атам айылда мугалим болгон.",
      segments: [
        {
          segment_id: "seg_001",
          start: 0,
          end: 3.4,
          text: "Менин атам айылда мугалим болгон.",
          chunk_id: "chunk_001",
        },
      ],
      asr_model: "ai-sage/GigaAM-Multilingual",
      asr_revision: "pinned",
      chunker_version: "mura-fixed-overlap-v1",
      processing_seconds: 1.2,
      asr_metadata: { device: "cuda:0" },
    };

    expect(
      createExtractionRequestFromTranscript({
        transcript,
        speakerId: "speaker_test",
        speakerName: "Бакыт",
        locale: "ru",
      }),
    ).toEqual({
      recording_id: "rec_gigaam",
      speaker_id: "speaker_test",
      speaker_name: "Бакыт",
      language_hints: ["ky", "ru"],
      segments: [
        {
          segment_id: "seg_001",
          start: 0,
          end: 3.4,
          text: "Менин атам айылда мугалим болгон.",
        },
      ],
    });
  });

  it("selects the story linked to the most events", () => {
    const result = extractionResultFixture();

    expect(selectPrimaryStory(result)?.story_id).toBe("story_primary");
  });
});

import type { MuraExtractionResult } from "@/lib/mura-api-types";
import type { SavedMemory } from "@/lib/memory-store";

export function extractionResultFixture(): MuraExtractionResult {
  return {
    schema_version: "simple-v1",
    recording_id: "rec_test",
    languages: ["kk", "ru"],
    people: [
      {
        person_id: "person_speaker",
        name: "Айсұлу",
        aliases: [],
        category: "family_member",
        relation_to_speaker: "self",
        evidence_segment_ids: ["seg_001"],
        needs_review: false,
      },
      {
        person_id: "person_father",
        name: "Сабыр",
        aliases: ["Әке"],
        category: "family_member",
        relation_to_speaker: "father",
        evidence_segment_ids: ["seg_001"],
        needs_review: false,
      },
    ],
    relationships: [
      {
        relationship_id: "relationship_001",
        relationship_type: "parent_child",
        person_a_id: "person_father",
        person_a_role: "parent",
        person_b_id: "person_speaker",
        person_b_role: "child",
        evidence_segment_ids: ["seg_001"],
        needs_review: false,
      },
    ],
    events: [
      {
        event_id: "event_001",
        title: "Работа в саду",
        description: "Сабыр работал в яблоневом саду.",
        participant_person_ids: ["person_father"],
        date_text: null,
        location: "яблоневый сад",
        evidence_segment_ids: ["seg_001"],
        needs_review: false,
      },
      {
        event_id: "event_002",
        title: "Семейная история",
        description: "Айсұлу вспоминает отца.",
        participant_person_ids: ["person_speaker", "person_father"],
        date_text: null,
        location: null,
        evidence_segment_ids: ["seg_001"],
        needs_review: true,
      },
    ],
    stories: [
      {
        story_id: "story_secondary",
        title: "Короткая история",
        summary: "Одна часть воспоминания.",
        person_ids: ["person_father"],
        event_ids: ["event_001"],
        evidence_segment_ids: ["seg_001"],
        privacy: "private",
        needs_review: false,
      },
      {
        story_id: "story_primary",
        title: "Воспоминание об отце",
        summary: "Полная семейная история.",
        person_ids: ["person_speaker", "person_father"],
        event_ids: ["event_001", "event_002"],
        evidence_segment_ids: ["seg_001"],
        privacy: "private",
        needs_review: true,
      },
    ],
    review_items: [
      {
        review_id: "review_001",
        kind: "ambiguity",
        message: "Нужно уточнить дату.",
        segment_ids: ["seg_001"],
      },
    ],
  };
}

export function baseMemory(): SavedMemory {
  return {
    id: "memory_test",
    recordingId: "rec_test",
    createdAt: "2026-07-25T08:00:00.000Z",
    locale: "kk",
    title: "25 шілде күнгі аудио",
    summary: "Менің әкем Сабыр алма бағында жұмыс істеген.",
    transcript: "Менің әкем Сабыр алма бағында жұмыс істеген.",
    people: [],
    durationSec: 12,
    audioMimeType: "audio/webm",
    audioFileName: "25-шілде-күнгі-аудио_2026-07-25_08-00-00.webm",
    source: "mura_model",
    status: "extracting",
    extractionRequest: {
      recording_id: "rec_test",
      speaker_id: "speaker_test",
      speaker_name: "Айсұлу",
      language_hints: ["kk", "ru"],
      segments: [
        {
          segment_id: "seg_001",
          start: 0,
          end: 4.2,
          text: "Менің әкем Сабыр алма бағында жұмыс істеген.",
        },
      ],
    },
  };
}

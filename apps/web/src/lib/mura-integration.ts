import type { Locale } from "@/lib/i18n";
import type {
  MuraExtractionRequest,
  MuraExtractionResult,
  MuraStory,
  MuraTranscriptEnvelope,
  TranscriptSegment,
} from "@/lib/mura-api-types";

const SPEAKER_STORAGE_KEY = "mura-local-speaker-id-v1";

export interface FinalTranscriptPhrase {
  text: string;
  complete: boolean;
  startSec: number;
  endSec: number;
}

/**
 * Browser SpeechRecognition does not expose word alignment. These timestamps
 * preserve phrase order and use the hook's approximate active-recording time.
 */
export function finalPhrasesToSegments(
  phrases: readonly FinalTranscriptPhrase[],
): TranscriptSegment[] {
  let previousEnd = 0;

  return phrases
    .filter((phrase) => phrase.complete && phrase.text.trim())
    .map((phrase) => {
      const rawStart = Number.isFinite(phrase.startSec) ? phrase.startSec : previousEnd;
      const rawEnd = Number.isFinite(phrase.endSec) ? phrase.endSec : rawStart + 0.001;
      const start = Math.max(previousEnd, rawStart, 0);
      const end = Math.max(rawEnd, start + 0.001);
      previousEnd = end;
      return { start, end, text: phrase.text.trim() };
    })
    .map((phrase, index) => ({
      segment_id: `seg_${String(index + 1).padStart(3, "0")}`,
      ...phrase,
    }));
}

export function mixedLanguageHints(): ["kk", "ru"] {
  // Interface language controls labels only. Every recording is treated as
  // potentially code-switched Kazakh/Russian speech.
  return ["kk", "ru"];
}

export function getOrCreateLocalSpeakerId(): string {
  const existing = window.localStorage.getItem(SPEAKER_STORAGE_KEY)?.trim();
  if (existing) return existing;

  const speakerId = `speaker_${crypto.randomUUID()}`;
  window.localStorage.setItem(SPEAKER_STORAGE_KEY, speakerId);
  return speakerId;
}

export function createExtractionRequest(input: {
  recordingId: string;
  speakerId: string;
  speakerName: string;
  locale: Locale;
  phrases: readonly FinalTranscriptPhrase[];
}): MuraExtractionRequest | null {
  const segments = finalPhrasesToSegments(input.phrases);
  const recordingId = input.recordingId.trim();
  const speakerId = input.speakerId.trim();
  const speakerName = input.speakerName.trim();
  if (!segments.length || !recordingId || !speakerId || !speakerName) return null;

  return {
    recording_id: recordingId,
    speaker_id: speakerId,
    speaker_name: speakerName,
    language_hints: mixedLanguageHints(),
    segments,
  };
}

export function createExtractionRequestFromTranscript(input: {
  transcript: MuraTranscriptEnvelope;
  speakerId: string;
  speakerName: string;
  locale: Locale;
}): MuraExtractionRequest | null {
  const recordingId = input.transcript.recording_id.trim();
  const speakerId = input.speakerId.trim();
  const speakerName = input.speakerName.trim();
  const segments = input.transcript.segments.map((segment) => ({
    segment_id: segment.segment_id,
    start: segment.start,
    end: segment.end,
    text: segment.text.trim(),
  }));

  if (!recordingId || !speakerId || !speakerName || !segments.length) {
    return null;
  }

  return {
    recording_id: recordingId,
    speaker_id: speakerId,
    speaker_name: speakerName,
    language_hints: Array.from(
      new Set([
        ...input.transcript.language_hints,
        ...mixedLanguageHints(),
      ]),
    ),
    segments,
  };
}

export function selectPrimaryStory(
  result: MuraExtractionResult,
): MuraStory | null {
  let primary = result.stories[0] ?? null;
  for (const story of result.stories.slice(1)) {
    if (story.event_ids.length > (primary?.event_ids.length ?? -1)) primary = story;
  }
  return primary;
}

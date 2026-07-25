"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ScreenHeader } from "@/components/layout/screen-header";
import { LiveTranscript } from "@/components/record/live-transcript";
import { RecordButton } from "@/components/record/record-button";
import { RecordControls } from "@/components/record/record-controls";
import { Waveform } from "@/components/record/waveform";
import { useLiveTranscript } from "@/hooks/use-live-transcript";
import { useRecorder } from "@/hooks/use-recorder";
import { formatTimer } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMuraI18n } from "@/lib/i18n";
import { requestMuraTranscription } from "@/lib/mura-asr-client";
import { isMuraExtractionConfigured } from "@/lib/mura-client";
import {
  createExtractionRequest,
  createExtractionRequestFromTranscript,
  getOrCreateLocalSpeakerId,
} from "@/lib/mura-integration";
import {
  saveMemory,
  updateSavedMemory,
  type SavedMemory,
} from "@/lib/memory-store";

const EASE = [0.23, 1, 0.32, 1] as const;

function TimerChip({ seconds, recording }: { seconds: number; recording: boolean }) {
  return (
    <span className="flex h-11 items-center gap-2 rounded-full bg-raised px-4 shadow-soft">
      <span
        className={cn(
          "size-2 rounded-full",
          recording ? "animate-pulse bg-ink" : "bg-muted",
        )}
      />
      <span className="text-[13px] font-semibold tabular-nums">
        {formatTimer(seconds)}
      </span>
    </span>
  );
}

export function RecordView() {
  const { locale, narrator, t } = useMuraI18n();
  const router = useRouter();
  const { status, seconds, level, error: recorderError, start, pause, resume, restart, finish: finishAudio } = useRecorder();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<"upload" | null>(null);
  const {
    sentences,
    discardAndReset,
    finalizeFinalSentences,
    reset,
    supported,
    error: recognitionError,
  } = useLiveTranscript(locale, status === "recording");

  const startRecording = async () => {
    reset();
    setUploadError(null);
    await start();
  };

  const finish = async () => {
    if (seconds <= 0 || uploading) return;
    setUploading(true);
    setUploadError(null);
    const finalSentencesPromise = finalizeFinalSentences();
    const audioPromise = finishAudio();
    const [finalSentences, audio] = await Promise.all([
      finalSentencesPromise,
      audioPromise,
    ]);
    if (!audio) {
      setUploadError("upload");
      setUploading(false);
      return;
    }
    try {
      const memoryId = `local-${crypto.randomUUID()}`;
      const recordingId = `rec_${crypto.randomUUID()}`;
      const createdAt = new Date().toISOString();
      const speakerName = narrator.name.trim() || t("genericNarrator");
      const speakerId = getOrCreateLocalSpeakerId();
      const browserExtractionRequest = createExtractionRequest({
        recordingId,
        speakerId,
        speakerName,
        locale,
        phrases: finalSentences,
      });
      const browserTranscript = (browserExtractionRequest?.segments ?? [])
        .map((segment) => segment.text)
        .join(" ")
        .trim();
      const dateLabel = new Intl.DateTimeFormat(
        locale === "kk" ? "kk-KZ" : "ru-RU",
        { day: "numeric", month: "long" },
      ).format(new Date(createdAt));
      const memory: SavedMemory = {
        id: memoryId,
        recordingId,
        createdAt,
        locale,
        title: t("audioMemoryTitleWithDate", { date: dateLabel }),
        summary: browserTranscript || t("transcriptUnavailable"),
        transcript: browserTranscript,
        people: [],
        durationSec: seconds,
        source: browserExtractionRequest ? "mura_model" : "audio_only",
        status: browserExtractionRequest ? "extracting" : "audio_only",
        extractionRequest: browserExtractionRequest ?? undefined,
      };

      // Persist the original recording before sending audio to any remote model.
      await saveMemory(memory, audio);

      let resolvedMemory = memory;
      try {
        const asrTranscript = await requestMuraTranscription(audio, recordingId);
        const asrExtractionRequest = createExtractionRequestFromTranscript({
          transcript: asrTranscript,
          speakerId,
          speakerName,
          locale,
        });
        if (asrExtractionRequest) {
          const transcript = asrTranscript.full_text.trim();
          resolvedMemory = {
            ...memory,
            summary: transcript,
            transcript,
            durationSec: asrTranscript.duration_seconds,
            source: "mura_model",
            status: "extracting",
            extractionRequest: asrExtractionRequest,
          };
          updateSavedMemory(resolvedMemory);
        }
      } catch {
        // Browser final phrases remain a graceful fallback if Kaggle is sleeping
        // or temporarily unavailable. The original audio is already preserved.
      }

      if (
        resolvedMemory.extractionRequest &&
        !(await isMuraExtractionConfigured())
      ) {
        resolvedMemory = {
          ...resolvedMemory,
          source: "audio_only",
          status: "audio_only",
          extractionRequest: undefined,
        };
        updateSavedMemory(resolvedMemory);
      }

      router.push(
        resolvedMemory.extractionRequest
          ? `/processing?memory=${encodeURIComponent(memoryId)}`
          : `/story/${encodeURIComponent(memoryId)}`,
      );
    } catch {
      setUploadError("upload");
      setUploading(false);
    }
  };

  const handleRestart = () => {
    discardAndReset();
    void restart();
  };

  return (
    <div className="flex h-dvh flex-col">
      <ScreenHeader
        title={t("newMemory")}
        fallbackHref="/home"
        right={
          status !== "idle" || uploading ? (
            <TimerChip seconds={seconds} recording={status === "recording"} />
          ) : undefined
        }
      />

      <AnimatePresence mode="wait">
        {status === "idle" && !uploading ? (
          <motion.div
            key="idle"
            className="flex flex-1 flex-col items-center justify-center gap-14 px-8 pb-24 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <div>
              <h1 className="text-[32px] font-bold leading-[1.15] tracking-[-0.03em]">
                {t("rememberPrompt").split("\n").map((line) => (
                  <span key={line} className="block">{line}</span>
                ))}
              </h1>
              <p className="mt-4 text-[16px] leading-relaxed text-muted">
                {t("rememberHint").split("\n").map((line) => (
                  <span key={line} className="block">{line}</span>
                ))}
              </p>
            </div>
            <RecordButton onClick={startRecording} size={112} label={t("startRecording")} />
            {(recorderError || uploadError) && (
              <p className="max-w-[320px] text-[13px] leading-relaxed text-red-700">
                {recorderError
                  ? t("microphoneError")
                  : t("uploadError")}
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="recording"
            className="flex min-h-0 flex-1 flex-col px-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <LiveTranscript
              sentences={sentences}
              listening={status === "recording"}
              supported={supported}
              recognitionError={recognitionError}
              className="min-h-0 flex-1"
            />
            <div className="shrink-0 pb-[max(env(safe-area-inset-bottom),20px)] pt-4">
              <Waveform active={status === "recording"} level={level} className="mb-5" />
              {!uploading && (
                <RecordControls
                  paused={status === "paused"}
                  onPause={pause}
                  onResume={resume}
                  onRestart={handleRestart}
                  onFinish={finish}
                />
              )}
              {uploading && (
                <p className="mt-3 text-center text-[13px] font-medium text-muted">
                  {t("uploading")}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

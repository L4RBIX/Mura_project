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
import { saveMemory, type SavedMemory } from "@/lib/memory-store";

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
  const { locale, t } = useMuraI18n();
  const router = useRouter();
  const { status, seconds, level, error: recorderError, start, pause, resume, restart, finish: finishAudio } = useRecorder();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<"upload" | null>(null);
  const { sentences, reset, supported, error: recognitionError } = useLiveTranscript(
    locale,
    status === "recording",
  );

  const startRecording = async () => {
    reset();
    setUploadError(null);
    await start();
  };

  const finish = async () => {
    if (seconds <= 0 || uploading) return;
    setUploading(true);
    setUploadError(null);
    const audio = await finishAudio();
    if (!audio) {
      setUploadError("upload");
      setUploading(false);
      return;
    }
    const extension = audio.type.includes("mp4") ? "m4a" : "webm";
    const transcript = sentences.map((sentence) => sentence.text).join(" ").trim();
    const memoryId = `local-${crypto.randomUUID()}`;
    const baseMemory: SavedMemory = {
      id: memoryId,
      createdAt: new Date().toISOString(),
      locale,
      title: t("audioMemoryTitle"),
      summary: transcript || t("transcriptUnavailable"),
      transcript,
      people: [],
      durationSec: seconds,
      source: "audio_only",
    };
    const form = new FormData();
    form.append("file", audio, `mura-recording.${extension}`);
    form.append("family_id", "family_mura_app");
    form.append("speaker_id", "aisulu");
    form.append("speaker_name", "Айсұлу");
    try {
      const response = await fetch("/api/mura/v1/recordings", { method: "POST", body: form });
      if (response.ok) {
        const accepted = (await response.json()) as { recording_id: string; job_id: string };
        await saveMemory({ ...baseMemory, source: "mura_core" }, audio);
        router.push(
          `/processing?job=${encodeURIComponent(accepted.job_id)}&recording=${encodeURIComponent(accepted.recording_id)}&memory=${encodeURIComponent(memoryId)}`,
        );
        return;
      }
      if (![502, 503].includes(response.status)) throw new Error("upload_failed");
      if (!transcript) {
        await saveMemory(baseMemory, audio);
        router.push(`/processing?memory=${encodeURIComponent(memoryId)}`);
        return;
      }
      const fallback = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transcript, locale }),
      });
      if (!fallback.ok) {
        await saveMemory(baseMemory, audio);
        router.push(`/processing?memory=${encodeURIComponent(memoryId)}`);
        return;
      }
      const analysis = (await fallback.json()) as {
        title?: string;
        summary?: string;
        people?: Array<{ name?: string; relationship?: string }>;
      };
      const memory: SavedMemory = {
        ...baseMemory,
        title: analysis.title?.trim() || baseMemory.title,
        summary: analysis.summary?.trim() || baseMemory.summary,
        people: (analysis.people ?? [])
          .filter((person) => person.name?.trim())
          .map((person) => ({
            name: person.name!.trim(),
            relationship: person.relationship?.trim() ?? "",
          })),
        source: "deepseek_fallback",
      };
      await saveMemory(memory, audio);
      router.push(`/processing?memory=${encodeURIComponent(memoryId)}`);
    } catch {
      setUploadError("upload");
      setUploading(false);
    }
  };

  const handleRestart = () => {
    reset();
    restart();
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

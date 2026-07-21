"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { ScreenHeader } from "@/components/layout/screen-header";
import { TranscriptReader } from "@/components/story/transcript-reader";
import { formatDuration } from "@/lib/format";
import { useMuraI18n } from "@/lib/i18n";
import {
  getMemoryAudio,
  getSavedMemory,
  type SavedMemory,
} from "@/lib/memory-store";

export function LocalStoryView({ memoryId }: { memoryId: string }) {
  const { locale, t } = useMuraI18n();
  const [memory, setMemory] = useState<SavedMemory | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const current = getSavedMemory(memoryId);
    setMemory(current);
    if (!current) {
      setLoaded(true);
      return;
    }
    void getMemoryAudio(memoryId)
      .then((audio) => {
        if (!active || !audio) return;
        setAudioUrl(URL.createObjectURL(audio));
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [memoryId]);

  useEffect(
    () => () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    },
    [audioUrl],
  );

  const recordedAt = useMemo(() => {
    if (!memory) return "";
    return new Intl.DateTimeFormat(locale === "kk" ? "kk-KZ" : "ru-RU", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(memory.createdAt));
  }, [locale, memory]);

  if (!loaded) return null;
  if (!memory) {
    return (
      <div>
        <ScreenHeader title={t("memory")} fallbackHref="/home" />
        <p className="px-6 pt-16 text-center text-muted">{t("memoryNotFound")}</p>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <ScreenHeader title={t("memory")} fallbackHref="/home" />
      <motion.article
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-2"
      >
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted">
          {recordedAt}
        </p>
        <h1 className="mt-2 text-[34px] font-bold leading-[1.1] tracking-[-0.03em]">
          {memory.title}
        </h1>
        <p className="mt-3 text-[14px] text-muted">
          {formatDuration(memory.durationSec)}
        </p>

        {audioUrl && (
          <div className="mt-7 rounded-[28px] bg-raised p-5 shadow-card">
            <audio className="w-full" controls preload="metadata" src={audioUrl}>
              <track kind="captions" />
            </audio>
          </div>
        )}

        <section className="mt-10 rounded-[28px] bg-clay/55 p-5">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted">
            {t("aiSummary")}
          </h2>
          <p className="mt-3 text-[18px] font-medium leading-relaxed">{memory.summary}</p>
        </section>

        <section className="mt-10">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted">
            {t("transcript")}
          </h2>
          <div className="mt-4">
            <TranscriptReader
              paragraphs={[memory.transcript || t("transcriptUnavailable")]}
            />
          </div>
        </section>

        {memory.people.length > 0 && (
          <section className="mt-12">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted">
              {t("inThisMemory")}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {memory.people.map((person, index) => (
                <span
                  key={`${person.name}-${index}`}
                  className="rounded-full bg-raised px-4 py-2 text-[14px] font-semibold shadow-soft"
                >
                  {person.name}
                  {person.relationship ? ` · ${person.relationship}` : ""}
                </span>
              ))}
            </div>
          </section>
        )}
      </motion.article>
    </div>
  );
}

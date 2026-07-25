"use client";

import { useEffect, useRef } from "react";
import { Highlight } from "@/components/ui/highlight";
import type { LiveSentence } from "@/hooks/use-live-transcript";
import { cn } from "@/lib/utils";
import { useMuraI18n } from "@/lib/i18n";

interface LiveTranscriptProps {
  sentences: LiveSentence[];
  listening: boolean;
  supported: boolean | null;
  recognitionError: string | null;
  className?: string;
}

const sentenceClass =
  "mb-4 text-[30px] font-semibold leading-[1.3] tracking-[-0.02em]";

function Caret() {
  return (
    <span
      aria-hidden
      className="ml-1.5 inline-block h-[0.9em] w-[3px] translate-y-[0.14em] animate-caret rounded-full bg-ink"
    />
  );
}

/**
 * The hero of the recording screen: spoken sentences settle into the page and
 * fade with age, while the sentence still being said wears the highlighter.
 */
export function LiveTranscript({
  sentences,
  listening,
  supported,
  recognitionError,
  className,
}: LiveTranscriptProps) {
  const { t } = useMuraI18n();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [sentences]);

  const lastComplete = sentences.filter((s) => s.complete).length - 1;

  return (
    <div
      ref={scrollRef}
      className={cn("overflow-y-auto", className)}
      style={{
        maskImage: "linear-gradient(to bottom, transparent 0, black 56px)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0, black 56px)",
      }}
    >
      <div className="pb-2 pt-16">
        {sentences.length === 0 && supported !== false && !recognitionError && (
          <p className={cn(sentenceClass, "text-muted/70")}>
            {t("listening")}
            {listening && <Caret />}
          </p>
        )}
        {sentences.length === 0 && supported === false && (
          <p className={cn(sentenceClass, "text-muted/70")}>
            {t("liveTextUnavailable")}
          </p>
        )}
        {sentences.length === 0 && recognitionError && (
          <p className={cn(sentenceClass, "text-muted/70")}>
            {t("speechRecognitionError")}
          </p>
        )}
        {sentences.map((sentence, i) =>
          sentence.complete ? (
            <p
              key={sentence.id}
              className={sentenceClass}
              style={{ opacity: Math.max(0.3, 0.85 - (lastComplete - i) * 0.18) }}
            >
              {sentence.text}
            </p>
          ) : (
            <p key={sentence.id} className={sentenceClass}>
              <Highlight tone="clay">{sentence.text}</Highlight>
              {listening && <Caret />}
            </p>
          ),
        )}
      </div>
    </div>
  );
}

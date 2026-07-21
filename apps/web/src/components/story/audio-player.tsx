"use client";

import { Pause, Play } from "lucide-react";
import { useMemo } from "react";
import { useMockPlayback } from "@/hooks/use-mock-playback";
import { formatTimer } from "@/lib/format";
import { seededWaveform } from "@/lib/waveform";
import { cn } from "@/lib/utils";
import { useMuraI18n } from "@/lib/i18n";

const BAR_COUNT = 44;

interface AudioPlayerProps {
  /** Seeds the waveform so each story keeps its own shape. */
  seed: string;
  durationSec: number;
}

export function AudioPlayer({ seed, durationSec }: AudioPlayerProps) {
  const { t } = useMuraI18n();
  const { playing, elapsed, progress, toggle, seek } = useMockPlayback(durationSec);
  const bars = useMemo(() => seededWaveform(seed, BAR_COUNT), [seed]);

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    seek((event.clientX - rect.left) / rect.width);
  };

  return (
    <div className="flex items-center gap-4 rounded-[28px] bg-raised p-4 shadow-card">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? t("pauseAudio") : t("play")}
        className="flex size-14 shrink-0 items-center justify-center rounded-full bg-ink text-raised transition-transform duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40"
      >
        {playing ? (
          <Pause className="size-5 fill-current" strokeWidth={0} />
        ) : (
          <Play className="size-5 translate-x-[1px] fill-current" strokeWidth={0} />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div
          className="flex h-10 cursor-pointer items-center gap-[2.5px]"
          onClick={handleSeek}
          aria-hidden
        >
          {bars.map((height, i) => (
            <span
              key={i}
              className={cn(
                "min-w-0 flex-1 rounded-full",
                i / BAR_COUNT <= progress ? "bg-ink" : "bg-ink/15",
              )}
              style={{ height: `${height * 100}%` }}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[12px] tabular-nums text-muted">
          <span>{formatTimer(elapsed)}</span>
          <span>{formatTimer(durationSec)}</span>
        </div>
      </div>
    </div>
  );
}

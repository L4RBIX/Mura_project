"use client";

import { Heart, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AudioPlayer } from "@/components/story/audio-player";
import { useMemoryPhotos } from "@/hooks/use-memory-photos";
import { formatDuration } from "@/lib/format";
import { useMuraI18n } from "@/lib/i18n";
import { getMemoryAudio } from "@/lib/memory-store";
import type { Story } from "@/lib/types";

export function FavoriteMemoryCard({
  story,
  narratorName,
  mentionedNames,
  onRemove,
}: {
  story: Story;
  narratorName: string;
  mentionedNames: readonly string[];
  onRemove: () => void;
}) {
  const { t } = useMuraI18n();
  const { photos } = useMemoryPhotos(story.id);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const local = story.id.startsWith("local-");

  useEffect(() => {
    if (!local) return;
    let active = true;
    void getMemoryAudio(story.id).then((audio) => {
      if (!active || !audio) return;
      setAudioUrl(URL.createObjectURL(audio));
    });
    return () => {
      active = false;
    };
  }, [local, story.id]);

  useEffect(
    () => () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    },
    [audioUrl],
  );

  return (
    <article className="overflow-hidden rounded-[28px] bg-raised shadow-card">
      {photos[0] && (
        <Link
          href={`/story/${story.id}`}
          className="relative block aspect-[16/10] overflow-hidden"
        >
          <Image
            src={photos[0].url}
            alt={photos[0].fileName}
            fill
            unoptimized
            sizes="382px"
            className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.985]"
          />
        </Link>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <Link href={`/story/${story.id}`} className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              {story.recordedLabel}
            </p>
            <h2 className="mt-1.5 text-[20px] font-bold leading-snug">
              {story.title}
            </h2>
          </Link>
          <button
            type="button"
            onClick={onRemove}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-clay transition-transform active:scale-90"
            aria-label={t("removeFavorite")}
          >
            <Heart className="size-4 fill-current" strokeWidth={1.8} />
          </button>
        </div>

        <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-ink/75">
          {story.excerpt}
        </p>
        <div className="mt-4 space-y-1 text-[12px] text-muted">
          <p>
            {t("narratorLabel")}: {narratorName}
          </p>
          {mentionedNames.length > 0 && (
            <p>
              {t("mentionedPersonLabel")}: {mentionedNames.join(", ")}
            </p>
          )}
          <p>{formatDuration(story.durationSec)}</p>
        </div>

        <div className="mt-5">
          {local ? (
            audioUrl ? (
              <audio className="w-full" controls preload="metadata" src={audioUrl}>
                <track kind="captions" />
              </audio>
            ) : (
              <Link
                href={`/story/${story.id}`}
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-sand text-[13px] font-bold"
              >
                <Play className="size-4 fill-current" strokeWidth={0} />
                {t("listen")}
              </Link>
            )
          ) : (
            <AudioPlayer seed={story.id} durationSec={story.durationSec} />
          )}
        </div>
      </div>
    </article>
  );
}

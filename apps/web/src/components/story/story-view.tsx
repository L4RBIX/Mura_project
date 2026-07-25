"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ScreenHeader } from "@/components/layout/screen-header";
import { AudioPlayer } from "@/components/story/audio-player";
import { FavoriteMemoryButton } from "@/components/story/favorite-memory-button";
import { MemoryPhotoGallery } from "@/components/story/memory-photo-gallery";
import { TranscriptReader } from "@/components/story/transcript-reader";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { formatDuration } from "@/lib/format";
import { useMuraI18n } from "@/lib/i18n";
import type { Story } from "@/lib/types";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.23, 1, 0.32, 1] as const },
  },
};

export function StoryView({ story }: { story: Story }) {
  const { narrator, peopleInStory, getPerson, getStory, t } = useMuraI18n();
  const currentStory = getStory(story.id) ?? story;
  const storyNarrator = getPerson(currentStory.narratorId) ?? narrator;
  const mentioned = peopleInStory(currentStory);

  return (
    <div className="pb-20">
      <ScreenHeader title={t("memory")} fallbackHref="/home" />

      <motion.article
        variants={container}
        initial="hidden"
        animate="visible"
        className="px-6 pt-2"
      >
        <motion.p
          variants={item}
          className="text-[12px] font-semibold uppercase tracking-[0.2em] text-muted"
        >
          {currentStory.era}
        </motion.p>

        <motion.h1
          variants={item}
          className="mt-2 text-[34px] font-bold leading-[1.1] tracking-[-0.03em]"
        >
          {currentStory.title}
        </motion.h1>

        <motion.p variants={item} className="mt-3 text-[14px] text-muted">
          {t("toldBy", { name: storyNarrator.name })} · {currentStory.recordedLabel} ·{" "}
          {formatDuration(currentStory.durationSec)}
        </motion.p>

        <motion.div variants={item} className="mt-6">
          <FavoriteMemoryButton
            memoryId={currentStory.id}
            ownerPersonId={narrator.id}
          />
        </motion.div>

        <motion.div variants={item} className="mt-7">
          <AudioPlayer seed={currentStory.id} durationSec={currentStory.durationSec} />
        </motion.div>

        <motion.section
          variants={item}
          className="mt-10 rounded-[28px] bg-clay/55 p-5"
        >
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted">
            {t("aiSummary")}
          </h2>
          <p className="mt-3 text-[18px] font-medium leading-relaxed">
            {currentStory.excerpt}
          </p>
        </motion.section>

        <motion.div variants={item}>
          <MemoryPhotoGallery memoryId={currentStory.id} />
        </motion.div>

        {mentioned.length > 0 && (
          <motion.section variants={item} className="mt-12">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted">
              {t("inThisMemory")}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {mentioned.map((person) => (
                <Link
                  key={person.id}
                  href={`/person/${person.id}`}
                  className="flex items-center gap-2 rounded-full bg-raised py-1.5 pl-1.5 pr-4 shadow-soft transition-transform duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40"
                >
                  <InitialsAvatar person={person} size={28} />
                  <span className="text-[14px] font-semibold">{person.name}</span>
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        <motion.section variants={item} className="mt-12">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted">
            {t("timeline")}
          </h2>
          <div className="ml-1 mt-5 border-l border-ink/10 pl-6">
            <div className="relative">
              <span className="absolute -left-[29px] top-1.5 size-2.5 rounded-full bg-clay" />
              <p className="text-[12px] font-semibold uppercase tracking-[0.15em] text-muted">
                {currentStory.era}
              </p>
              <p className="mt-1.5 text-[16px] font-semibold leading-relaxed">
                {currentStory.title}
              </p>
            </div>
          </div>
        </motion.section>

        <motion.div variants={item} className="mt-12">
          <h2 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-muted">
            {t("transcript")}
          </h2>
          <TranscriptReader paragraphs={currentStory.paragraphs} />
        </motion.div>
      </motion.article>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { Play, Waypoints } from "lucide-react";
import Link from "next/link";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Button } from "@/components/ui/button";
import { Highlight } from "@/components/ui/highlight";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { formatDuration } from "@/lib/format";
import { useMuraI18n } from "@/lib/i18n";
import { toneBg } from "@/lib/tones";
import type { Person, Story } from "@/lib/types";
import { cn } from "@/lib/utils";

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

/** The AI portrait, with its key phrase wearing the person’s highlighter. */
function Summary({ person }: { person: Person }) {
  const { summary, summaryHighlight, tone } = person;
  const index = summaryHighlight ? summary.indexOf(summaryHighlight) : -1;
  if (!summaryHighlight || index === -1) return <>{summary}</>;
  return (
    <>
      {summary.slice(0, index)}
      <Highlight tone={tone}>{summaryHighlight}</Highlight>
      {summary.slice(index + summaryHighlight.length)}
    </>
  );
}

function StoryTimelineItem({ story, person }: { story: Story; person: Person }) {
  const { t } = useMuraI18n();
  return (
    <li className="relative">
      <span
        aria-hidden
        className={cn(
          "absolute -left-[29px] top-1.5 size-2.5 rounded-full",
          toneBg[person.tone],
        )}
      />
      <Link
        href={`/story/${story.id}`}
        className="block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink/40"
      >
        <p className="text-[12px] font-semibold uppercase tracking-[0.15em] text-muted">
          {story.era}
        </p>
        <h3 className="mt-1.5 text-[18px] font-semibold leading-snug">
          {story.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-[15px] leading-relaxed text-muted">
          {story.excerpt}
        </p>
        <span className="mt-3 flex items-center gap-2.5 text-[13px] font-medium text-muted">
          <span className="flex size-9 items-center justify-center rounded-full bg-raised text-ink shadow-soft">
            <Play className="size-3.5 translate-x-[1px] fill-current" strokeWidth={0} />
          </span>
          {t("listen")} · {formatDuration(story.durationSec)}
        </span>
      </Link>
    </li>
  );
}

function EmptyTimeline({ person }: { person: Person }) {
  const { t } = useMuraI18n();
  return (
    <div className="mt-6 rounded-[24px] bg-raised p-6 shadow-soft">
      <p className="text-[16px] font-semibold">
        {t("noMention", { name: person.name })}
      </p>
      <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
        {t("nextMention", { name: person.name })}
      </p>
      <Button asChild className="mt-5">
        <Link href="/record">{t("recordAMemory")}</Link>
      </Button>
    </div>
  );
}

export function PersonView({ person }: { person: Person }) {
  const { narrator, storiesForPerson, getPerson, formatYears, t } = useMuraI18n();
  const currentPerson = getPerson(person.id) ?? person;
  const personStories = storiesForPerson(currentPerson.id);

  return (
    <div className="pb-16">
      <ScreenHeader fallbackHref="/tree" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="px-6 pt-4"
      >
        <motion.div variants={item}>
          <InitialsAvatar person={currentPerson} size={88} />
        </motion.div>

        <motion.header variants={item}>
          <p className="mt-6 text-[12px] font-semibold uppercase tracking-[0.2em] text-muted">
            {currentPerson.relation}
          </p>
          <h1 className="mt-2 text-[40px] font-bold leading-[1.02] tracking-[-0.035em]">
            {currentPerson.name}
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            {formatYears(currentPerson.born, currentPerson.died)}
          </p>
        </motion.header>

        <motion.div variants={item} className="mt-5">
          <Button asChild variant="soft" className="gap-2">
            <Link href={`/tree?center=${currentPerson.id}`}>
              <Waypoints className="size-4" strokeWidth={2} />
              {t("familyTree")}
            </Link>
          </Button>
        </motion.div>

        <motion.p
          variants={item}
          className="mt-7 text-[19px] leading-[1.55] text-ink/85"
        >
          <Summary person={currentPerson} />
        </motion.p>

        <motion.section variants={item} className="mt-12">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted">
            {currentPerson.isNarrator
              ? t("memoriesTold", { name: narrator.name })
              : `${t("memories")} · ${personStories.length}`}
          </h2>
          {personStories.length === 0 ? (
            <EmptyTimeline person={currentPerson} />
          ) : (
            <ol className="ml-1 mt-6 space-y-9 border-l border-ink/10 pl-6">
              {personStories.map((story) => (
                <StoryTimelineItem key={story.id} story={story} person={currentPerson} />
              ))}
            </ol>
          )}
        </motion.section>
      </motion.div>
    </div>
  );
}

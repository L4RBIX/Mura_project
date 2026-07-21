"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { MemoryCard } from "@/components/home/memory-card";
import { FamilyTreeCard } from "@/components/home/family-tree-card";
import { RecordButton } from "@/components/record/record-button";
import { useMuraI18n } from "@/lib/i18n";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.23, 1, 0.32, 1] as const },
  },
};

export function HomeView() {
  const { narrator, greetingForHour, t, locale } = useMuraI18n();
  const [savedStories, setSavedStories] = useState<import("@/lib/types").Story[]>([]);
  // Set after mount so the prerendered greeting never mismatches the client.
  const [greeting, setGreeting] = useState(() => greetingForHour(13));
  useEffect(() => setGreeting(greetingForHour(new Date().getHours())), [greetingForHour, locale]);
  useEffect(() => {
    void import("@/lib/memory-store").then(({ getSavedMemories, savedMemoryToStory }) => {
      setSavedStories(getSavedMemories().map(savedMemoryToStory));
    });
  }, []);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className="px-6 pb-16 pt-[max(env(safe-area-inset-top),28px)]"
    >
      <motion.header variants={item}>
        <p className="text-[15px] text-muted">
          {greeting}, {narrator.name}
        </p>
        <h1 className="mt-1.5 text-[36px] font-bold leading-[1.05] tracking-[-0.03em]">
          {t("todaysMemories")}
        </h1>
      </motion.header>

      <motion.div variants={item} className="my-14 flex justify-center">
        <RecordButton
          href="/record"
          label={t("recordMemory")}
          sublabel={t("pressAndSpeak")}
        />
      </motion.div>

      <motion.div variants={item}>
        <FamilyTreeCard />
      </motion.div>

      <motion.section variants={item} className="mt-10">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted">
          {t("recentRecordings")}
        </h2>
        <div className="mt-4 space-y-3">
          {savedStories.map((story) => (
            <MemoryCard key={story.id} story={story} />
          ))}
          {savedStories.length === 0 && (
            <p className="rounded-[24px] bg-raised p-5 text-[14px] text-muted shadow-soft">
              {t("noSavedMemories")}
            </p>
          )}
        </div>
      </motion.section>
    </motion.div>
  );
}

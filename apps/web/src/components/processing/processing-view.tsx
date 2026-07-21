"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { useMuraI18n } from "@/lib/i18n";
import type { Person } from "@/lib/types";

const EASE = [0.23, 1, 0.32, 1] as const;

/** The recording that just “finished” on the previous screen. */
const STORY_ID = "mothers-bread";

function PersonChip({ person, delay }: { person: Person; delay: number }) {
  return (
    <motion.span
      className="flex items-center gap-2 rounded-full bg-raised py-1.5 pl-1.5 pr-4 shadow-soft"
      initial={{ opacity: 0, scale: 0.8, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 300, damping: 22 }}
    >
      <InitialsAvatar person={person} size={26} />
      <span className="text-[14px] font-semibold">{person.name}</span>
    </motion.span>
  );
}

export function ProcessingView() {
  const { getStory, peopleInStory, t } = useMuraI18n();
  const steps = [t("processingListen"), t("processingPeople"), t("processingPlace")];
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("job");
  const recordingId = searchParams.get("recording");
  const [step, setStep] = useState(0);
  const [failed, setFailed] = useState(false);
  const story = getStory(STORY_ID)!;
  const mentioned = peopleInStory(story).slice(0, 2);

  useEffect(() => {
    if (jobId) return;
    const timers = [
      setTimeout(() => setStep(1), 1600),
      setTimeout(() => setStep(2), 3300),
      setTimeout(() => router.replace(`/tree?new=${story.id}`), 5400),
    ];
    return () => timers.forEach(clearTimeout);
  }, [jobId, router, story.id]);

  useEffect(() => {
    if (!jobId || !recordingId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/mura/v1/jobs/${encodeURIComponent(jobId)}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("job_poll_failed");
        const job = (await response.json()) as { status: string; stage: string };
        if (cancelled) return;
        if (job.status === "failed") {
          setFailed(true);
          return;
        }
        if (["cleaning", "extracting"].includes(job.status) || job.stage.startsWith("window_"))
          setStep(1);
        if (["resolving", "completed"].includes(job.status)) setStep(2);
        if (job.status === "completed") {
          const result = await fetch(
            `/api/mura/v1/recordings/${encodeURIComponent(recordingId)}`,
            { cache: "no-store" },
          );
          if (result.ok) {
            sessionStorage.setItem("mura-latest-result", await result.text());
            router.replace(`/tree?new=${story.id}`);
          }
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    void poll();
    const timer = window.setInterval(poll, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [jobId, recordingId, router, story.id]);

  return (
    <div className="relative flex h-dvh flex-col items-center justify-center px-8">
      <AnimatePresence mode="wait">
        <motion.h1
          key={step}
          className="text-center text-[26px] font-semibold leading-snug tracking-[-0.02em]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          {steps[step]}
        </motion.h1>
      </AnimatePresence>

      {/* The memory being placed: story node above, family nodes joining it. */}
      <div className="relative mt-14 h-[200px] w-[280px]">
        <motion.div
          className="absolute left-1/2 top-0 -translate-x-1/2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: EASE }}
        >
          <span className="flex max-w-[240px] items-center gap-2.5 rounded-full bg-raised py-2 pl-3 pr-4 shadow-soft">
            <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-clay" />
            <span className="truncate text-[13px] font-semibold">
              {story.title}
            </span>
          </span>
        </motion.div>

        <svg
          aria-hidden
          viewBox="0 0 280 200"
          className="absolute inset-0 size-full"
        >
          {step >= 1 &&
            [
              "M 140 52 C 140 105, 70 100, 70 140",
              "M 140 52 C 140 105, 210 100, 210 140",
            ].map((d, i) => (
              <motion.path
                key={d}
                d={d}
                fill="none"
                stroke="#8a857d"
                strokeOpacity={0.5}
                strokeWidth={1.5}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: i * 0.15, duration: 0.6, ease: "easeInOut" }}
              />
            ))}
        </svg>

        {step >= 1 && (
          <>
            <div className="absolute left-[70px] top-[150px] -translate-x-1/2">
              <PersonChip person={mentioned[0]} delay={0.35} />
            </div>
            {mentioned[1] && (
              <div className="absolute left-[210px] top-[150px] -translate-x-1/2">
                <PersonChip person={mentioned[1]} delay={0.5} />
              </div>
            )}
          </>
        )}
      </div>

      <div className="h-12">
        {step >= 2 && !failed && (
          <motion.span
            className="inline-block rounded-full bg-sand px-4 py-1.5 text-[13px] font-medium text-ink/70"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            {story.era}
          </motion.span>
        )}
      </div>

      <p className="absolute bottom-[max(env(safe-area-inset-bottom),32px)] text-[14px] text-muted">
        {failed ? t("processingFailed") : t("processingSafe")}
      </p>
    </div>
  );
}

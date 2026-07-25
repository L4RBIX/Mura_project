"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { analyzeSavedMemory } from "@/lib/mura-client";
import { getSavedMemory, type SavedMemory } from "@/lib/memory-store";
import { useMuraI18n } from "@/lib/i18n";

const EASE = [0.23, 1, 0.32, 1] as const;

function NameChip({ name, delay }: { name: string; delay: number }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <motion.span
      className="flex items-center gap-2 rounded-full bg-raised py-1.5 pl-1.5 pr-4 shadow-soft"
      initial={{ opacity: 0, scale: 0.8, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 300, damping: 22 }}
    >
      <span className="flex size-7 items-center justify-center rounded-full bg-clay text-[10px] font-bold">
        {initials}
      </span>
      <span className="text-[14px] font-semibold">{name}</span>
    </motion.span>
  );
}

export function ProcessingView() {
  const { locale, t } = useMuraI18n();
  const steps = [
    t("processingPrepare"),
    t("processingAnalyze"),
    t("processingOrganize"),
  ];
  const router = useRouter();
  const searchParams = useSearchParams();
  const memoryId = searchParams.get("memory");
  const [memory, setMemory] = useState<SavedMemory | null>(null);
  const [step, setStep] = useState(0);
  const [failed, setFailed] = useState(false);
  const startedRef = useRef(false);
  const redirectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!memoryId || startedRef.current) return;
    startedRef.current = true;
    const current = getSavedMemory(memoryId);
    setMemory(current);
    if (!current) {
      setFailed(true);
      return;
    }
    if (current.status !== "extracting") {
      router.replace(`/story/${encodeURIComponent(memoryId)}`);
      return;
    }

    let active = true;
    const stepTimers = [
      window.setTimeout(() => active && setStep(1), 900),
      window.setTimeout(() => active && setStep(2), 2600),
    ];
    void analyzeSavedMemory(memoryId)
      .then((completed) => {
        if (!active) return;
        setMemory(completed);
        setStep(2);
        redirectTimerRef.current = window.setTimeout(
          () => router.replace(`/story/${encodeURIComponent(memoryId)}`),
          450,
        );
      })
      .catch(() => {
        if (!active) return;
        setFailed(true);
        redirectTimerRef.current = window.setTimeout(
          () => router.replace(`/story/${encodeURIComponent(memoryId)}`),
          650,
        );
      });

    return () => {
      active = false;
      startedRef.current = false;
      stepTimers.forEach(window.clearTimeout);
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, [memoryId, router]);

  const dateLabel = useMemo(() => {
    if (!memory) return "";
    return new Intl.DateTimeFormat(locale === "kk" ? "kk-KZ" : "ru-RU", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(memory.createdAt));
  }, [locale, memory]);

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

      <div className="relative mt-14 flex min-h-[200px] w-[280px] flex-col items-center">
        <motion.span
          className="flex max-w-[260px] items-center gap-2.5 rounded-full bg-raised py-2 pl-3 pr-4 shadow-soft"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-clay" />
          <span className="truncate text-[13px] font-semibold">
            {memory?.title ?? t("newMemory")}
          </span>
        </motion.span>

        {step >= 1 && memory && memory.people.length > 0 && (
          <div className="mt-14 flex flex-wrap justify-center gap-2">
            {memory.people.slice(0, 3).map((person, index) => (
              <NameChip key={`${person.name}-${index}`} name={person.name} delay={0.2 + index * 0.12} />
            ))}
          </div>
        )}
      </div>

      <div className="h-12">
        {step >= 2 && !failed && dateLabel && (
          <motion.span
            className="inline-block rounded-full bg-sand px-4 py-1.5 text-[13px] font-medium text-ink/70"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {dateLabel}
          </motion.span>
        )}
      </div>

      <p className="absolute bottom-[max(env(safe-area-inset-bottom),32px)] text-[14px] text-muted">
        {failed ? t("processingFailed") : t("processingSafe")}
      </p>
    </div>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Highlight } from "@/components/ui/highlight";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { useMuraI18n } from "@/lib/i18n";
import { getSavedMemories } from "@/lib/memory-store";
import type { Person } from "@/lib/types";

interface PersonSheetProps {
  personId: string | null;
  centerId: string;
  onClose: () => void;
  onCenter: (id: string) => void;
}

function SummaryText({ person }: { person: Person }) {
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

export function PersonSheet({ personId, centerId, onClose, onCenter }: PersonSheetProps) {
  const { getPerson, relationLabel, formatYears, t } = useMuraI18n();
  const person = personId ? getPerson(personId) : undefined;
  const center = getPerson(centerId);
  const isCenter = personId === centerId;
  const [memoryCount, setMemoryCount] = useState(0);
  useEffect(() => {
    if (!person) {
      setMemoryCount(0);
      return;
    }
    const names = new Set([person.name, person.nativeName].map((name) => name.toLocaleLowerCase()));
    setMemoryCount(
      getSavedMemories().filter(
        (memory) =>
          person.isNarrator ||
          memory.people.some((mentioned) => names.has(mentioned.name.toLocaleLowerCase())),
      ).length,
    );
  }, [person]);

  return (
    <AnimatePresence>
      {person && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-ink/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={person.name}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[430px] rounded-t-[32px] bg-raised px-6 pb-[max(env(safe-area-inset-bottom),24px)] pt-3 shadow-card"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 600) onClose();
            }}
          >
            <div aria-hidden className="mx-auto h-1.5 w-10 rounded-full bg-ink/15" />

            <div className="mt-5 flex items-start gap-4">
              <InitialsAvatar person={person} size={64} />
              <div className="min-w-0 flex-1 pt-1">
                <h2 className="truncate text-[24px] font-bold leading-tight tracking-[-0.02em]">
                  {person.name}
                </h2>
                <p className="mt-0.5 text-[14px] text-muted">
                  {formatYears(person.born, person.died)}
                </p>
              </div>
            </div>

            {!isCenter && center && (
              <span className="mt-4 inline-block rounded-full bg-sand px-3 py-1 text-[12.5px] font-semibold text-ink/75">
                {t("relationOf", { relation: relationLabel(centerId, person.id), name: center.name })}
              </span>
            )}

            <p className="mt-4 text-[16px] leading-[1.6] text-ink/85">
              <SummaryText person={person} />
            </p>

            <p className="mt-4 text-[13px] font-medium text-muted">
              {memoryCount === 0
                ? t("noMemoriesYet")
                : memoryCount === 1
                  ? t("oneMemoryRecorded")
                  : t("memoriesRecorded", { count: memoryCount })}
            </p>

            <div className="mt-6 flex gap-3">
              <Button asChild variant="soft" size="lg" className="flex-1" onClick={onClose}>
                <Link href={`/person/${person.id}`}>{t("openProfile")}</Link>
              </Button>
              {!isCenter && (
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={() => {
                    onCenter(person.id);
                    onClose();
                  }}
                >
                  {t("centerHere")}
                </Button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

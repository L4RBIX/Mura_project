"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ScreenHeader } from "@/components/layout/screen-header";
import { TreeCanvas } from "@/components/tree/tree-canvas";
import { useMuraI18n } from "@/lib/i18n";

export function TreeView() {
  const { getPerson, getStory, narrator, t } = useMuraI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const center = getPerson(searchParams.get("center") ?? "") ?? narrator;

  const newParam = searchParams.get("new");
  const newStory = newParam ? getStory(newParam) : undefined;

  return (
    <div className="flex h-dvh flex-col">
      <ScreenHeader fallbackHref="/home" title={t("familyTree")} />

      <div className="shrink-0 px-6 pb-3 pt-1">
        <h1 className="text-[28px] font-bold leading-[1.05] tracking-[-0.03em]">
          {center.id === narrator.id ? t("yourFamily") : t("familyOf", { name: center.name })}
        </h1>

        {newStory && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          >
            <Link
              href={`/story/${newStory.id}`}
              className="mt-4 flex items-center gap-3 rounded-[20px] bg-clay p-4 shadow-soft transition-transform duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink/40"
            >
              <span className="size-2 shrink-0 animate-pulse rounded-full bg-ink" />
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold">{t("newMemoryPlaced")}</span>
                <span className="block truncate text-[13px] text-ink/60">
                  {newStory.title}
                </span>
              </span>
              <ChevronRight className="ml-auto size-4 shrink-0 text-ink/50" />
            </Link>
          </motion.div>
        )}
      </div>

      <div className="min-h-0 flex-1">
        <TreeCanvas
          key={center.id}
          centerId={center.id}
          onCenterChange={(id) => router.push(`/tree?center=${id}`)}
        />
      </div>

      <p className="shrink-0 pb-[max(env(safe-area-inset-bottom),16px)] pt-2 text-center text-[12.5px] text-muted">
        {t("treeHint")}
      </p>
    </div>
  );
}
